import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  openSync,
  closeSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { PORT, DATA_DIR, BASE_URL } from './config.js';
export const RECORD_FILE = path.join(DATA_DIR, `service-${PORT}.json`);
export const LOG_FILE = path.join(DATA_DIR, `service-${PORT}.log`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function readRecord() {
  try {
    return JSON.parse(readFileSync(RECORD_FILE, 'utf8'));
  } catch {
    return null;
  }
}
function forget(record) {
  const current = readRecord();
  if (current?.instanceId === record?.instanceId) {
    try {
      unlinkSync(RECORD_FILE);
    } catch {}
  }
}
function occupied() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: PORT });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', (error) => finish(error.code !== 'ECONNREFUSED'));
    socket.setTimeout(1000, () => finish(true));
  });
}
export async function inspectService() {
  let health;
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(1000)
    });
    if (response.ok) health = await response.json();
  } catch {}
  const record = readRecord();
  if (health?.product === 'pinvelto' && health.status === 'ok') {
    const owned =
      record?.product === 'pinvelto' &&
      record.pid === health.pid &&
      record.instanceId === health.instanceId &&
      typeof record.token === 'string';
    return { state: owned ? 'owned' : 'unmanaged', health, record };
  }
  return { state: (await occupied()) ? 'foreign' : 'stopped', record };
}
export async function startService({ daemon = true } = {}) {
  const status = await inspectService();
  if (status.state === 'owned')
    return { ok: true, pid: status.health.pid, alreadyRunning: true };
  if (status.state !== 'stopped')
    return {
      ok: false,
      reason: `Endpoint ${BASE_URL} is occupied (${status.state}); no process was changed`
    };
  mkdirSync(DATA_DIR, { recursive: true });
  const token = randomUUID();
  const instanceId = randomUUID();
  const log = openSync(LOG_FILE, 'a');
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL('./server.js', import.meta.url))],
    {
      detached: daemon,
      windowsHide: true,
      stdio: daemon ? ['ignore', log, log] : 'inherit',
      env: {
        ...process.env,
        PINVELTO_CONTROL_TOKEN: token,
        PINVELTO_INSTANCE_ID: instanceId
      }
    }
  );
  closeSync(log);
  let spawnError;
  child.on('error', (error) => {
    spawnError = error;
  });
  const record = { product: 'pinvelto', pid: child.pid, instanceId, token };
  writeFileSync(RECORD_FILE, JSON.stringify(record), { mode: 0o600 });
  if (daemon) child.unref();
  // Fresh local installs can spend several seconds loading cold dependencies.
  // Keep startup bounded without treating a healthy, slower owned child as failure.
  const startupDeadline = Date.now() + 20000;
  while (Date.now() < startupDeadline) {
    const current = await inspectService();
    if (current.state === 'owned' && current.health.instanceId === instanceId)
      return { ok: true, pid: child.pid, child };
    if (spawnError || child.exitCode !== null) break;
    await sleep(100);
  }
  forget(record);
  // Only the child created by this invocation may be signaled after failed startup.
  if (child.exitCode === null && !spawnError) child.kill();
  return { ok: false, reason: `Pinvelto failed to start; see ${LOG_FILE}` };
}
export async function stopService() {
  const status = await inspectService();
  if (status.state === 'stopped') {
    if (status.record) forget(status.record);
    return { ok: true, stopped: false };
  }
  if (status.state !== 'owned')
    return {
      ok: false,
      reason: `Cannot stop ${status.state} service at ${BASE_URL}; no process was changed`
    };
  // A stale PID alone never authorizes a signal. The responding instance must
  // accept its per-launch secret before it can shut itself down.
  const response = await fetch(`${BASE_URL}/internal/shutdown`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${status.record.token}` },
    signal: AbortSignal.timeout(2000)
  });
  if (!response.ok)
    return {
      ok: false,
      reason: 'Service ownership could not be verified; no process was changed'
    };
  for (let i = 0; i < 50; i++) {
    if (!(await occupied())) {
      forget(status.record);
      return { ok: true, stopped: true };
    }
    await sleep(100);
  }
  return { ok: false, reason: 'Pinvelto shutdown did not complete' };
}
