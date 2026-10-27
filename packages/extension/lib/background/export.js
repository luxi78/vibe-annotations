// Feedback export formatters
import { fetchFeedback } from './api-sync.js';

function toCSV(pinveltoFeedback) {
  const headers = ['ID', 'URL', 'Comment', 'Status', 'Element', 'Created', 'Updated'];
  const rows = pinveltoFeedback.map(a => [
    a.id, a.url, `"${a.comment.replace(/"/g, '""')}"`, a.status, a.selector, a.created_at, a.updated_at
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function toMCP(pinveltoFeedback) {
  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    total_annotations: pinveltoFeedback.length,
    pinveltoFeedback: pinveltoFeedback.map(a => ({ ...a, mcp_ready: true }))
  };
}

export async function formatExport(fmt) {
  const pinveltoFeedback = await fetchFeedback();
  switch (fmt) {
    case 'json': return JSON.stringify(pinveltoFeedback, null, 2);
    case 'csv': return toCSV(pinveltoFeedback);
    case 'mcp': return toMCP(pinveltoFeedback);
    default: throw new Error('Unsupported export format');
  }
}
