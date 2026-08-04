import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { embed } from '../../arch-docs/scripts/lib/embed.mjs';
import { buildFontFaces } from '../../arch-docs/scripts/lib/fonts.mjs';
import { checkDeliverables } from './lib/checks.mjs';
import { inlineModule, stripInternal } from './lib/inline.mjs';
import { redactForClient } from './lib/redact.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { args[key] = true; continue; }
    args[key] = next;
    i += 1;
  }
  return args;
}

const archFontsDir = new URL('../../arch-docs/assets/fonts/', import.meta.url).pathname;
const mathPath = new URL('./lib/estimate-math.mjs', import.meta.url).pathname;
const templatePath = new URL('../assets/estimate-template.html', import.meta.url).pathname;

const args = parseArgs(process.argv.slice(2));
const estimation = JSON.parse(readFileSync(args.json, 'utf8'));
const md = readFileSync(args.md, 'utf8');

// Validation blocks rendering: this is the hard rule enforced in code, not
// just in SKILL.md prose. No skip flag exists.
const findings = checkDeliverables({ md, estimation });
if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}

const dataForEmbed = args['client-only'] ? redactForClient(estimation) : estimation;
const template = readFileSync(templatePath, 'utf8');
const html = embed({
  template,
  slots: {
    TITLE: estimation.inputs.project,
    FONTS: buildFontFaces(archFontsDir),
    // Escaped so a literal </script in the JSON can't close the data tag early.
    DATA: JSON.stringify(dataForEmbed).replaceAll('</script', '<\\/script'),
    MATH: inlineModule(readFileSync(mathPath, 'utf8')),
  },
});

const finalHtml = args['client-only']
  ? stripInternal(html).replace('<body', '<body class="view-client"')
  : html;

const outPath = join(args.out, 'estimate.html');
writeFileSync(outPath, finalHtml);
console.log(outPath);
