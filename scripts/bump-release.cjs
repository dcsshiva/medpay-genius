#!/usr/bin/env node

const fs = require('fs');

const packagePath = 'package.json';
const lockPath = 'package-lock.json';
const requestedType = process.argv[2] || 'release';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const parts = packageJson.version.split('.').map((part) => Number.parseInt(part, 10) || 0);

while (parts.length < 3) parts.push(0);

let releaseNumber = Number.parseInt(packageJson.releaseNumber || '0', 10) || 0;

if (requestedType === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
  releaseNumber = 1;
} else if (requestedType === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
  releaseNumber = 1;
} else {
  releaseNumber += 1;
  if (releaseNumber > 99) {
    parts[2] += 1;
    releaseNumber = 1;
  }
}

packageJson.version = parts.slice(0, 3).join('.');
packageJson.releaseNumber = String(releaseNumber).padStart(2, '0');
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

if (fs.existsSync(lockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  packageLock.version = packageJson.version;
  packageLock.releaseNumber = packageJson.releaseNumber;
  if (packageLock.packages?.['']) {
    packageLock.packages[''].version = packageJson.version;
    packageLock.packages[''].releaseNumber = packageJson.releaseNumber;
  }
  fs.writeFileSync(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
}

process.stdout.write(`v${packageJson.version}.${packageJson.releaseNumber}`);