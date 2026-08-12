export function extractLinks(md) {
  const links = [];
  const re = /\[([^\]]*)\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(md)) !== null) links.push({ text: m[1], href: m[2] });
  return links;
}
