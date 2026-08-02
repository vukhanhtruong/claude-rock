import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderMarkdown } from './lib/md-render.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { embed } from './lib/embed.mjs';

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

function renderNav(pages) {
  return pages
    .flatMap((p) => p.headings)
    .map((h) => `<a href="#${h.slug}">${h.text}</a>`)
    .join('\n');
}

const args = parseArgs(process.argv.slice(2));
const archMd = readFileSync(args.arch, 'utf8');
const docPaths = [args.arch, ...args.docs];
const slugs = new Map();
const pages = docPaths.map((p) => renderMarkdown(readFileSync(p, 'utf8'), slugs));

const templateUrl = new URL('../assets/viewer-template.html', import.meta.url);
const template = readFileSync(templateUrl, 'utf8');
const html = embed({
  template,
  slots: {
    TITLE: docTitle(archMd),
    NAV: renderNav(pages),
    DOC: pages.map((p) => p.html).join('\n'),
    LIKEC4_BUNDLE: readFileSync(args['likec4-bundle'], 'utf8'),
    MERMAID_BUNDLE: readFileSync(args['mermaid-bundle'], 'utf8'),
    THEME: readFileSync(args.theme, 'utf8'),
  },
});

mkdirSync(args.out, { recursive: true });
const outPath = join(args.out, 'index.html');
writeFileSync(outPath, html);
console.log(outPath);
