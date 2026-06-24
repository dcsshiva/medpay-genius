import React, { useState } from 'react';
import { useVersionInfo } from '@/hooks/useVersionInfo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, GitBranch, Hash, Monitor } from 'lucide-react';
import { formatFullDateTimeIST } from '@/lib/dateUtils';

const VersionDisplay: React.FC = () => {
  const versionInfo = useVersionInfo();
  const [detailsOpen, setDetailsOpen] = useState(false);


  return (
    <>
      <div className="fixed bottom-4 left-4 z-50">
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogTrigger asChild>
            <div className="bg-muted/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg cursor-pointer hover:bg-muted/90 transition-colors">
              <p className="text-xs font-medium text-muted-foreground">
                HMS v{versionInfo.version}
              </p>
              <p className="text-[10px] leading-tight text-muted-foreground/80">
                {formatFullDateTimeIST(versionInfo.buildDate)}
              </p>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Version Information
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Version</p>
                  <p className="text-lg font-semibold">{versionInfo.version}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Environment</p>
                  <Badge variant={versionInfo.environment === 'production' ? 'default' : 'secondary'}>
                    {versionInfo.environment}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Build Date</p>
                    <p className="text-sm">{formatFullDateTimeIST(versionInfo.buildDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <GitBranch className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Branch</p>
                    <p className="text-sm font-mono">{versionInfo.branch}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Commit</p>
                    <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {versionInfo.gitCommit.substring(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default VersionDisplay;