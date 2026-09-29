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
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    const baseVersion = pkg.version || '1.0.0';
    const releaseNumber = String(pkg.releaseNumber || '01').padStart(2, '0');
    version = `${baseVersion}.${releaseNumber}`;
  } catch (e) {
    // fallback version
  }

  try {
    const gitCommit = execSync('git rev-parse HEAD').toString().trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return {
      version,
      timestamp: new Date().toISOString(),
      commit: gitCommit,
      branch: gitBranch,
      environment: process.env.NODE_ENV || 'development'
    };
  } catch (e) {
    return {
      version,
      timestamp: new Date().toISOString(),
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
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['westmed-favicon.png', 'robots.txt'],
        manifest: {
          name: 'WestMed Payroll System',
          short_name: 'WestMed Payroll',
          description: 'WestMed Payroll System — attendance, leave, tasks and payroll',
          theme_color: '#e8f3eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
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
