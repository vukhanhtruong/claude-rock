// stats.mjs
// new-lead-dashboard v1
// Pure data logic for the dashboard: stats, filtering, sorting.
// No DOM, no fetch, no Node-only imports — loaded by the browser as an ES module.

export function computeStats(leads, todayISO) {
  return {
    wonThisMonth: countWonThisMonth(leads, todayISO),
    winRate: computeWinRate(leads),
    pipelineValue: computePipelineValue(leads),
    avgCycleDays: computeAvgCycleDays(leads),
  };
}

export function filterLeads(leads, { status, text }) {
  const needle = (text ?? '').toLowerCase();
  return leads.filter((l) => {
    const statusOk = status === 'all' || l.status === status;
    const textOk = !needle || [l.id, l.client, l.title].some((v) => v.toLowerCase().includes(needle));
    return statusOk && textOk;
  });
}

export function sortLeads(leads, key, dir) {
  const getValue = SORT_KEYS[key];
  const sign = dir === 'desc' ? -1 : 1;
  return leads
    .map((lead, index) => ({ lead, index }))
    .sort(compareBy(getValue, sign))
    .map(({ lead }) => lead);
}

function countWonThisMonth(leads, todayISO) {
  const month = todayISO.slice(0, 7);
  return leads.filter((l) => l.status === 'won' && l.closed?.slice(0, 7) === month).length;
}

function computeWinRate(leads) {
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost').length;
  const total = won + lost;
  return total === 0 ? null : Math.round((won / total) * 100) / 100;
}

// Groups active pipeline value by currency instead of summing everything into one
// (mislabeled) total. Sorted by descending high total (the biggest number leads),
// tie-broken ascending by currency code so the tile's row order stays stable across
// renders when two currencies happen to total the same.
function computePipelineValue(leads) {
  const active = leads.filter((l) => l.status === 'active' && l.value);
  if (active.length === 0) return null;
  const groups = new Map();
  for (const l of active) {
    const g = groups.get(l.value.currency) ?? { currency: l.value.currency, low: 0, high: 0, count: 0 };
    g.low += l.value.low;
    g.high += l.value.high;
    g.count += 1;
    groups.set(l.value.currency, g);
  }
  return [...groups.values()].sort((a, b) => b.high - a.high || (a.currency < b.currency ? -1 : 1));
}

function computeAvgCycleDays(leads) {
  const spans = leads
    .filter((l) => (l.status === 'won' || l.status === 'lost') && l.created && l.closed)
    .map((l) => daysBetween(l.created, l.closed))
    .filter((d) => d >= 0);
  if (spans.length === 0) return null;
  return Math.round(spans.reduce((sum, d) => sum + d, 0) / spans.length);
}

function daysBetween(fromISO, toISO) {
  return (toUTCDay(toISO) - toUTCDay(fromISO)) / 86400000;
}

function toUTCDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

const SORT_KEYS = {
  created: (l) => l.created,
  closed: (l) => l.closed ?? '',
  value: (l) => l.value?.high ?? -1,
  client: (l) => l.client,
};

function compareBy(getValue, sign) {
  return (a, b) => {
    const va = getValue(a.lead);
    const vb = getValue(b.lead);
    if (va < vb) return -1 * sign;
    if (va > vb) return 1 * sign;
    return a.index - b.index;
  };
}
