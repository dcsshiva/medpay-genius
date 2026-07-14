import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DeleteUnpaidVisitButtonProps {
  visitId: string;
  visitCode: string;
  patientName?: string;
  amount?: number;
  onDeleted?: () => void;
  size?: 'sm' | 'icon';
  variant?: 'ghost' | 'outline' | 'destructive';
  className?: string;
  label?: string; // if set, shows text; icon-only otherwise for `size='icon'`
}

const DeleteUnpaidVisitButton: React.FC<DeleteUnpaidVisitButtonProps> = ({
  visitId,
  visitCode,
  patientName,
  amount,
  onDeleted,
  size = 'sm',
  variant = 'ghost',
  className,
  label,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (reason.trim().length < 5) {
      toast({
        title: 'Reason required',
        description: 'Please enter a reason (min 5 chars).',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)('delete_unpaid_visit', {
        _visit_id: visitId,
        _reason: reason.trim(),
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error('Delete failed');

      toast({
        title: 'Visit deleted',
        description: `${visitCode} removed successfully.`,
      });
      setOpen(false);
      setReason('');
      onDeleted?.();
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err?.message || 'Unable to delete visit.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className={cn(
            'text-destructive hover:text-destructive hover:bg-destructive/10',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Delete unpaid visit ${visitCode}`}
        >
          <Trash2 className={cn('h-4 w-4', label && 'mr-1')} />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Delete unpaid visit?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3 bg-muted/40 space-y-1">
                <div><span className="text-muted-foreground">Visit:</span> <span className="font-medium">{visitCode}</span></div>
                {patientName && (
                  <div><span className="text-muted-foreground">Patient:</span> {patientName}</div>
                )}
                {typeof amount === 'number' && (
                  <div><span className="text-muted-foreground">Amount:</span> ₹{amount.toFixed(2)}</div>
                )}
              </div>
              <p>
                This permanently removes the visit. It works for unprocessed visits
                and for processed visits whose linked payment has not yet been
                released, advised, or paid out. Linked payment totals are recomputed
                automatically; empty payments are removed.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor={`delete-reason-${visitId}`}>Reason (min 5 characters)</Label>
                <Textarea
                  id={`delete-reason-${visitId}`}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this visit being deleted?"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={busy || reason.trim().length < 5}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? 'Deleting…' : 'Delete visit'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUnpaidVisitButton;
