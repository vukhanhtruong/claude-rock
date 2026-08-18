import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import path from 'node:path';
import { buildPlan } from '../src/cli/flow.mjs';
import { UsageError } from '../src/cli/args.mjs';
import { REGISTRY, argsFor, stubPrompts, ctxFor, subdir } from './helpers/flow-fixtures.mjs';

test('flags only, non-TTY, user scope asks nothing', async (t) => {
  const { base, ctx } = ctxFor(t, { isTTY: false });
  const prompts = stubPrompts();
  const plan = await buildPlan({
    args: argsFor({ plugins: ['lmk'], agents: ['claude'], scope: 'user' }),
    registry: REGISTRY, prompts, ctx,
  });
  assert.deepEqual(prompts.calls, ['showSummary']);
  assert.equal(plan.scope, 'user');
  assert.equal(plan.root, null);
  assert.equal(plan.targets.canonical, path.join(base, '.agents', 'skills'));
  assert.deepEqual(plan.plugins.map((p) => p.name), ['lmk']);
});

test('project scope resolves the detected root, not the cwd', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  const deep = subdir(ctx.cwd, 'src', 'api');
  const plan = await buildPlan({
    args: argsFor({ plugins: ['lmk'], agents: ['claude'], scope: 'project' }),
    registry: REGISTRY, prompts: stubPrompts(), ctx: { ...ctx, cwd: deep },
  });
  assert.equal(plan.root, ctx.cwd);
  assert.equal(plan.targets.agentDirs.claude, path.join(ctx.cwd, '.claude', 'skills'));
});

test('--dir overrides detection and implies project scope', async (t) => {
  const { base, ctx } = ctxFor(t, { isTTY: false });
  const explicit = subdir(base, 'elsewhere');
  const plan = await buildPlan({
    args: argsFor({ plugins: ['lmk'], agents: ['claude'], dir: explicit }),
    registry: REGISTRY, prompts: stubPrompts(), ctx,
  });
  assert.equal(plan.scope, 'project');
  assert.equal(plan.root, explicit);
});

test('non-TTY without --plugin names the flag', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  await assert.rejects(
    buildPlan({
      args: argsFor({ agents: ['claude'], scope: 'user' }),
      registry: REGISTRY, prompts: stubPrompts(), ctx,
    }),
    (err) => err instanceof UsageError && /--plugin/.test(err.message),
  );
});

test('non-TTY without --agent names the flag', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  await assert.rejects(
    buildPlan({
      args: argsFor({ plugins: ['lmk'], scope: 'user' }),
      registry: REGISTRY, prompts: stubPrompts(), ctx,
    }),
    (err) => err instanceof UsageError && /--agent/.test(err.message),
  );
});

test('non-TTY without a scope names --global and --project', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  await assert.rejects(
    buildPlan({
      args: argsFor({ plugins: ['lmk'], agents: ['claude'] }),
      registry: REGISTRY, prompts: stubPrompts(), ctx,
    }),
    (err) => err instanceof UsageError && /--global/.test(err.message) && /--project/.test(err.message),
  );
});

test('uninstall without --agent targets every agent and skips the agent prompt', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  const prompts = stubPrompts();
  const plan = await buildPlan({
    args: argsFor({ command: 'uninstall', plugins: ['lmk'], scope: 'user' }),
    registry: REGISTRY, prompts, ctx,
  });
  assert.ok(!prompts.calls.includes('pickAgents'));
  assert.deepEqual(plan.agents, ['claude', 'codex']);
});

test('uninstall still requires an explicit scope in non-TTY', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  await assert.rejects(
    buildPlan({
      args: argsFor({ command: 'uninstall', plugins: ['lmk'] }),
      registry: REGISTRY, prompts: stubPrompts(), ctx,
    }),
    (err) => err instanceof UsageError,
  );
});

test('unknown plugin name lists the available plugins', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  await assert.rejects(
    buildPlan({
      args: argsFor({ plugins: ['nope'], agents: ['claude'], scope: 'user' }),
      registry: REGISTRY, prompts: stubPrompts(), ctx,
    }),
    (err) => err instanceof UsageError && /solution-architect/.test(err.message),
  );
});

test('defaults ctx home and env from the process', async (t) => {
  const { ctx } = ctxFor(t, { isTTY: false });
  const plan = await buildPlan({
    args: argsFor({ plugins: ['lmk'], agents: ['claude'], scope: 'user' }),
    registry: REGISTRY, prompts: stubPrompts(), ctx: { cwd: ctx.cwd, isTTY: false },
  });
  assert.equal(plan.targets.canonical, path.join(homedir(), '.agents', 'skills'));
});
