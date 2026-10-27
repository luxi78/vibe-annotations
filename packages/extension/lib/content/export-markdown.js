// Shared offline Markdown for Copy all and .md downloads. Images travel as
// references; the real MCP service verifies availability and resolves local paths.

function camelToKebab(s) {
  return String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}
export function renderFeedbackMarkdown(pinveltoFeedback, host) {
  const count = pinveltoFeedback.length;
  let md = `# Pinvelto — ${host} · ${count} Feedback\n\n`;
  md += `This is Pinvelto webpage Feedback. Use pinvelto_list_feedback to read current records and verified local attachment paths; use pinvelto_get_screenshot for available captures. For Variants, follow variant_instructions returned by pinvelto_list_feedback; preserve the preview-and-pick lifecycle instead of implementing a single option. Image references below are not embedded and may be unavailable on another machine. Follow my instructions on these elements. When applying design changes, map values to the project design system (Tailwind classes, CSS variables, or design tokens).\n\n---\n\n`;

  const sorted = [...pinveltoFeedback].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  sorted.forEach((a, i) => {
    if (a.type === 'stylesheet') {
      md += `## ${i + 1}. Stylesheet change\n\n`;
      if (a.comment) md += `- **Comment:** ${a.comment}\n`;
      if (a.css) md += `- **CSS:**\n\`\`\`css\n${a.css}\n\`\`\`\n`;
      md += `\n`;
      return;
    }

    const ec = a.element_context || {};
    const componentHint = (a.context_hints || []).find(h => typeof h === 'string' && h.startsWith('Component:'));

    md += `## ${i + 1}. ${a.comment || '_(no comment)_'}\n\n`;
    if (componentHint) md += `- **Component:** \`${componentHint.replace('Component:', '').trim()}\`\n`;
    if (a.source_file_path) md += `- **Source:** \`${a.source_file_path}${a.source_line_range ? ` (lines ${a.source_line_range})` : ''}\`\n`;
    if (a.url_path) md += `- **Page:** ${a.url_path}\n`;
    // A data-pinvelto-id is injected live by the extension (not in the source) — swap it
    // for the readable DOM path so an agent/reader can actually locate the element.
    const selector = (a.selector && a.selector.includes('data-pinvelto-id')) ? (ec.path || null) : a.selector;
    if (selector) md += `- **Selector:** \`${selector}\`\n`;
    if (ec.tag || ec.text) md += `- **Element:** \`${ec.tag || ''}\` "${truncate(ec.text, 60)}"\n`;

    const changes = [];
    for (const [prop, v] of Object.entries(a.pending_changes || {})) {
      if (!v || v.value == null) continue;
      const label = prop === 'copyChange' ? 'text' : camelToKebab(prop);
      const to = v.variable ? `var(${v.variable})` : v.value;
      changes.push(`\`${label}\`: ${v.original ?? '—'} → **${to}**`);
    }
    if (changes.length) {
      md += `- **Design changes:**\n`;
      for (const c of changes) md += `    - ${c}\n`;
    }

    if (a.css) md += `- **CSS:**\n\`\`\`css\n${a.css}\n\`\`\`\n`;

    for (const att of (a.attachments || [])) {
      const label = att.kind === 'capture' ? 'Screenshot' : 'Reference';
      md += `- **${label}:** attachment reference \`${att.id}\` (${att.mime || 'image'}); not embedded — verify availability with \`pinvelto_list_feedback\`.\n`;
    }

    md += `\n`;
  });

  return md;
}

export default { renderFeedbackMarkdown };
