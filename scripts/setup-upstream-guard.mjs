#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
try {
  git('remote', 'get-url', 'upstream');
  let hooksPath = '';
  try { hooksPath = git('config', '--get', 'core.hooksPath'); } catch {}
  if (hooksPath && hooksPath !== '.githooks') {
    throw new Error(`Existing core.hooksPath (${hooksPath}) must be integrated manually; no settings changed.`);
  }
  if (!hooksPath && existsSync(git('rev-parse', '--git-path', 'hooks/pre-push'))) {
    throw new Error('An existing pre-push hook must be integrated manually; no settings changed.');
  }
  const common = resolve(git('rev-parse', '--git-common-dir'));
  git('config', '--local', '--replace-all', 'remote.upstream.pushurl', resolve(common, 'PINVELTO_UPSTREAM_PUSH_DISABLED'));
  git('config', '--local', 'core.hooksPath', '.githooks');
  console.log('Pinvelto upstream pushes disabled and pre-push guard installed; upstream fetch remains available.');
} catch (error) {
  console.error(`Cannot install upstream safeguard: ${error.message}`);
  process.exitCode = 1;
}
