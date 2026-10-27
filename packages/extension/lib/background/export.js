// Feedback export formatters
import { feedbackExport } from '../feedback-export.js';
import { fetchFeedback } from './api-sync.js';

function toCSV(pinveltoFeedback) {
  const headers = ['Product', 'ID', 'URL', 'Comment', 'Status', 'Element', 'Created', 'Updated'];
  const rows = pinveltoFeedback.map(a => [
    'pinvelto', a.id, a.url, `"${a.comment.replace(/"/g, '""')}"`, a.status, a.selector, a.created_at, a.updated_at
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function toMCP(pinveltoFeedback) {
  return feedbackExport(pinveltoFeedback.map(a => ({ ...a, mcp_ready: true })));
}

export async function formatExport(fmt) {
  const pinveltoFeedback = await fetchFeedback();
  switch (fmt) {
    case 'json': return JSON.stringify(feedbackExport(pinveltoFeedback), null, 2);
    case 'csv': return toCSV(pinveltoFeedback);
    case 'mcp': return toMCP(pinveltoFeedback);
    default: throw new Error('Unsupported export format');
  }
}
