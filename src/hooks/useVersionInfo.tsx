import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildDate: string;
  gitCommit: string;
  environment: string;
  branch: string;
}

interface BuildInfo {
  timestamp: string;
  commit: string;
  branch: string;
  environment: string;
}

export const useVersionInfo = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: '1.0.0',
    buildDate: new Date().toISOString(),
    gitCommit: 'dev',
    environment: 'development',
    branch: 'main'
  });

  useEffect(() => {
    // Try to get build info injected at build time
    const buildInfo = (window as any).__BUILD_INFO__ as BuildInfo | undefined;
    
    if (buildInfo) {
      setVersionInfo({
        version: import.meta.env.PACKAGE_VERSION || '1.0.0',
        buildDate: buildInfo.timestamp,
        gitCommit: buildInfo.commit,
        environment: buildInfo.environment,
        branch: buildInfo.branch
      });
    } else {
      // Fallback for development
      setVersionInfo({
        version: '1.0.0-dev',
        buildDate: new Date().toISOString(),
        gitCommit: 'local',
        environment: 'development',
        branch: 'local'
      });
    }
  }, []);

  return versionInfo;
};