export function printResult(pluginName, result) {
  for (const item of result.reused ?? []) {
    console.log(`↻ ${item.skill} (canonical exists, reused)`);
  }
  for (const item of result.installed ?? []) {
    console.log(`✔ ${pluginName}: ${item.skill} → ${item.agent} (${item.mode})`);
    warnIfCopyFallback(item);
  }
  for (const item of result.removed ?? []) {
    console.log(`✔ ${pluginName}: removed ${item.skill} ← ${item.agent}`);
  }
  for (const skill of result.canonicalRemoved ?? []) {
    console.log(`✔ ${pluginName}: removed canonical ${skill}`);
  }
  for (const item of result.skipped ?? []) {
    console.error(`✖ skipped ${item.path} — ${item.reason}`);
  }
  return (result.skipped ?? []).length;
}

function warnIfCopyFallback(item) {
  if (item.mode !== 'copy') return;
  console.error(
    `⚠ ${item.skill} → ${item.agent} installed as plain copy — updates to the canonical skill will not propagate`,
  );
}
