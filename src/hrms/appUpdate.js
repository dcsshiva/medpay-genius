/**
 * Keeping installed copies (phones, "Add to Home screen") on the latest version (pure; see
 * appUpdate.test.js). The app's offline cache (service worker) keeps serving the version it
 * first downloaded, and a plain refresh on a phone often does not replace it. So the app asks
 * the server for /build-info.json (never cached) and, when a newer version is published,
 * updates itself — clearing the old cache and reloading.
 */
const parts = (v) => String(v || '').replace(/^v/i, '').split('.').map(n => Number.parseInt(n, 10) || 0);

/** true when `published` ("1.1.0.21") is a newer version than `current` ("1.1.0.20"). */
export function isNewerVersion(current, published) {
  if (!published) return false;
  if (!current) return true;
  const a = parts(current), b = parts(published);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  }
  return false;
}

/**
 * What to do when a newer version is found.
 *  quiet: nothing would be lost (no unsaved changes, no dialog open) → 'reload' straight away
 *  otherwise → 'banner' (an "Update now" bar; the person chooses when)
 *  tried: this version was already tried in this tab and the server still sent the old one
 *         (e.g. a slow CDN) → 'banner', so the app never reloads in a loop.
 */
export function updateAction({ current, published, quiet, tried }) {
  if (!isNewerVersion(current, published)) return 'none';
  if (tried === published) return 'banner';
  return quiet ? 'reload' : 'banner';
}
