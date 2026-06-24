import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runForceVersionRefresh } from './lib/forceVersionRefresh'

// Detect new HMS build and force SW + cache refresh before mounting.
runForceVersionRefresh();

createRoot(document.getElementById("root")!).render(<App />);
