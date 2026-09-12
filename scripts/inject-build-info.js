#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getBuildInfo() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  
  try {
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('Could not get git commit:', e.message);
  }
  
  try {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('Could not get git branch:', e.message);
  }

  const buildInfo = {
    version: `${packageJson.version}.${String(packageJson.releaseNumber || '01').padStart(2, '0')}`,
    timestamp: new Date().toISOString(),
    commit: gitCommit,
    branch: gitBranch,
    environment: process.env.NODE_ENV || 'development'
  };

  return buildInfo;
}

function injectBuildInfo() {
  const buildInfo = getBuildInfo();
  
  // Create build-info.json in public directory
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(publicDir, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );

  // Create a TypeScript file with build info for static imports
  const buildInfoTs = `// Auto-generated build information
export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)} as const;

// Inject into window for runtime access
declare global {
  interface Window {
    __BUILD_INFO__?: typeof BUILD_INFO;
  }
}

if (typeof window !== 'undefined') {
  window.__BUILD_INFO__ = BUILD_INFO;
}
`;

  const srcDir = path.join(process.cwd(), 'src');
  fs.writeFileSync(path.join(srcDir, 'build-info.ts'), buildInfoTs);

  console.log('✅ Build information injected:', buildInfo);
}

// Run if called directly
if (require.main === module) {
  injectBuildInfo();
}

module.exports = { getBuildInfo, injectBuildInfo };