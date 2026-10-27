// Documentation panels and workflow guides for the toolbar settings dropdown.
// Extracted from floating-toolbar.js to keep each module focused.


  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function wireCopyButtons(container, ICONS) {
    container.querySelectorAll('.pinvelto-guide-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cmd = btn.closest('.pinvelto-guide-cmd').dataset.cmd;
        await navigator.clipboard.writeText(cmd);
        btn.innerHTML = ICONS.check;
        setTimeout(() => { btn.innerHTML = ICONS.clipboard; }, 1500);
      });
    });
  }

  function wireTabSwitching(container) {
    container.querySelectorAll('.pinvelto-guide-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.pinvelto-guide-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.pinvelto-guide-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        container.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
      });
    });
  }

  function showDocumentation(dropdown, ICONS, callbacks) {
    if (!dropdown) return;
    const header = dropdown.querySelector('.pinvelto-settings-header');
    const body = dropdown.querySelector('.pinvelto-settings-body');
    if (!header || !body) return;

    const version = chrome.runtime.getManifest().version;

    header.innerHTML = `
      <button class="pinvelto-guide-back-btn" type="button" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--v-text-secondary);font-family:var(--v-font);font-size:13px;padding:0;">
        ${ICONS.back}
        <span style="color:var(--v-text-primary);font-weight:600;">Documentation</span>
      </button>
    `;

    body.innerHTML = `
      <button class="pinvelto-settings-link pinvelto-get-started-guide-btn" type="button">
        ${ICONS.rocket}
        <span>Get started</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-mcp-server-btn" type="button">
        ${ICONS.server}
        <span>MCP Server</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <div class="pinvelto-settings-separator"></div>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="single-page" type="button">
        ${ICONS.webpage}
        <span>Editing a single page</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="multi-page" type="button">
        ${ICONS.globe}
        <span>Editing multiple pages</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="design-edits" type="button">
        ${ICONS.palette}
        <span>Direct design edits</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="variants" type="button">
        ${ICONS.layers}
        <span>Component variants</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="screenshots" type="button">
        ${ICONS.camera}
        <span>Screenshots &amp; images</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="sharing" type="button">
        ${ICONS.download}
        <span>Sharing a review</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="collaborate" type="button">
        ${ICONS.users}
        <span>Collaborating</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="agents" type="button">
        ${ICONS.robot}
        <span>Annotating with agents</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <button class="pinvelto-settings-link pinvelto-workflow-btn" data-workflow="watch-mode" type="button">
        ${ICONS.eye}
        <span>Watch mode</span>
        <span style="margin-left:auto;color:var(--v-text-secondary);">${ICONS.chevronRight}</span>
      </button>
      <div class="pinvelto-settings-separator"></div>
      <a href="https://github.com/luxi78/vibe-annotations" target="_blank" rel="noopener" class="pinvelto-settings-link">
        ${ICONS.github}
        <span>Contribute to Pinvelto</span>
      </a>
      <a href="https://github.com/luxi78/vibe-annotations/releases/tag/v${escapeHTML(version)}" target="_blank" rel="noopener" class="pinvelto-settings-link">
        ${ICONS.newspaper}
        <span>Release notes</span>
      </a>
    `;

    header.querySelector('.pinvelto-guide-back-btn').addEventListener('click', () => {
      if (callbacks?.onBack) callbacks.onBack();
    });

    body.querySelector('.pinvelto-get-started-guide-btn').addEventListener('click', (e) => {
      if (callbacks?.onNavigate) callbacks.onNavigate('get-started', null, e.currentTarget);
      else showGetStartedGuide(dropdown, ICONS, callbacks);
    });
    body.querySelector('.pinvelto-mcp-server-btn').addEventListener('click', (e) => {
      if (callbacks?.onNavigate) callbacks.onNavigate('workflow', 'mcp-setup', e.currentTarget);
      else showWorkflow(dropdown, 'mcp-setup', ICONS, callbacks);
    });

    body.querySelectorAll('.pinvelto-workflow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (callbacks?.onNavigate) callbacks.onNavigate('workflow', btn.dataset.workflow, e.currentTarget);
        else showWorkflow(dropdown, btn.dataset.workflow, ICONS, callbacks);
      });
    });
  }

  function showGetStartedGuide(dropdown, ICONS, callbacks) {
    if (!dropdown) return;
    const header = dropdown.querySelector('.pinvelto-settings-header');
    const body = dropdown.querySelector('.pinvelto-settings-body');
    if (!header || !body) return;

    header.innerHTML = `
      <button class="pinvelto-guide-back-btn" type="button" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--v-text-secondary);font-family:var(--v-font);font-size:13px;padding:0;">
        ${ICONS.back}
        <span style="color:var(--v-text-primary);font-weight:600;">Get started</span>
      </button>
    `;

    body.innerHTML = `
      <div class="pinvelto-guide">
        <div class="pinvelto-guide-section">
          <div class="pinvelto-guide-label">1. Start annotating</div>
          <p class="pinvelto-guide-text">Click the <strong>pencil button</strong> or your configured hotkey to enter inspection mode. Click any element to add a comment or modify its design.</p>
        </div>

        <div class="pinvelto-guide-section">
          <div class="pinvelto-guide-label">2. Send to your agent</div>
          <p class="pinvelto-guide-text">Hit <strong>Copy</strong> in the toolbar and paste into any AI chat, or <strong>Export</strong> to share a file. No server needed.</p>
        </div>

        <div class="pinvelto-guide-section">
          <div class="pinvelto-guide-label">3. Install MCP server <span style="font-weight:400;color:var(--v-text-secondary);">(optional)</span></div>
          <p class="pinvelto-guide-text">Let your coding agent fetch and resolve Feedback automatically. One command does it all:</p>
          <div class="pinvelto-guide-cmd" data-cmd="node packages/server/bin/cli.js init">
            <code>node packages/server/bin/cli.js init</code>
            <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
          </div>
          <p class="pinvelto-guide-text" style="margin-top:6px;">Installs the server, starts it, and configures your AI agent interactively.</p>
          <p class="pinvelto-guide-text" style="margin-top:12px;">Or set it up manually:</p>
          <div class="pinvelto-guide-cmd" data-cmd="npm install --global ./packages/server">
            <code>npm install --global ./packages/server</code>
            <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
          </div>
          <div class="pinvelto-guide-cmd" data-cmd="pinvelto start">
            <code>pinvelto start</code>
            <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
          </div>
          <p class="pinvelto-guide-text" style="margin-top:8px;">Then connect your agent:</p>
          <div class="pinvelto-guide-tabs">
            <button class="pinvelto-guide-tab active" data-tab="claude">Claude Code</button>
            <button class="pinvelto-guide-tab" data-tab="cursor">Cursor</button>
            <button class="pinvelto-guide-tab" data-tab="windsurf">Windsurf</button>
            <button class="pinvelto-guide-tab" data-tab="codex">Codex</button>
            <button class="pinvelto-guide-tab" data-tab="openclaw">OpenClaw</button>
          </div>
          <div class="pinvelto-guide-panel active" data-panel="claude">
            <div class="pinvelto-guide-cmd" data-cmd="claude mcp add --scope user --transport http pinvelto http://127.0.0.1:3847/mcp">
              <code>claude mcp add --scope user --transport http pinvelto http://127.0.0.1:3847/mcp</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
          <div class="pinvelto-guide-panel" data-panel="cursor">
            <p class="pinvelto-guide-text">Add to <strong>.cursor/mcp.json</strong>:</p>
            <div class="pinvelto-guide-cmd" data-cmd='{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}'>
              <code>{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
          <div class="pinvelto-guide-panel" data-panel="windsurf">
            <p class="pinvelto-guide-text">Add to Windsurf MCP settings:</p>
            <div class="pinvelto-guide-cmd" data-cmd='{"mcpServers":{"pinvelto":{"serverUrl":"http://127.0.0.1:3847/mcp"}}}'>
              <code>{"mcpServers":{"pinvelto":{"serverUrl":"http://127.0.0.1:3847/mcp"}}}</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
          <div class="pinvelto-guide-panel" data-panel="codex">
            <p class="pinvelto-guide-text">Add to <strong>~/.codex/config.toml</strong>:</p>
            <div class="pinvelto-guide-cmd" data-cmd="[mcp_servers.pinvelto]&#10;url = &quot;http://127.0.0.1:3847/mcp&quot;">
              <code>[mcp_servers.pinvelto] url = "..."</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
          <div class="pinvelto-guide-panel" data-panel="openclaw">
            <p class="pinvelto-guide-text">Add to <strong>~/.openclaw/openclaw.json</strong>:</p>
            <div class="pinvelto-guide-cmd" data-cmd='{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}'>
              <code>{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    header.querySelector('.pinvelto-guide-back-btn').addEventListener('click', () => {
      if (callbacks?.onBack) callbacks.onBack();
      else showDocumentation(dropdown, ICONS, callbacks);
    });
    wireTabSwitching(body);
    wireCopyButtons(body, ICONS);
  }

  function showWorkflow(dropdown, type, ICONS, callbacks) {
    if (!dropdown) return;
    const header = dropdown.querySelector('.pinvelto-settings-header');
    const body = dropdown.querySelector('.pinvelto-settings-body');
    if (!header || !body) return;

    const workflows = {
      'mcp-setup': {
        title: 'MCP Server',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">1. Install and start the server</div>
            <p class="pinvelto-guide-text">One command installs, starts, and configures your agent:</p>
            <div class="pinvelto-guide-cmd" data-cmd="node packages/server/bin/cli.js init">
              <code>node packages/server/bin/cli.js init</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
            <p class="pinvelto-guide-text" style="margin-top:10px;">Or manually:</p>
            <div class="pinvelto-guide-cmd" data-cmd="npm install --global ./packages/server">
              <code>npm install --global ./packages/server</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
            <div class="pinvelto-guide-cmd" data-cmd="pinvelto start">
              <code>pinvelto start</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">2. Connect your agent <span style="font-weight:400;color:var(--v-text-secondary);">(skip if you used init)</span></div>
            <div class="pinvelto-guide-tabs">
              <button class="pinvelto-guide-tab active" data-tab="claude">Claude Code</button>
              <button class="pinvelto-guide-tab" data-tab="cursor">Cursor</button>
              <button class="pinvelto-guide-tab" data-tab="windsurf">Windsurf</button>
              <button class="pinvelto-guide-tab" data-tab="codex">Codex</button>
              <button class="pinvelto-guide-tab" data-tab="openclaw">OpenClaw</button>
            </div>
            <div class="pinvelto-guide-panel active" data-panel="claude">
              <div class="pinvelto-guide-cmd" data-cmd="claude mcp add --scope user --transport http pinvelto http://127.0.0.1:3847/mcp">
                <code>claude mcp add --scope user --transport http pinvelto http://127.0.0.1:3847/mcp</code>
                <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
              </div>
            </div>
            <div class="pinvelto-guide-panel" data-panel="cursor">
              <p class="pinvelto-guide-text">Add to <strong>.cursor/mcp.json</strong>:</p>
              <div class="pinvelto-guide-cmd" data-cmd='{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}'>
                <code>{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}</code>
                <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
              </div>
            </div>
            <div class="pinvelto-guide-panel" data-panel="windsurf">
              <p class="pinvelto-guide-text">Add to Windsurf MCP settings:</p>
              <div class="pinvelto-guide-cmd" data-cmd='{"mcpServers":{"pinvelto":{"serverUrl":"http://127.0.0.1:3847/mcp"}}}'>
                <code>{"mcpServers":{"pinvelto":{"serverUrl":"http://127.0.0.1:3847/mcp"}}}</code>
                <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
              </div>
            </div>
            <div class="pinvelto-guide-panel" data-panel="codex">
              <p class="pinvelto-guide-text">Add to <strong>~/.codex/config.toml</strong>:</p>
              <div class="pinvelto-guide-cmd" data-cmd="[mcp_servers.pinvelto]&#10;url = &quot;http://127.0.0.1:3847/mcp&quot;">
                <code>[mcp_servers.pinvelto] url = "..."</code>
                <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
              </div>
            </div>
            <div class="pinvelto-guide-panel" data-panel="openclaw">
              <p class="pinvelto-guide-text">Add to <strong>~/.openclaw/openclaw.json</strong>:</p>
              <div class="pinvelto-guide-cmd" data-cmd='{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}'>
                <code>{"mcpServers":{"pinvelto":{"url":"http://127.0.0.1:3847/mcp"}}}</code>
                <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
              </div>
            </div>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">3. Watch mode <span style="font-weight:400;color:var(--v-text-secondary);">(hands-free)</span></div>
            <p class="pinvelto-guide-text">Your agent can automatically pick up Feedback as you drop them. Just tell it:</p>
            <div class="pinvelto-guide-cmd" data-cmd="Start watching Pinvelto">
              <code>Start watching Pinvelto</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
            <p class="pinvelto-guide-text" style="margin-top:8px;">The agent calls <code>pinvelto_watch_feedback</code> in a loop, implements each change, and deletes the Feedback when done. An eye icon appears in the toolbar and on badges while watching. Click the eye to stop.</p>
          </div>
        `
      },
      'single-page': {
        title: 'Editing a single page',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Best for quick edits</div>
            <p class="pinvelto-guide-text">For a few Feedback on one page, <strong>copy & paste</strong> is the fastest option. No server, no setup.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Workflow</div>
            <p class="pinvelto-guide-text">1. Annotate elements on the page (comments, CSS tweaks, text changes)</p>
            <p class="pinvelto-guide-text">2. Click <strong>Copy</strong> in the toolbar</p>
            <p class="pinvelto-guide-text">3. Paste into any AI chat (Claude, ChatGPT, Cursor...) and ask the agent to implement the changes</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Tips</div>
            <p class="pinvelto-guide-text">Enable <strong>Clear on copy</strong> in settings to auto-delete Feedback after copying. Keeps things clean between iterations.</p>
            <p class="pinvelto-guide-text">Each Feedback includes the selector, your comment, element context, and any pending changes. The agent gets everything it needs to locate and edit the right code.</p>
          </div>
        `
      },
      'multi-page': {
        title: 'Editing multiple pages',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Best for cross-page changes</div>
            <p class="pinvelto-guide-text">When you're annotating across multiple routes, the <strong>MCP server</strong> is preferable. Your coding agent can read and resolve Feedback from all pages at once, without manual copy-paste per route.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Setup</div>
            <p class="pinvelto-guide-text">One command installs, starts, and configures your agent:</p>
            <div class="pinvelto-guide-cmd" data-cmd="node packages/server/bin/cli.js init">
              <code>node packages/server/bin/cli.js init</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
            <p class="pinvelto-guide-text" style="margin-top:10px;">Or manually:</p>
            <div class="pinvelto-guide-cmd" data-cmd="npm install --global ./packages/server">
              <code>npm install --global ./packages/server</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
            <div class="pinvelto-guide-cmd" data-cmd="pinvelto start">
              <code>pinvelto start</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
            <p class="pinvelto-guide-text" style="margin-top:8px;">Then connect your agent (e.g. Claude Code):</p>
            <div class="pinvelto-guide-cmd" data-cmd="claude mcp add --scope user --transport http pinvelto http://127.0.0.1:3847/mcp">
              <code>claude mcp add --scope user --transport http pinvelto http://127.0.0.1:3847/mcp</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Workflow</div>
            <p class="pinvelto-guide-text">1. Navigate your app and annotate elements across as many routes as needed</p>
            <p class="pinvelto-guide-text">2. Tell your agent: <em>"read pinvelto Feedback and implement the changes"</em></p>
            <p class="pinvelto-guide-text">3. The agent pulls all pending Feedback via MCP, edits your source files, and deletes each one when done</p>
          </div>
        `
      },
      'design-edits': {
        title: 'Direct design edits',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Figma-like edits, live on the page</div>
            <p class="pinvelto-guide-text">Tweak size, spacing, color, and text in a panel and preview every change in place before handing it to your agent.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Workflow</div>
            <p class="pinvelto-guide-text">1. Click an element to open the popover, then switch to the <strong>Design</strong> tab</p>
            <p class="pinvelto-guide-text">2. Adjust layout (flex direction, justify, align, gap), size, spacing, colors, or replace the text</p>
            <p class="pinvelto-guide-text">3. The page updates <strong>live</strong> so you see the change in context before committing to it</p>
            <p class="pinvelto-guide-text">4. Save the Feedback, then <strong>Copy</strong> or sync it to your agent like any other</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">What the agent receives</div>
            <p class="pinvelto-guide-text">Edits are stored as <code>pending_changes</code> — the original and new value for each property, plus a text change when you edit copy. Your agent gets the exact deltas alongside the selector and element context.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Tips</div>
            <p class="pinvelto-guide-text">Edits are <strong>previews</strong>, not committed code — nothing changes in your codebase until your agent implements the Feedback.</p>
            <p class="pinvelto-guide-text">Ask your agent to map raw values to your design system (Tailwind classes, CSS variables, tokens) rather than literal pixel/hex values. The <code>pinvelto_list_feedback</code> tool hints at this automatically.</p>
          </div>
        `
      },
      variants: {
        title: 'Component variants',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Explore options in your real codebase</div>
            <p class="pinvelto-guide-text">Ask your agent for several variants of a component, preview them right on the page, and pick the winner. The agent builds them in your actual code — not a mockup — so the one you choose is already implemented.</p>
            <p class="pinvelto-guide-text" style="margin-top:8px;color:var(--v-text-secondary);"><strong>Requires the MCP server.</strong> The Variants tab is disabled until a coding agent is connected over MCP.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Workflow</div>
            <p class="pinvelto-guide-text">1. Click the component and switch to the <strong>Variants</strong> tab</p>
            <p class="pinvelto-guide-text">2. Describe what you want ("three headline layouts", "a denser and a roomier card")</p>
            <p class="pinvelto-guide-text">3. Hand the Feedback to your agent — it scaffolds each variant behind a toggle, then reports back</p>
            <p class="pinvelto-guide-text">4. Reopen the extension to <strong>preview</strong> each variant live and select your favorite</p>
            <p class="pinvelto-guide-text">5. The agent <strong>finalizes</strong> your choice — inlining the winner and stripping the scaffolding for a clean diff</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Lifecycle</div>
            <p class="pinvelto-guide-text"><strong>pending</strong> → you requested variants; the agent generates them</p>
            <p class="pinvelto-guide-text"><strong>variants-ready</strong> → scaffolding is in place; preview and choose</p>
            <p class="pinvelto-guide-text"><strong>variant-chosen</strong> → you picked one; the agent finalizes and cleans up</p>
            <p class="pinvelto-guide-text"><strong>variants-discarded</strong> → you dismissed them; the agent removes the leftover scaffolding</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Tips</div>
            <p class="pinvelto-guide-text">Keep the requested count small (2–4). Each variant is real code the agent has to build and later remove.</p>
          </div>
        `
      },
      screenshots: {
        title: 'Screenshots & images',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Every pin can carry images</div>
            <p class="pinvelto-guide-text">An automatic screenshot of the element you pinned, plus any reference images you attach. Your agent receives both as real image files.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Two kinds of image</div>
            <p class="pinvelto-guide-text"><strong>Auto-screenshot</strong> — a zoned capture of exactly the element you annotated, so the agent sees its <em>current</em> visual state.</p>
            <p class="pinvelto-guide-text"><strong>Reference image</strong> — anything you attach or paste, usually a <em>target</em> ("make it look like this"). The agent is told which is which.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Workflow</div>
            <p class="pinvelto-guide-text">1. Open the popover on the element you want to annotate</p>
            <p class="pinvelto-guide-text">2. Use the <strong>+</strong> menu to <em>Attach file</em> or <em>Take a screenshot</em>, or paste an image straight into the comment field</p>
            <p class="pinvelto-guide-text">3. Save — images travel with the Feedback to your agent (as local file paths over MCP) and into <code>.md</code> / <code>.html</code> exports</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Enabling auto-screenshots</div>
            <p class="pinvelto-guide-text">Auto-capture is <strong>off by default</strong>. Turn it on in the toolbar settings — the extension requests the screenshot permission the first time, since capturing the tab needs broader host access than annotating alone.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Tips</div>
            <p class="pinvelto-guide-text">Attachments are deleted automatically when their Feedback is deleted, so the on-disk store never bloats with orphans.</p>
          </div>
        `
      },
      sharing: {
        title: 'Sharing a review',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Package a batch into one file</div>
            <p class="pinvelto-guide-text">Hand off Feedback to a teammate or an agent. Open <strong>View all</strong> in the toolbar and use <strong>Share / Export</strong>.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Three formats</div>
            <p class="pinvelto-guide-text"><strong>.md</strong> — <em>personal use.</em> A plain-markdown rundown of every Feedback. Rendered client-side, works with <strong>no server running</strong>. Same format as the Copy button, saved to a file.</p>
            <p class="pinvelto-guide-text"><strong>.html</strong> — <em>share externally.</em> One self-contained page with every image embedded as base64 — opens in any browser. Building it reads the image files, so it <strong>requires the local server</strong>.</p>
            <p class="pinvelto-guide-text"><strong>.json</strong> — <em>re-import later.</em> The raw Feedback objects for this site. Feed it into another localhost via <strong>Import</strong> to recreate Feedback, badges and previews. Client-side, no server.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Which one?</div>
            <p class="pinvelto-guide-text">Handing off to your own agent or working offline → <strong>.md</strong></p>
            <p class="pinvelto-guide-text">Sending to someone without the extension (design review, sign-off) → <strong>.html</strong>, so images come along</p>
            <p class="pinvelto-guide-text">Moving live Feedback to another machine's localhost → <strong>.json</strong>, then Import them there</p>
          </div>
        `
      },
      collaborate: {
        title: 'Collaborating with Feedback',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Feedback as a feedback tool</div>
            <p class="pinvelto-guide-text">Anyone can annotate a website: add comments, tweak styles, edit text. Then <strong>export</strong> the Feedback as a .json file and share it with a teammate.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Workflow</div>
            <p class="pinvelto-guide-text">1. A reviewer annotates the live site (staging, production, or localhost)</p>
            <p class="pinvelto-guide-text">2. They click <strong>Export</strong> and share the .json file (Slack, email, etc.)</p>
            <p class="pinvelto-guide-text">3. A developer clicks <strong>Import</strong> on their localhost. Feedback, badges, and style previews appear instantly.</p>
            <p class="pinvelto-guide-text">4. The developer copies or uses MCP to send the Feedback to their coding agent</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Cross-origin remap</div>
            <p class="pinvelto-guide-text">Importing Feedback from a public URL into localhost? The extension offers to <strong>remap URLs</strong> automatically so Feedback anchor to your local dev server.</p>
          </div>
        `
      },
      'watch-mode': {
        title: 'Watch mode',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Hands-free Feedback processing</div>
            <p class="pinvelto-guide-text">Your coding agent automatically picks up and implements Feedback as you drop them. No copy-paste, no manual triggering. Requires the MCP server.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Start watching</div>
            <p class="pinvelto-guide-text">Tell your agent:</p>
            <div class="pinvelto-guide-cmd" data-cmd="Start watching Pinvelto">
              <code>Start watching Pinvelto</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
            <p class="pinvelto-guide-text" style="margin-top:8px;">The agent calls <code>pinvelto_watch_feedback</code> in a loop, implements each change, and deletes the Feedback when done.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Visual feedback</div>
            <p class="pinvelto-guide-text">While watching, an eye icon replaces the copy button in the toolbar, and badges show eyes instead of numbers. Click the eye to stop watching.</p>
            <p class="pinvelto-guide-text">Auto-stops after 5 minutes of inactivity.</p>
          </div>
        `
      },
      agents: {
        title: 'Annotating with agents',
        content: `
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Let agents annotate for you</div>
            <p class="pinvelto-guide-text">Agents can help you annotate collaboratively, or work fully autonomously to review any site.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Compatible agents</div>
            <p class="pinvelto-guide-text"><strong>Claude Chrome extension</strong> has direct page access and can call the API from its javascript tool.</p>
            <p class="pinvelto-guide-text"><strong>OpenClaw</strong> uses CDP evaluate to run JS on the page.</p>
            <p class="pinvelto-guide-text"><strong>Claude Code, Cursor, Windsurf</strong> can access the page via a DevTools MCP server or Playwright.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Prompt to get started</div>
            <p class="pinvelto-guide-text">Copy this and paste it into your agent's chat to orient it towards the bridge API:</p>
            <div class="pinvelto-guide-cmd" data-cmd="Read window.__pinvelto.help() and use this extension for my comments on this project.">
              <code>Read window.__pinvelto.help() and use this extension for my comments on this project.</code>
              <button class="pinvelto-guide-copy" type="button">${ICONS.clipboard}</button>
            </div>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">Requirement</div>
            <p class="pinvelto-guide-text">The extension must be active on the page for the bridge API to be available. This works best when the agent uses <strong>your browser</strong> (Claude Chrome, DevTools MCP), since the extension is already installed.</p>
            <p class="pinvelto-guide-text">Agents that launch their own browser (Playwright, Puppeteer) won't have the extension loaded by default. This can be configured by passing the extension path at launch, but requires some local setup.</p>
          </div>
          <div class="pinvelto-guide-section">
            <div class="pinvelto-guide-label">How it works</div>
            <p class="pinvelto-guide-text">The agent calls <code>__pinvelto.help()</code> to discover the API, then uses <strong>createStyleFeedback</strong> for broad CSS changes and <strong>createFeedback</strong> for single-element edits. Changes preview live in the browser and get recorded as Feedback for a coding agent to implement in source.</p>
          </div>
        `
      }
    };

    const wf = workflows[type];
    if (!wf) return;

    header.innerHTML = `
      <button class="pinvelto-guide-back-btn" type="button" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--v-text-secondary);font-family:var(--v-font);font-size:13px;padding:0;">
        ${ICONS.back}
        <span style="color:var(--v-text-primary);font-weight:600;">${wf.title}</span>
      </button>
    `;

    body.innerHTML = `<div class="pinvelto-guide">${wf.content}</div>`;

    header.querySelector('.pinvelto-guide-back-btn').addEventListener('click', () => {
      if (callbacks?.onBack) callbacks.onBack();
      else showDocumentation(dropdown, ICONS, callbacks);
    });
    wireTabSwitching(body);
    wireCopyButtons(body, ICONS);
  }

const PinveltoToolbarDocs = { showDocumentation, showGetStartedGuide, showWorkflow };
export default PinveltoToolbarDocs;
