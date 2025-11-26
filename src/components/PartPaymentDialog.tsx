import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { calculateTDS, TDS_RATE } from '@/lib/tdsUtils';
import { 
  Calculator, 
  Percent, 
  IndianRupee, 
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

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

interface PartPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  onSuccess: () => void;
}

const PartPaymentDialog: React.FC<PartPaymentDialogProps> = ({
  open,
  onOpenChange,
  payment,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [releasePercentage, setReleasePercentage] = useState(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate remaining amount from the payment
  const calculations = useMemo(() => {
    if (!payment) return null;

    const totalGross = payment.gross_amount || payment.total_amount;
    const alreadyReleasedGross = payment.total_released_gross || 0;
    const remainingGross = totalGross - alreadyReleasedGross;

    let releaseGross: number;
    if (useCustomAmount && customAmount) {
      releaseGross = parseFloat(customAmount) || 0;
      // Ensure custom amount doesn't exceed remaining
      releaseGross = Math.min(releaseGross, remainingGross);
    } else {
      releaseGross = remainingGross * (releasePercentage / 100);
    }

    const tds = calculateTDS(releaseGross);
    const effectivePercentage = remainingGross > 0 
      ? (releaseGross / remainingGross) * 100 
      : 0;

    return {
      totalGross,
      alreadyReleasedGross,
      alreadyReleasedTds: payment.total_released_tds || 0,
      alreadyReleasedNet: payment.total_released_net || 0,
      remainingGross,
      releaseGross,
      releaseTds: tds.tdsAmount,
      releaseNet: tds.netAmount,
      effectivePercentage,
      releaseCount: (payment.release_count || 0) + 1,
      afterReleaseRemaining: remainingGross - releaseGross,
    };
  }, [payment, releasePercentage, customAmount, useCustomAmount]);

  const handleSubmit = async () => {
    if (!payment || !calculations || calculations.releaseGross <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid release amount"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create the payment release record
      const { error: releaseError } = await supabase
        .from('payment_releases')
        .insert({
          payment_id: payment.id,
          release_number: calculations.releaseCount,
          release_percentage: calculations.effectivePercentage,
          gross_amount: calculations.releaseGross,
          tds_percentage: TDS_RATE * 100,
          tds_amount: calculations.releaseTds,
          net_amount: calculations.releaseNet,
          release_status: 'pending',
          released_by: user?.id,
          released_at: new Date().toISOString(),
          notes: notes || null,
        });

      if (releaseError) throw releaseError;

      // Update the payment record with new totals
      const newReleaseStatus = calculations.afterReleaseRemaining <= 0 
        ? 'fully_released' 
        : 'partial';

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          total_released_gross: (payment.total_released_gross || 0) + calculations.releaseGross,
          total_released_tds: (payment.total_released_tds || 0) + calculations.releaseTds,
          total_released_net: (payment.total_released_net || 0) + calculations.releaseNet,
          release_count: calculations.releaseCount,
          release_status: newReleaseStatus,
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      toast({
        title: "Part Payment Created",
        description: `Release #${calculations.releaseCount} of ${formatCurrency(calculations.releaseNet)} (net) created successfully`
      });

      // Reset form and close
      setReleasePercentage(50);
      setCustomAmount('');
      setUseCustomAmount(false);
      setNotes('');
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      console.error('Error creating part payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create part payment"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const quickPercentages = [25, 50, 75, 100];

  if (!payment || !calculations) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Part Payment Release
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Doctor Info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">{payment.doctors?.profiles?.full_name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{payment.doctors?.doctor_code}</p>
            </div>
            <Badge variant={payment.release_count ? 'secondary' : 'outline'}>
              Release #{calculations.releaseCount}
            </Badge>
          </div>

          {/* Current Status Summary */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Gross Amount</span>
                <span className="font-medium">{formatCurrency(calculations.totalGross)}</span>
              </div>
              {calculations.alreadyReleasedGross > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Released</span>
                  <span className="font-medium text-success">{formatCurrency(calculations.alreadyReleasedGross)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Remaining to Release</span>
                <span className="font-bold text-primary">{formatCurrency(calculations.remainingGross)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Release Amount Selection */}
          <div className="space-y-3">
            <Label>Release Amount</Label>
            
            {/* Toggle between percentage and custom */}
            <div className="flex gap-2">
              <Button
                variant={!useCustomAmount ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseCustomAmount(false)}
              >
                <Percent className="h-4 w-4 mr-1" />
                By Percentage
              </Button>
              <Button
                variant={useCustomAmount ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseCustomAmount(true)}
              >
                <IndianRupee className="h-4 w-4 mr-1" />
                Custom Amount
              </Button>
            </div>

            {!useCustomAmount ? (
              <div className="space-y-3">
                {/* Quick percentage buttons */}
                <div className="flex gap-2">
                  {quickPercentages.map((pct) => (
                    <Button
                      key={pct}
                      variant={releasePercentage === pct ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReleasePercentage(pct)}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>

                {/* Slider for fine control */}
                <div className="space-y-2">
                  <Slider
                    value={[releasePercentage]}
                    onValueChange={(value) => setReleasePercentage(value[0])}
                    min={1}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1%</span>
                    <span className="font-medium text-foreground">{releasePercentage}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Enter amount to release"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  max={calculations.remainingGross}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: {formatCurrency(calculations.remainingGross)}
                </p>
              </div>
            )}
          </div>

          {/* Release Preview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                This Release
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Amount ({calculations.effectivePercentage.toFixed(1)}%)</span>
                  <span className="font-medium">{formatCurrency(calculations.releaseGross)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>TDS Deduction (10%)</span>
                  <span>-{formatCurrency(calculations.releaseTds)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Net Payable</span>
                  <span className="text-success">{formatCurrency(calculations.releaseNet)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* After release info */}
          {calculations.afterReleaseRemaining > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>
                After this release: {formatCurrency(calculations.afterReleaseRemaining)} remaining
              </span>
            </div>
          )}

          {calculations.afterReleaseRemaining <= 0 && calculations.releaseGross > 0 && (
            <div className="flex items-center gap-2 text-sm text-success p-2 bg-success/10 rounded">
              <CheckCircle className="h-4 w-4" />
              <span>This will complete the full payment release</span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes for this release..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || calculations.releaseGross <= 0}
          >
            {submitting ? 'Creating...' : `Release ${formatCurrency(calculations.releaseNet)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartPaymentDialog;
