import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../src/cli/flow.mjs';
import { REGISTRY, argsFor, stubPrompts, ctxFor, subdir } from './helpers/flow-fixtures.mjs';

test('interactive run asks in order and confirms last', async (t) => {
  const { ctx } = ctxFor(t);
  const deep = subdir(ctx.cwd, 'src');
  const prompts = stubPrompts({
    plugins: ['lmk', 'solution-architect'],
    agents: ['claude', 'codex'],
  });
  const plan = await buildPlan({
    args: argsFor(), registry: REGISTRY, prompts, ctx: { ...ctx, cwd: deep },
  });
  assert.deepEqual(prompts.calls, [
    'pickPlugins', 'pickAgents', 'pickScope', 'confirmRoot', 'showSummary', 'confirmInstall',
  ]);
  assert.deepEqual(plan.agents, ['claude', 'codex']);
  assert.equal(plan.root, ctx.cwd);
});

test('no root confirm when the cwd already is the project root', async (t) => {
  const { ctx } = ctxFor(t);
  const prompts = stubPrompts();
  const plan = await buildPlan({ args: argsFor(), registry: REGISTRY, prompts, ctx });
  assert.ok(!prompts.calls.includes('confirmRoot'));
  assert.equal(plan.root, ctx.cwd);
});

test('declining the detected root falls back to the cwd', async (t) => {
  const { ctx } = ctxFor(t);
  const deep = subdir(ctx.cwd, 'src');
  const plan = await buildPlan({
    args: argsFor(), registry: REGISTRY,
    prompts: stubPrompts({ root: deep }), ctx: { ...ctx, cwd: deep },
  });
  assert.equal(plan.root, deep);
});

test('confirmRoot is told the detected root, its marker, and the cwd', async (t) => {
  const { ctx } = ctxFor(t);
  const deep = subdir(ctx.cwd, 'src');
  let seen = null;
  const prompts = stubPrompts();
  prompts.confirmRoot = async (info) => {
    seen = info;
    return info.detected;
  };
  await buildPlan({ args: argsFor(), registry: REGISTRY, prompts, ctx: { ...ctx, cwd: deep } });
  assert.deepEqual(seen, { detected: ctx.cwd, marker: '.git', cwd: deep });
});

test('undetectable root still confirms, reports no marker, and uses the cwd', async (t) => {
  const { base, ctx } = ctxFor(t);
  const bare = subdir(base, 'bare');
  let seen = null;
  const prompts = stubPrompts();
  prompts.confirmRoot = async (info) => {
    seen = info;
    return info.cwd;
  };
  const plan = await buildPlan({
    args: argsFor(), registry: REGISTRY, prompts, ctx: { ...ctx, cwd: bare },
  });
  assert.deepEqual(seen, { detected: null, marker: null, cwd: bare });
  assert.equal(plan.root, bare);
});

test('cancelling any prompt yields a null plan', async (t) => {
  for (const cancelled of ['plugins', 'agents', 'scope', 'root']) {
    const { ctx } = ctxFor(t);
    const deep = subdir(ctx.cwd, 'src');
    const plan = await buildPlan({
      args: argsFor(), registry: REGISTRY,
      prompts: stubPrompts({ [cancelled]: null }), ctx: { ...ctx, cwd: deep },
    });
    assert.equal(plan, null, `cancelling ${cancelled} should abort`);
  }
});

test('cancelling a prompt stops the ones after it', async (t) => {
  const { ctx } = ctxFor(t);
  const prompts = stubPrompts({ agents: null });
  await buildPlan({ args: argsFor(), registry: REGISTRY, prompts, ctx });
  assert.deepEqual(prompts.calls, ['pickPlugins', 'pickAgents']);
});

test('declining the final confirm yields a null plan', async (t) => {
  const { ctx } = ctxFor(t);
  const plan = await buildPlan({
    args: argsFor(), registry: REGISTRY, prompts: stubPrompts({ proceed: false }), ctx,
  });
  assert.equal(plan, null);
});

test('an empty pick is treated as a cancel, not an empty install', async (t) => {
  const { ctx } = ctxFor(t);
  const plan = await buildPlan({
    args: argsFor(), registry: REGISTRY, prompts: stubPrompts({ plugins: [] }), ctx,
  });
  assert.equal(plan, null);
});

test('--yes skips both confirms and assumes project scope', async (t) => {
  const { ctx } = ctxFor(t);
  const deep = subdir(ctx.cwd, 'src');
  const prompts = stubPrompts();
  const plan = await buildPlan({
    args: argsFor({ plugins: ['lmk'], agents: ['claude'], yes: true }),
    registry: REGISTRY, prompts, ctx: { ...ctx, cwd: deep },
  });
  assert.deepEqual(prompts.calls, ['showSummary']);
  assert.equal(plan.scope, 'project');
  assert.equal(plan.root, ctx.cwd);
});

test('--yes with an explicit scope keeps that scope', async (t) => {
  const { ctx } = ctxFor(t);
  const plan = await buildPlan({
    args: argsFor({ plugins: ['lmk'], agents: ['claude'], scope: 'user', yes: true }),
    registry: REGISTRY, prompts: stubPrompts(), ctx,
  });
  assert.equal(plan.scope, 'user');
});
