import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';
import { parseTables } from './md-tables.mjs';
import { extractLinks } from './md-links.mjs';
import { erEntities } from './er-entities.mjs';
import { extractModel } from './likec4-extract.mjs';
import { slugify } from './validate-links.mjs';

export async function buildInputs({ root, archPath, modelPath, docPaths = [] }) {
  const arch = await readFile(archPath, 'utf8');
  const docs = await readDocs(root, [archPath, ...docPaths]);
  return {
    frontmatter: parseFrontmatter(arch).data ?? {},
    tables: parseTables(arch),
    erNames: erEntities(arch),
    model: extractModel(JSON.parse(await readFile(modelPath, 'utf8'))),
    links: docs.flatMap((d) => extractLinks(d.md).map((l) => ({ fromDoc: d.path, href: l.href }))),
    files: docs.map((d) => d.path),
    anchors: Object.fromEntries(docs.map((d) => [d.path, headingSlugs(d.md)])),
  };
}

async function readDocs(root, paths) {
  return Promise.all(paths.map(async (p) => ({
    path: relative(root, p),
    md: await readFile(p, 'utf8'),
  })));
}

function headingSlugs(md) {
  return md.split('\n').filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => slugify(l.replace(/^#+\s*/, '')));
}
