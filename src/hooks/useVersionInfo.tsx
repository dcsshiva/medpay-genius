import { useState } from 'react';
import { toISOStringIST } from '@/lib/dateUtils';

interface VersionInfo {
  version: string;
  buildDate: string;
  gitCommit: string;
  environment: string;
  branch: string;
}

interface BuildInfo {
  version: string;
  timestamp: string;
  commit: string;
  branch: string;
  environment: string;
}

// Declare the global constant that Vite replaces at build time
declare const __BUILD_INFO__: BuildInfo | undefined;

export const useVersionInfo = () => {
  const [versionInfo] = useState<VersionInfo>(() => {
    // Read build info injected by Vite define at compile time
    try {
      const buildInfo = __BUILD_INFO__;
      if (buildInfo) {
        return {
          version: buildInfo.version || '1.0.0.01',
          buildDate: buildInfo.timestamp,
          gitCommit: buildInfo.commit,
          environment: buildInfo.environment,
          branch: buildInfo.branch
        };
      }
    } catch (e) {
      // Fallback for environments where __BUILD_INFO__ is not defined
    }
    return {
      version: '1.0.0.01-dev',
      buildDate: toISOStringIST(),
      gitCommit: 'local',
      environment: 'development',
      branch: 'local'
    };
  });

  return versionInfo;
};
