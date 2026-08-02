const REMOTE_ASSET = /url\(\s*['"]?https?:\/\/[^)]*\)(\s*format\([^)]*\))?/g;

// Third-party bundles we inline (LikeC4 ships @font-face rules pointing at a CDN)
// must not fetch anything: the viewer is offline-only. Rewrite every absolute-URL
// CSS asset to a local() source; url(#fragment) and data: URIs are left untouched.
// The replacement carries no quote characters: the CSS it lands in is itself inside
// a JS string literal, and a quote of the wrong style would break the bundle open.
export function stripRemoteAssets(js) {
  return js.replace(REMOTE_ASSET, 'local(system-ui)');
}
