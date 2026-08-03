import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { renderMarkdown } from './lib/md-render.mjs';
import { buildNav } from './lib/nav.mjs';
import { rewriteDocLinks } from './lib/doc-links.mjs';
import { buildDoc } from './lib/doc-sections.mjs';
import { routeMap } from './lib/doc-routes.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { embed } from './lib/embed.mjs';
import { stripRemoteAssets } from './lib/offline.mjs';

function consumeDocs(argv, i, docs) {
  while (argv[i + 1] && !argv[i + 1].startsWith('--')) docs.push(argv[++i]);
  return i;
}

function parseArgs(argv) {
  const args = { root: process.cwd(), docs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--docs') {
      i = consumeDocs(argv, i, args.docs);
    } else if (flag.startsWith('--')) {
      args[flag.slice(2)] = argv[++i];
    }
  }
  return args;
}

function docTitle(archMd) {
  const { data } = parseFrontmatter(archMd);
  if (data?.name) return data.name;
  const h1 = archMd.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : 'Architecture';
}

// The rail buckets documents by the directory they came from, so a docs/adr run
// collapses to one row instead of 17. ARCHITECTURE.md sits at the repo root, so
// its own directory name is meaningless and it heads its own section instead.
const DECISIONS = /^(adrs?|decisions?|rfcs?)$/;

function sectionOf(path, index) {
  if (index === 0) return 'Architecture';
  const dir = basename(dirname(path)).toLowerCase();
  if (DECISIONS.test(dir)) return 'Decision Records';
  return dir.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

const args = parseArgs(process.argv.slice(2));
const archMd = readFileSync(args.arch, 'utf8');
const docPaths = [args.arch, ...args.docs];
const slugs = new Map();
const docSlugs = new Map();
const pages = docPaths.map((p, i) => ({
  ...renderMarkdown(readFileSync(p, 'utf8'), slugs, docSlugs),
  section: sectionOf(p, i),
  path: resolve(p),
  spine: i === 0,
}));

// Second pass, because a link's target id is only known once every document has
// been rendered: the id comes from the target's H1, not from its filename.
const idByPath = new Map(pages.map((p) => [p.path, p.docId]));
const linked = pages.map((p) => ({ ...p, html: rewriteDocLinks(p.html, p.path, idByPath) }));
const routes = routeMap(linked);

const templateUrl = new URL('../assets/viewer-template.html', import.meta.url);
const template = readFileSync(templateUrl, 'utf8');
const html = embed({
  template,
  slots: {
    TITLE: docTitle(archMd),
    NAV: buildNav(linked, routes),
    DOC: buildDoc(linked, routes),
    LIKEC4_BUNDLE: stripRemoteAssets(readFileSync(args['likec4-bundle'], 'utf8')),
    MERMAID_BUNDLE: stripRemoteAssets(readFileSync(args['mermaid-bundle'], 'utf8')),
    THEME: readFileSync(args.theme, 'utf8'),
  },
});

mkdirSync(args.out, { recursive: true });
const outPath = join(args.out, 'index.html');
writeFileSync(outPath, html);
console.log(outPath);
