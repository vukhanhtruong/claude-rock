import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The viewer named IBM Plex Sans and IBM Plex Mono in its stacks and got them on
// almost no machine: neither ships with macOS, Windows or a stock Linux desktop,
// so the body text fell through to system-ui and the code to whatever the
// platform calls monospace. Both are genre changes, not near-misses — and
// mermaid-theme.json names the same two faces, so the diagrams missed them too.
// The serif stack is left alone: Iowan → Charter → Georgia stays a book serif
// the whole way down, which is a fallback rather than a substitution.
//
// Embedded at render time rather than committed into the template, for the same
// reason the mermaid and LikeC4 bundles are: ~135KB of base64 turns a readable
// design document into a blob with a stylesheet around it, and every later diff
// of that file would carry it.
const FACE = /^(ibm-plex-(?:sans|mono))-latin-(\d{3})-normal\.woff2$/;

const FAMILY = { 'ibm-plex-sans': 'IBM Plex Sans', 'ibm-plex-mono': 'IBM Plex Mono' };

// No newlines and no spaces around the colons: this lands inside the viewer's own
// stylesheet, where every other rule is hand-written and readable, and five
// base64 blobs pretending to be formatted CSS would bury it.
function faceRule(dir, file) {
  const [, family, weight] = file.match(FACE);
  const b64 = readFileSync(join(dir, file)).toString('base64');
  return `@font-face{font-family:'${FAMILY[family]}';font-style:normal;`
    + `font-weight:${weight};font-display:swap;`
    + `src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}

// Throws rather than returning '' when there is nothing to embed. An empty
// string here ships a viewer whose CSS still names the faces, which is the exact
// silent-fallback failure this function exists to end — and a missing directory
// means a broken install, not a viewer without fonts.
export function buildFontFaces(dir) {
  const files = readdirSync(dir).filter((f) => FACE.test(f)).sort();
  if (!files.length) throw new Error(`no woff2 faces in ${dir}`);
  return files.map((f) => faceRule(dir, f)).join('\n');
}
