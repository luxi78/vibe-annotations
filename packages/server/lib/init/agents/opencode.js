import { join } from 'path';
import { HOME } from '../../config.js';
import { existsSync } from 'fs';
import { hasBinary, MCP_URL, MCP_NAME } from './shared.js';

const USER_PATH = join(HOME, '.config', 'opencode', 'opencode.json');
const PROJECT_PATH = (cwd) => join(cwd, 'opencode.json');

export default {
  id: 'opencode',
  label: 'OpenCode',

  detect() {
    return hasBinary('opencode') || existsSync(join(HOME, '.config', 'opencode'));
  },

  userConfig() {
    return {
      path: USER_PATH,
      format: 'json',
      keyPath: ['mcp', MCP_NAME],
      value: { type: 'remote', url: MCP_URL },
    };
  },

  projectConfig(cwd) {
    return {
      path: PROJECT_PATH(cwd),
      format: 'json',
      keyPath: ['mcp', MCP_NAME],
      value: { type: 'remote', url: MCP_URL },
    };
  },
};
