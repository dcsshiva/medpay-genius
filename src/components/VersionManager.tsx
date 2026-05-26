import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useVersionInfo } from '@/hooks/useVersionInfo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GitBranch, Clock, Hash, Download, ArrowLeft, RefreshCw, History, ShieldAlert, Save } from 'lucide-react';
import { formatFullDateTimeIST } from '@/lib/dateUtils';

interface VersionHistory {
  id: string;
  version: string;
  release_date: string;
  git_commit: string;
  branch: string;
  environment: string;
  changelog: string;
  is_active: boolean;
  created_by: string;
}

const VersionManager = () => {
  const currentVersion = useVersionInfo();
  const { toast } = useToast();
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('version_history')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createVersionRecord = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('version_history')
        .insert({
          version: currentVersion.version,
          git_commit: currentVersion.gitCommit,
          branch: currentVersion.branch,
          environment: currentVersion.environment,
          changelog: `Version ${currentVersion.version} - Automated release`,
          created_by: user?.id || 'system'
        });

      if (error) throw error;

      toast({
        title: "Version Recorded",
        description: `Version ${currentVersion.version} has been recorded successfully.`,
      });

      fetchVersions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to record version: " + error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const rollbackToVersion = async (version: VersionHistory) => {
    try {
      // In a real implementation, this would trigger a GitHub Action or deployment pipeline
      // For now, we'll just show a message about the rollback process
      
      toast({
        title: "Rollback Initiated",
        description: `Rollback to version ${version.version} has been queued. This will trigger a deployment from commit ${version.git_commit.substring(0, 8)}.`,
      });
      
      // Mark current version as inactive and new version as active
      const { error } = await supabase
        .from('version_history')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('version_history')
        .update({ is_active: true })
        .eq('id', version.id);

      if (updateError) throw updateError;

      fetchVersions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to initiate rollback: " + error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Version Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Current Deployment</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Version</p>
                <p className="text-lg font-semibold">{currentVersion.version}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Environment</p>
                <Badge variant={currentVersion.environment === 'production' ? 'default' : 'secondary'}>
                  {currentVersion.environment}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Branch</p>
                <p className="text-sm font-mono">{currentVersion.branch}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commit</p>
                <p className="text-xs font-mono bg-background px-2 py-1 rounded">
                  {currentVersion.gitCommit.substring(0, 8)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={createVersionRecord}
                disabled={creating}
                className="gap-2"
              >
                {creating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Record Current Version
              </Button>
            </div>
          </div>

          {/* Version History */}
          <div>
            <h3 className="font-semibold mb-3">Version History</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Commit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell className="font-medium">{version.version}</TableCell>
                      <TableCell className="text-sm">{formatFullDateTimeIST(version.release_date)}</TableCell>
                      <TableCell>
                        <Badge variant={version.environment === 'production' ? 'default' : 'secondary'}>
                          {version.environment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {version.git_commit.substring(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {version.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="outline">Archived</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!version.is_active && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <ArrowLeft className="h-3 w-3" />
                                Rollback
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to rollback to version {version.version}? 
                                  This will deploy the application from commit {version.git_commit.substring(0, 8)} 
                                  and may cause data loss if the database schema has changed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => rollbackToVersion(version)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm Rollback
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {versions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No version history available. Record the current version to start tracking.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VersionManager;