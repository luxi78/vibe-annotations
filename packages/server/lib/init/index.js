import * as p from '@clack/prompts';
import { checkEnvironment } from './environment.js';
import { startServer } from './server.js';
import { AGENTS, findAgent, detectAll, applyAgent } from './agents/index.js';
import { runExtensionStep } from './extension.js';
import { MCP_URL, BASE_URL } from '../config.js';
export async function runInit(options = {}) {
  const interactive =
    !options.nonInteractive && !process.env.CI && !!process.stdin.isTTY;
  p.intro('Pinvelto — local setup');
  const env = await checkEnvironment();
  if (!env.nodeOk) {
    p.cancel('Pinvelto requires Node.js 18 or later');
    process.exitCode = 1;
    return;
  }
  if (env.portState.state === 'foreign') {
    p.cancel(
      `Endpoint ${BASE_URL} is occupied by an unowned service. No process was changed.`
    );
    process.exitCode = 1;
    return;
  }
  if (!options.skipServer) {
    const result = await startServer();
    if (!result.ok) {
      p.cancel(result.reason);
      process.exitCode = 1;
      return;
    }
    p.log.success(
      `Pinvelto is running at ${BASE_URL} (local version ${env.serverInstalled.version})`
    );
  }
  const detected = await detectAll();
  let selected = options.agent;
  if (!selected) {
    const defaults = AGENTS.filter((agent) => detected[agent.id]).map(
      (agent) => agent.id
    );
    if (interactive) {
      selected = await p.multiselect({
        message: 'Configure which coding agents?',
        options: AGENTS.map((agent) => ({
          value: agent.id,
          label: agent.label
        })),
        initialValues: defaults,
        required: false
      });
      if (p.isCancel(selected)) return;
    } else selected = defaults;
  }
  if (typeof selected === 'string') selected = [selected];
  for (const id of selected) {
    const agent = findAgent(id);
    if (!agent) {
      p.log.error(`Unknown agent: ${id}`);
      process.exitCode = 1;
      continue;
    }
    const result = await applyAgent(agent, {
      scope: options.project ? 'project' : 'user',
      cwd: process.cwd(),
      detected: detected[id],
      confirmOverwrite: async () => {
        if (!interactive) return false;
        const answer = await p.confirm({
          message: `Replace the existing Pinvelto entry for ${agent.label}?`,
          initialValue: false
        });
        return !p.isCancel(answer) && answer;
      }
    });
    if (result.status === 'unreadable') process.exitCode = 1;
    p.log.info(
      `${agent.label}: ${result.status}${result.path ? ` — ${result.path}` : ''}`
    );
  }
  if (!selected.length)
    p.log.info(
      `Manual MCP configuration: {"mcpServers":{"pinvelto":{"type":"http","url":"${MCP_URL}"}}}`
    );
  if (!options.skipExtension) await runExtensionStep();
  p.outro(
    `Pinvelto setup complete. MCP: ${MCP_URL}. Manage with pinvelto status / restart / stop.`
  );
}
