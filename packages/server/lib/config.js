import { homedir } from 'node:os';
import path from 'node:path';
export const HOME = process.env.PINVELTO_HOME || homedir();
export const PORT = Number(process.env.PINVELTO_PORT || 3847);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535)
  throw new Error('PINVELTO_PORT must be between 1 and 65535');
export const DATA_DIR = path.join(HOME, '.pinvelto');
export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const MCP_URL = `${BASE_URL}/mcp`;
