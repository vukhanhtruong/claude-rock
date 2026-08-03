import readline from 'node:readline';

export function createPickerState(items) {
  return { items, cursor: 0, selected: new Set() };
}

export function reduceKey(state, key) {
  if (key === 'up') return { ...state, cursor: Math.max(0, state.cursor - 1) };
  if (key === 'down') {
    return { ...state, cursor: Math.min(state.items.length - 1, state.cursor + 1) };
  }
  if (key === 'space') return toggle(state);
  return state;
}

function toggle(state) {
  const selected = new Set(state.selected);
  const value = state.items[state.cursor].value;
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  return { ...state, selected };
}

export function renderPicker(state, title) {
  const rows = state.items.map((item, i) => {
    const cursor = i === state.cursor ? '>' : ' ';
    const mark = state.selected.has(item.value) ? '[x]' : '[ ]';
    const hint = item.hint ? `  ${item.hint}` : '';
    return `${cursor} ${mark} ${item.label}${hint}`;
  });
  return [title, ...rows, '(space: toggle, enter: confirm, ctrl-c: cancel)'].join('\n');
}

export function runPicker({ title, items }) {
  return new Promise((resolve) => {
    const session = { state: createPickerState(items), title, rendered: 0 };
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onKey = makeKeyHandler(session, (value) => {
      teardown(onKey);
      resolve(value);
    });
    process.stdin.on('keypress', onKey);
    draw(session);
  });
}

function makeKeyHandler(session, finish) {
  return (str, key) => {
    if (key.ctrl && key.name === 'c') return finish(null);
    if (key.name === 'return') return finish([...session.state.selected]);
    session.state = reduceKey(session.state, keyName(key));
    draw(session);
  };
}

function keyName(key) {
  if (key.name === 'up' || key.name === 'down' || key.name === 'space') return key.name;
  return '';
}

function draw(session) {
  if (session.rendered > 0) process.stdout.write(`\x1b[${session.rendered}A\x1b[J`);
  const text = renderPicker(session.state, session.title);
  session.rendered = text.split('\n').length;
  process.stdout.write(text + '\n');
}

function teardown(onKey) {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.removeListener('keypress', onKey);
}
