import React from 'react';

interface VersionDisplayProps {
  version?: string;
}

const VersionDisplay: React.FC<VersionDisplayProps> = ({ version = "25.01" }) => {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-muted/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground">
          HMS Ver.{version}
        </p>
      </div>
    </div>
  );
};

export default VersionDisplay;