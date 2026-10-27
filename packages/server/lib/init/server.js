import { startService } from '../lifecycle.js';
// Setup always runs the installed local artifact; it never resolves a registry package.
export async function startServer() {
  return startService();
}
