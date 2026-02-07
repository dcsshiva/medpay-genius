import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { VitePWA } from 'vite-plugin-pwa';

// Get build info at build time
const getBuildInfo = () => {
  let version = '1.0.0';
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    version = pkg.version || '1.0.0';
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
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['westmed-favicon.png', 'robots.txt'],
        manifest: {
          name: 'WestMed Hospital - Payment Management System',
          short_name: 'WestMed',
          description: 'WestMed Hospital Management System - World-Class Healthcare to All',
          theme_color: '#e8f3eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
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
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
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
