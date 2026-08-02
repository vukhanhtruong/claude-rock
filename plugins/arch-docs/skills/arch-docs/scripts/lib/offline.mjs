const REMOTE_ASSET = /url\(\s*['"]?https?:\/\/[^)]*\)(\s*format\([^)]*\))?/g;
const SCRIPT_CLOSE_TAG = /<\/script/i;

// Third-party bundles we inline (LikeC4 ships @font-face rules pointing at a CDN)
// must not fetch anything: the viewer is offline-only. Rewrite every absolute-URL
// CSS asset to a local() source; url(#fragment) and data: URIs are left untouched.
// The replacement carries no quote characters: the CSS it lands in is itself inside
// a JS string literal, and a quote of the wrong style would break the bundle open.
//
// render.mjs splices this bundle straight into a <script> element's text content.
// A literal "</script>" anywhere in it (e.g. inside a string or comment) would
// close that element early and truncate the page, so refuse loudly instead of
// shipping a silently broken viewer.
export function stripRemoteAssets(js) {
  if (SCRIPT_CLOSE_TAG.test(js)) {
    throw new Error('bundle contains a literal </script> that would truncate the inlined <script> tag');
  }
  return js.replace(REMOTE_ASSET, 'local(system-ui)');
}
