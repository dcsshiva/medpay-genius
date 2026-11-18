import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runForceVersionRefresh } from './lib/forceVersionRefresh'

// Detect new HMS build and force SW + cache refresh before mounting.
runForceVersionRefresh();

// Android / Chrome offer "install" once per page load, sometimes before React mounts — keep the
// offer so the /install page and the in-app Install card can use it (window.__installPrompt).
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __installPrompt?: Event }).__installPrompt = e;
});

// A part of the app loaded later (e.g. the PDF or Excel code) can be missing after an update; reload once
// to get the new version instead of failing silently.
window.addEventListener('vite:preloadError', (event) => {
  let last = 0;
  try { last = Number(sessionStorage.getItem('hr_preload_reload') || 0); } catch { /* no storage */ }
  if (Date.now() - last < 60_000) return;
  event.preventDefault();
  try { sessionStorage.setItem('hr_preload_reload', String(Date.now())); } catch { /* no storage */ }
  window.location.reload();
});

// the stylesheet loads without blocking the loading screen (vite.config.ts) — draw the app once it is there
const appCss = document.getElementById('hr-css') as HTMLLinkElement | null;
const cssReady = !appCss || appCss.media !== 'print'
  ? Promise.resolve()
  : new Promise<void>((resolve) => {
    const done = () => { appCss.media = 'all'; resolve(); };
    appCss.addEventListener('load', done, { once: true });
    appCss.addEventListener('error', done, { once: true });
    setTimeout(done, 30_000);
  });

cssReady.then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
  // index.html's start-up safety net stops watching once the app is running
  (window as unknown as { __hrStarted?: boolean }).__hrStarted = true;
});

// index.html switched to in-memory storage because this browser blocks it: the app works, but sign-in
// is forgotten when it is closed — say so, with the fix.
if ((window as unknown as { __storageBlocked?: boolean }).__storageBlocked) {
  const note = document.createElement('div');
  note.setAttribute('role', 'status');
  note.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:#fef3c7;color:#78350f;border:1px solid #f59e0b;border-radius:10px;padding:10px 36px 10px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.15)';
  note.innerHTML = 'This browser is blocking storage, so you will have to sign in each time. iPhone: Settings › Safari › turn off “Block All Cookies”; or open the link in Chrome / Safari.<br>' +
    'இந்த பிரவுசர் சேமிப்பைத் தடுக்கிறது — ஒவ்வொரு முறையும் உள்நுழைய வேண்டும். iPhone: Settings › Safari › “Block All Cookies” ஐ அணைக்கவும்.' +
    '<button aria-label="Close" style="position:absolute;top:6px;right:8px;border:0;background:none;font-size:18px;color:#78350f">✕</button>';
  note.querySelector('button')!.addEventListener('click', () => note.remove());
  document.body.appendChild(note);
}
