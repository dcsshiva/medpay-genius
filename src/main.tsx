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

createRoot(document.getElementById("root")!).render(<App />);
