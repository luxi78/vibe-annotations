// Pinvelto's own portable envelope. Image bytes remain on the originating service.
export function feedbackExport(feedback, source = {}) {
  return {
    product: 'pinvelto',
    pinvelto_feedback_export: true,
    version: '1.0',
    exported_at: new Date().toISOString(),
    source,
    scope: 'project',
    attachments: 'references-only',
    feedback: feedback.map(({ screenshot, _synced, ...record }) => record)
  };
}
