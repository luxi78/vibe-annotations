import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

// Apply a read-modify-write inside the same queue as ordinary annotation saves.
// Loading before acquiring the queue would let a purge overwrite newer records.
export function serializeAnnotationMutation(owner, load, save, transform) {
  const run = async () => {
    const current = await load();
    if (!Array.isArray(current)) throw new Error('Invalid annotation store');
    const result = await transform(current);
    if (!Array.isArray(result.annotations)) throw new Error('Invalid annotation mutation');
    await save(result.annotations);
    if (result.afterSave) await result.afterSave();
    return result;
  };
  const operation = owner.saveLock.then(run, run);
  owner.saveLock = operation.then(() => {}, () => {});
  return operation;
}

// This endpoint is intentionally distinct from ordinary protected DELETE:
// explicit confirmation authorizes removing Variants metadata, not source code.
export function installAnnotationPurge(app, { mutateAnnotations, removeAttachmentFiles }) {
  app.post('/api/annotations/purge', async (req, res) => {
    const { ids, confirm } = req.body || {};
    if (confirm !== true || !Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id)) {
      return res.status(400).json({ error: 'Confirmed annotation ids are required' });
    }
    const selected = new Set(ids);
    if (!selected.size) return res.json({ success: true, count: 0, purged_ids: [] });
    try {
      const result = await mutateAnnotations(annotations => {
        const removed = annotations.filter(annotation => selected.has(annotation.id));
        const remaining = annotations.filter(annotation => !selected.has(annotation.id));
        const removedById = new Map(removed.map(annotation => [annotation.id, annotation]));
        const preserveIds = remaining.map(annotation => annotation.id);
        return {
          annotations: remaining,
          count: removed.length,
          // Commit metadata first, then clean only selected attachment files,
          // keeping the writer queue held until cleanup finishes.
          afterSave: async () => {
            for (const id of selected) {
              // Include absent IDs so a previous failed cleanup can retry.
              await removeAttachmentFiles(removedById.get(id) || { id }, {
                preserveIds, strict: true,
              });
            }
          },
        };
      });
      return res.json({ success: true, count: result.count, purged_ids: [...selected] });
    } catch {
      return res.status(500).json({ error: 'Failed to purge confirmed annotations' });
    }
  });
}

// Work only within the annotation-owned attachment directory. Protect surviving
// identities even when their opaque IDs share another annotation's prefix.
export async function removeAnnotationAttachmentFiles(directory, annotation, { preserveIds = [], strict = false } = {}) {
  const id = annotation?.id;
  if (!id) return;
  // Protect Windows filename aliases without broadening the selected prefix
  // used by ordinary deletion. Annotation identities themselves stay exact.
  const normalizeName = process.platform === 'win32' ? value => value.toLowerCase() : value => value;
  const prefix = `${id}__`;
  const protectedPrefixes = preserveIds.map(value => normalizeName(`${value}__`));
  try {
    const files = await readdir(directory);
    await Promise.all(files
      .filter(file => {
        const name = normalizeName(file);
        return file.startsWith(prefix) && !protectedPrefixes.some(protectedPrefix => name.startsWith(protectedPrefix));
      })
      .map(file => unlink(path.join(directory, file)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      })));
  } catch (error) {
    if (error.code === 'ENOENT') return;
    if (strict) throw error;
    console.error('Failed to remove attachment files:', error.message);
  }
}
