import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

// Get build info at build time
const getBuildInfo = () => {
  let version = '1.0.0.01';
  const timestamp = new Date().toISOString();
  // when this version was released (set by .github/workflows/version-bump.yml); build time if unset
  let releasedAt = timestamp;
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    const baseVersion = pkg.version || '1.0.0';
    const releaseNumber = String(pkg.releaseNumber || '01').padStart(2, '0');
    version = `${baseVersion}.${releaseNumber}`;
    if (pkg.releasedAt) releasedAt = pkg.releasedAt;
  } catch (e) {
    // fallback version
  }

  try {
    const gitCommit = execSync('git rev-parse HEAD').toString().trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return {
      version,
      timestamp,
      releasedAt,
      commit: gitCommit,
      branch: gitBranch,
      environment: process.env.NODE_ENV || 'development'
    };
  } catch (e) {
    return {
      version,
      timestamp,
      releasedAt,
      commit: 'unknown',
      branch: 'unknown',
      environment: process.env.NODE_ENV || 'development'
    };
  }
};

const buildInfoPlugin = (buildInfo: ReturnType<typeof getBuildInfo>): Plugin => ({
  name: 'westmed-build-info',
  configureServer(server) {
    server.middlewares.use('/build-info.json', (_request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.end(JSON.stringify(buildInfo));
    });
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'build-info.json',
      source: JSON.stringify(buildInfo, null, 2),
    });
  },
});

// The app's stylesheet must not hold back the first paint: on slow mobile data it kept even the loading
// screen in index.html from showing. Load it without blocking (media=print → all once loaded); main.tsx waits
// for it (link#hr-css) before drawing the app, so nothing shows unstyled.
const nonBlockingCssPlugin = (): Plugin => ({
  name: 'westmed-non-blocking-css',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      let first = true;
      return html.replace(/<link rel="stylesheet"( crossorigin)? href="(\/assets\/[^"]+\.css)">/g, (_m, co, href) => {
        const id = first ? ' id="hr-css"' : '';
        first = false;
        return `<link rel="stylesheet"${co || ''}${id} href="${href}" media="print" onload="this.media='all'">` +
          `<noscript><link rel="stylesheet" href="${href}"></noscript>`;
      });
    },
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const buildInfo = getBuildInfo();
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      buildInfoPlugin(buildInfo),
      nonBlockingCssPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['robots.txt', 'selvantra/apple-touch-icon.png', 'selvantra/favicon-48.png'],
        manifest: {
          // installed on phones as "Selvantra HRMS" with the Selvantra icon; opens on the staff sign-in /
          // the employee's own dashboard (managers and administrators switch to Admin inside the app)
          id: '/',
          name: 'Selvantra HRMS',
          short_name: 'Selvantra HRMS',
          description: 'WestMed attendance, leave, tasks and payslips — by Selvantra Technologies',
          theme_color: '#1e3a8a',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/?source=pwa',
          icons: [
            { src: '/selvantra/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/selvantra/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/selvantra/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit
          skipWaiting: true,
          clientsClaim: true,
    runtimeCaching: [
            // NOTE: Supabase API/Auth traffic is intentionally NOT cached to prevent
            // stale auth tokens and corrupted session state from persisting across reloads.
            {
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        }
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      '__BUILD_INFO__': JSON.stringify(buildInfo)
    }
  };
});
