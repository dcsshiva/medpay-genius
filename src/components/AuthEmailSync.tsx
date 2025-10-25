import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Search, CheckCircle, XCircle, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailMismatch {
  type: 'staff' | 'doctor';
  id: string;
  name: string;
  table_email: string;
  auth_email: string | null;
  user_id: string;
}

interface SyncResult {
  success: boolean;
  user_id: string;
  type: 'staff' | 'doctor';
  name: string;
  old_email: string | null;
  new_email: string;
  error?: string;
}

export const AuthEmailSync = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mismatches, setMismatches] = useState<EmailMismatch[]>([]);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setSyncResults([]);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No active session');
        return;
      }

      const response = await supabase.functions.invoke('sync-auth-emails', {
        body: { mode: 'analyze' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const { mismatches: foundMismatches, total } = response.data;
      setMismatches(foundMismatches);

      if (total === 0) {
        toast.success('No email mismatches found! All emails are synchronized.');
      } else {
        toast.info(`Found ${total} email mismatch${total === 1 ? '' : 'es'}`);
      }
    } catch (error) {
      console.error('Error analyzing emails:', error);
      toast.error('Failed to analyze emails. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No active session');
        return;
      }

      const response = await supabase.functions.invoke('sync-auth-emails', {
        body: { mode: 'sync' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const { results, summary } = response.data;
      setSyncResults(results);

      if (summary.failed === 0) {
        toast.success(`Successfully synchronized ${summary.successful} email${summary.successful === 1 ? '' : 's'}`);
      } else {
        toast.warning(`Synchronized ${summary.successful} emails, ${summary.failed} failed`);
      }

      // Clear mismatches after successful sync
      setMismatches([]);
    } catch (error) {
      console.error('Error syncing emails:', error);
      toast.error('Failed to sync emails. Please try again.');
    } finally {
      setIsSyncing(false);
      setShowSyncDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Authentication Email Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">About Email Synchronization</h4>
            <p className="text-sm text-muted-foreground">
              This tool ensures that authentication emails in Supabase Auth match the emails 
              stored in your staff and doctor records. Email mismatches can prevent OTP login 
              from working correctly.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isSyncing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Emails'}
            </Button>

            {mismatches.length > 0 && (
              <Button
                onClick={() => setShowSyncDialog(true)}
                disabled={isSyncing}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Now ({mismatches.length})
              </Button>
            )}
          </div>

          {mismatches.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Email Mismatches Found</h3>
                <Badge variant="secondary">{mismatches.length}</Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Current Auth Email</TableHead>
                      <TableHead>Should Be</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mismatches.map((mismatch) => (
                      <TableRow key={mismatch.user_id}>
                        <TableCell>
                          <Badge variant="outline">
                            {mismatch.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{mismatch.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {mismatch.auth_email || '(none)'}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {mismatch.table_email}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {syncResults.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">Sync Results</h3>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Old Email</TableHead>
                      <TableHead>New Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncResults.map((result) => (
                      <TableRow key={result.user_id}>
                        <TableCell>
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {result.old_email || '(none)'}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {result.new_email}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Email Synchronization</AlertDialogTitle>
            <AlertDialogDescription>
              This will update {mismatches.length} authentication email{mismatches.length === 1 ? '' : 's'} in Supabase Auth 
              to match the emails in your staff/doctor records.
              <br /><br />
              <strong>This action will:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Update email addresses in authentication records</li>
                <li>Enable OTP login for affected users</li>
                <li>Not affect passwords or other user data</li>
              </ul>
              <br />
              Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync Emails'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
