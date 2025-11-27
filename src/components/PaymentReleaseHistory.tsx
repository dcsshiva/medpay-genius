import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/currency';
import { formatDateTimeIST } from '@/lib/dateUtils';
import { 
  History, 
  CheckCircle, 
  Clock, 
  FileText,
  Loader2,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentRelease {
  id: string;
  payment_id: string;
  release_number: number;
  release_percentage: number;
  gross_amount: number;
  tds_percentage: number;
  tds_amount: number;
  net_amount: number;
  release_status: string;
  bank_advice_generated: boolean;
  bank_advice_generated_at: string | null;
  bank_advice_reference: string | null;
  released_at: string;
  notes: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  total_amount: number;
  gross_amount?: number;
  total_released_gross?: number;
  total_released_tds?: number;
  total_released_net?: number;
  release_count?: number;
  release_status?: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface PaymentReleaseHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  onRefresh?: () => void;
}

const PaymentReleaseHistory: React.FC<PaymentReleaseHistoryProps> = ({
  open,
  onOpenChange,
  payment,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [releases, setReleases] = useState<PaymentRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRelease, setEditingRelease] = useState<PaymentRelease | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [deleteConfirmRelease, setDeleteConfirmRelease] = useState<PaymentRelease | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (open && payment?.id) {
      fetchReleases();
    }
  }, [open, payment?.id]);

  const fetchReleases = async () => {
    if (!payment?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_releases')
        .select('*')
        .eq('payment_id', payment.id)
        .order('release_number', { ascending: true });

      if (error) throw error;
      setReleases(data || []);
    } catch (error: any) {
      console.error('Error fetching releases:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load release history"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRelease = (release: PaymentRelease) => {
    setEditingRelease(release);
    setEditNotes(release.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRelease) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('payment_releases')
        .update({ notes: editNotes })
        .eq('id', editingRelease.id);

      if (error) throw error;

      toast({
        title: "Release Updated",
        description: "Notes updated successfully"
      });

      setEditingRelease(null);
      fetchReleases();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update release"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRelease = async () => {
    if (!deleteConfirmRelease || !payment) return;

    setActionLoading(true);
    try {
      // First, delete the release
      const { error: deleteError } = await supabase
        .from('payment_releases')
        .delete()
        .eq('id', deleteConfirmRelease.id);

      if (deleteError) throw deleteError;

      // Calculate new totals
      const newReleasedGross = (payment.total_released_gross || 0) - deleteConfirmRelease.gross_amount;
      const newReleasedTds = (payment.total_released_tds || 0) - deleteConfirmRelease.tds_amount;
      const newReleasedNet = (payment.total_released_net || 0) - deleteConfirmRelease.net_amount;
      const newReleaseCount = (payment.release_count || 0) - 1;
      
      // Determine new release status
      let newReleaseStatus = 'not_started';
      if (newReleaseCount > 0) {
        const totalGross = payment.gross_amount || payment.total_amount;
        newReleaseStatus = newReleasedGross >= totalGross ? 'fully_released' : 'partial';
      }

      // Update the payment with new totals
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          total_released_gross: Math.max(0, newReleasedGross),
          total_released_tds: Math.max(0, newReleasedTds),
          total_released_net: Math.max(0, newReleasedNet),
          release_count: Math.max(0, newReleaseCount),
          release_status: newReleaseStatus,
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      toast({
        title: "Release Cancelled",
        description: `Release #${deleteConfirmRelease.release_number} has been cancelled and amounts restored`
      });

      setDeleteConfirmRelease(null);
      fetchReleases();
      onRefresh?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to cancel release"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string, bankAdviceGenerated: boolean) => {
    if (bankAdviceGenerated) {
      return (
        <Badge variant="default" className="bg-success">
          <CheckCircle className="h-3 w-3 mr-1" />
          Bank Advice
        </Badge>
      );
    }
    
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!payment) return null;

  const totalGross = payment.gross_amount || payment.total_amount;
  const releasedGross = payment.total_released_gross || 0;
  const remainingGross = totalGross - releasedGross;
  const progressPercentage = totalGross > 0 ? (releasedGross / totalGross) * 100 : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Payment Release History
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Payment Summary */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">{payment.doctors?.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{payment.doctors?.doctor_code}</p>
                    </div>
                    <Badge variant={
                      payment.release_status === 'fully_released' ? 'default' :
                      payment.release_status === 'partial' ? 'secondary' : 'outline'
                    }>
                      {payment.release_status === 'fully_released' ? 'Fully Released' :
                       payment.release_status === 'partial' ? 'Partially Released' : 'Not Started'}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Release Progress</span>
                      <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Released: {formatCurrency(releasedGross)}</span>
                      <span>Remaining: {formatCurrency(remainingGross)}</span>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{payment.release_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Releases</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">
                        {formatCurrency(payment.total_released_tds || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total TDS</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(payment.total_released_net || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Net Released</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Release History Table */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : releases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No releases yet</p>
                  <p className="text-sm">Use "Part Payment" to create the first release</p>
                </div>
              ) : (
                <TooltipProvider>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">%</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">TDS</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {releases.map((release) => (
                          <TableRow key={release.id}>
                            <TableCell>
                              <Badge variant="outline">#{release.release_number}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {release.released_at 
                                ? formatDateTimeIST(release.released_at) 
                                : formatDateTimeIST(release.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              {release.release_percentage.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(release.gross_amount)}
                            </TableCell>
                            <TableCell className="text-right text-destructive">
                              -{formatCurrency(release.tds_amount)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-success">
                              {formatCurrency(release.net_amount)}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(release.release_status, release.bank_advice_generated)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Edit button - always available for notes */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditRelease(release);
                                      }}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit notes</TooltipContent>
                                </Tooltip>
                                {/* Delete button - only if bank advice not generated */}
                                {!release.bank_advice_generated ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmRelease(release);
                                        }}
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancel release</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              )}

              {/* Footer with totals */}
              {releases.length > 0 && (
                <div className="flex justify-end gap-4 text-sm p-3 bg-muted rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Total Gross: </span>
                    <span className="font-medium">{formatCurrency(releasedGross)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total TDS: </span>
                    <span className="font-medium text-destructive">
                      -{formatCurrency(payment.total_released_tds || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Net: </span>
                    <span className="font-bold text-success">
                      {formatCurrency(payment.total_released_net || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingRelease} onOpenChange={(open) => !open && setEditingRelease(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Release #{editingRelease?.release_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes for this release..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRelease(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmRelease} onOpenChange={(open) => !open && setDeleteConfirmRelease(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Release #{deleteConfirmRelease?.release_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel this release and restore the following amounts back to the payment:
              <div className="mt-3 p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Gross Amount:</span>
                  <span className="font-medium">{formatCurrency(deleteConfirmRelease?.gross_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TDS Amount:</span>
                  <span className="font-medium">{formatCurrency(deleteConfirmRelease?.tds_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Amount:</span>
                  <span className="font-medium">{formatCurrency(deleteConfirmRelease?.net_amount || 0)}</span>
                </div>
              </div>
              <p className="mt-3 text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Release</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRelease}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Release'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PaymentReleaseHistory;