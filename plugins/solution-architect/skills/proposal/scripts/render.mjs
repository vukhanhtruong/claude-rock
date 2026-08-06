import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { embed } from '../../arch-docs/scripts/lib/embed.mjs';
import { buildFontFaces } from '../../arch-docs/scripts/lib/fonts.mjs';
import { renderMarkdown, escapeHtml } from '../../arch-docs/scripts/lib/md-render.mjs';
import { parseFrontmatter } from '../../arch-docs/scripts/lib/frontmatter.mjs';
import { checkProposal } from './lib/checks.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}

const archFontsDir = new URL('../../arch-docs/assets/fonts/', import.meta.url).pathname;
const templatePath = new URL('../assets/proposal-template.html', import.meta.url).pathname;

const args = parseArgs(process.argv.slice(2));
const md = readFileSync(args.md, 'utf8');
const estimation = JSON.parse(readFileSync(args.estimation, 'utf8'));

// Validation blocks rendering — same hard rule as the estimate skill,
// enforced in code with no skip flag.
const findings = checkProposal({ md, estimation });
if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}

if (typeof args['mermaid-bundle'] !== 'string') {
  console.error('--mermaid-bundle is required (see arch-docs references/viewer.md §1)');
  process.exit(1);
}
const bundle = readFileSync(args['mermaid-bundle'], 'utf8');
if (bundle.includes('</script')) {
  console.error('mermaid bundle carries a literal </script — rebuild it (arch-docs references/viewer.md §1)');
  process.exit(1);
}

const { data: fm } = parseFrontmatter(md);
const { html: content, headings } = renderMarkdown(md);
const nav = headings.filter((h) => h.level === 2)
  .map((h) => `<a href="#${h.slug}">${escapeHtml(h.text)}</a>`).join('\n');

const html = embed({
  template: readFileSync(templatePath, 'utf8'),
  slots: {
    TITLE: escapeHtml(`Proposal — ${fm.client}`),
    FONTS: buildFontFaces(archFontsDir),
    NAV: nav,
    CONTENT: content,
    MERMAID_BUNDLE: bundle,
  },
});

const outPath = join(args.out, 'proposal.html');
writeFileSync(outPath, html);
console.log(outPath);
