import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Code Engine Studio wordmark, embedded for the same reason the faces are:
// the viewer is one offline file, so a linked image is a request it cannot make,
// and ~21KB of base64 committed into the template would bury a file people read.
//
// Two files, not one. The mark is drawn in navy and orange, which disappears
// against the dark palette, so the guide ships a white variant for dark
// backgrounds. Both are embedded and CSS picks between them — the toggle has no
// script to run and no second request to make, and print gets the dark-on-light
// one whatever mode the reader was in.
const FILES = { light: 'CodeEngine_Orange.png', dark: 'CodeEngine_White.png' };

function dataUri(dir, file) {
  return `data:image/png;base64,${readFileSync(join(dir, file)).toString('base64')}`;
}

// Throws rather than returning an empty rule, on the same reasoning as
// buildFontFaces: a missing asset means a broken install, and a viewer that
// silently ships the studio's document without the studio's mark on it is the
// failure this function exists to prevent.
export function buildLogo(dir) {
  const light = dataUri(dir, FILES.light);
  const dark = dataUri(dir, FILES.dark);
  return `.brand-logo{--mark:url(${light})}\n`
    + `:root[data-theme="dark"] .brand-logo{--mark:url(${dark})}\n`
    + '@media print{.brand-logo{--mark:url(' + light + ')}}';
}
