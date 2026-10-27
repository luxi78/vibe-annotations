import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = fileURLToPath(new URL('../', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'pinvelto-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'clone');
  mkdirSync(repo);
  const run = (command, args, cwd = repo) => spawnSync(command, args, {
    cwd, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' },
  });
  const git = (...args) => run('git', args);
  for (const name of ['origin', 'upstream']) {
    assert.equal(run('git', ['init', '--bare', join(root, `${name}.git`)]).status, 0);
  }
  assert.equal(git('init', '-b', 'main').status, 0);
  git('config', 'user.name', 'Pinvelto test');
  git('config', 'user.email', 'test@example.invalid');
  writeFileSync(join(repo, 'example.txt'), 'independent project\n');
  git('add', '.');
  assert.equal(git('commit', '-m', 'Initial fixture').status, 0);
  for (const name of ['origin', 'upstream']) git('remote', 'add', name, join(root, `${name}.git`));
  for (const name of ['scripts', '.githooks']) {
    if (existsSync(join(source, name))) cpSync(join(source, name), join(repo, name), { recursive: true });
  }
  return { root, repo, run, git, setup: () => run(process.execPath, ['scripts/setup-upstream-guard.mjs']) };
}

test('fresh-clone setup preserves upstream reads and allows project pushes while rejecting upstream writes', t => {
  const f = fixture(t);
  const setup = f.setup();
  assert.equal(setup.status, 0, setup.stderr);
  assert.equal(f.git('fetch', 'upstream').status, 0);
  const origin = f.git('push', 'origin', 'main');
  assert.equal(origin.status, 0, origin.stderr);
  assert.equal(f.git('ls-remote', 'origin', 'refs/heads/main').stdout.trim().split(/\s/)[1], 'refs/heads/main');
  assert.notEqual(f.git('push', 'upstream', 'main').status, 0);
  assert.equal(f.git('ls-remote', join(f.root, 'upstream.git')).stdout, '');
});

test('push hook rejects upstream destinations even through an alias or direct URL', t => {
  const f = fixture(t);
  assert.equal(f.setup().status, 0);
  const upstream = join(f.root, 'upstream.git');
  f.git('remote', 'add', 'read-source', upstream);
  for (const destination of ['read-source', upstream]) {
    const result = f.git('push', destination, 'main');
    assert.notEqual(result.status, 0, result.stderr);
    assert.match(result.stderr, /Pinvelto.*read.only/i);
  }
  assert.equal(f.git('ls-remote', upstream).stdout, '');
  assert.equal(f.setup().status, 0, 'setup is repeatable');
  assert.equal(f.git('push', 'origin', 'main').status, 0);
});

test('Git hook rejects canonical upstream URL forms without contacting the network', t => {
  const f = fixture(t);
  assert.equal(f.setup().status, 0);
  for (const url of [
    'git@github.com:RaphaelRegnier/vibe-annotations.git',
    'https://github.com/RaphaelRegnier/vibe-annotations',
    'ssh://git@github.com/RaphaelRegnier/vibe-annotations.git',
  ]) {
    const result = f.git('hook', 'run', 'pre-push', '--', 'alias', url);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Pinvelto upstream is read-only/);
  }
  assert.equal(f.git('hook', 'run', 'pre-push', '--', 'origin', 'git@github.com:luxi78/vibe-annotations.git').status, 0);
});

test('setup leaves existing hook and upstream push configuration untouched on conflict', t => {
  const f = fixture(t);
  f.git('config', 'core.hooksPath', 'custom-hooks');
  const result = f.setup();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /integrated manually/);
  assert.equal(f.git('config', '--get', 'core.hooksPath').stdout.trim(), 'custom-hooks');
  assert.equal(f.git('remote', 'get-url', '--push', 'upstream').stdout.trim(), join(f.root, 'upstream.git'));
});
