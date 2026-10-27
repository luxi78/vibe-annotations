#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const [remote, destination = ''] = process.argv.slice(2);
const normalize = value => {
  let result = value.replace(/\\/g, '/').replace(/\/$/, '').replace(/\.git$/i, '');
  result = result.replace(/^git@github\.com:/i, 'https://github.com/').replace(/^ssh:\/\/git@github\.com\//i, 'https://github.com/');
  if (!result.includes('://')) result = resolve(result).replace(/\\/g, '/');
  return process.platform === 'win32' || result.startsWith('https://github.com/') ? result.toLowerCase() : result;
};
let sources = [];
try {
  sources = execFileSync('git', ['config', '--get-all', 'remote.upstream.url'], { encoding: 'utf8' }).trim().split('\n');
} catch {}
const target = normalize(destination);
const canonicalUpstream = /^(?:https?:\/\/|ssh:\/\/(?:[^@/]+@)?|git:\/\/|[^@/]+@)github\.com[/:]raphaelregnier\/vibe-annotations(?:\.git)?\/?$/i;
if (remote === 'upstream' || sources.some(source => normalize(source) === target) || canonicalUpstream.test(destination)) {
  console.error('Pinvelto upstream is read-only. Push project changes to origin; assess upstream adoption before applying it.');
  process.exitCode = 1;
}
