import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from 'child_process';

// Get build info at build time
const getBuildInfo = () => {
  try {
    const gitCommit = execSync('git rev-parse HEAD').toString().trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return {
      timestamp: new Date().toISOString(),
      commit: gitCommit,
      branch: gitBranch,
      environment: process.env.NODE_ENV || 'development'
    };
  } catch (e) {
    return {
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
      mode === 'development' &&
      componentTagger(),
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
