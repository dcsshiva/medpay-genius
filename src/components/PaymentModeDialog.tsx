import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Banknote, FileCheck, Calendar } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export type PaymentMode = 'bank' | 'cash' | 'cheque';

export interface ChequeDetails {
  cheque_number: string;
  cheque_date: string;
  cheque_bank_name: string;
}

interface PaymentModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: PaymentMode, chequeDetails?: ChequeDetails) => void;
  selectedCount: number;
  totalAmount: number;
  isLoading?: boolean;
}

const paymentModes = [
  {
    value: 'bank' as PaymentMode,
    label: 'Bank Transfer (NEFT/RTGS)',
    description: 'Generate GEFU file for bank processing',
    icon: Building2,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    value: 'cash' as PaymentMode,
    label: 'Cash Payment',
    description: 'Record as cash transaction (no file generated)',
    icon: Banknote,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  {
    value: 'cheque' as PaymentMode,
    label: 'Cheque Issue',
    description: 'Record cheque payment with details',
    icon: FileCheck,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
];

export const PaymentModeDialog = ({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  totalAmount,
  isLoading = false,
}: PaymentModeDialogProps) => {
  const isMobile = useIsMobile();
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('bank');
  const [chequeDetails, setChequeDetails] = useState<ChequeDetails>({
    cheque_number: '',
    cheque_date: '',
    cheque_bank_name: '',
  });

  const handleConfirm = () => {
    if (selectedMode === 'cheque') {
      if (!chequeDetails.cheque_number.trim() || !chequeDetails.cheque_date) {
        return;
      }
      onConfirm(selectedMode, chequeDetails);
    } else {
      onConfirm(selectedMode);
    }
  };

  const resetState = () => {
    setSelectedMode('bank');
    setChequeDetails({ cheque_number: '', cheque_date: '', cheque_bank_name: '' });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const isChequeValid = selectedMode !== 'cheque' || 
    (chequeDetails.cheque_number.trim() && chequeDetails.cheque_date);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const Content = (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
        <div>
          <p className="text-sm text-muted-foreground">Selected Payments</p>
          <p className="text-xl font-bold">{selectedCount}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Payment Mode Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Select Payment Mode</Label>
        <RadioGroup
          value={selectedMode}
          onValueChange={(value) => setSelectedMode(value as PaymentMode)}
          className="space-y-3"
        >
          {paymentModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.value;
            return (
              <Card
                key={mode.value}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? `${mode.borderColor} ${mode.bgColor} ring-2 ring-offset-2 ring-primary`
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedMode(mode.value)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <RadioGroupItem value={mode.value} id={mode.value} className="sr-only" />
                  <div className={`p-2 rounded-lg ${mode.bgColor}`}>
                    <Icon className={`h-6 w-6 ${mode.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{mode.label}</p>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/50'
                  }`}>
                    {isSelected && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </RadioGroup>
      </div>

      {/* Cheque Details (conditional) */}
      {selectedMode === 'cheque' && (
        <div className="space-y-4 p-4 rounded-lg border bg-orange-50/50 dark:bg-orange-950/50">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <FileCheck className="h-5 w-5" />
            <Label className="text-base font-semibold">Cheque Details</Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cheque_number">Cheque Number *</Label>
              <Input
                id="cheque_number"
                placeholder="Enter cheque number"
                value={chequeDetails.cheque_number}
                onChange={(e) => setChequeDetails(prev => ({ ...prev, cheque_number: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cheque_date">Cheque Date *</Label>
              <div className="relative">
                <Input
                  id="cheque_date"
                  type="date"
                  value={chequeDetails.cheque_date}
                  onChange={(e) => setChequeDetails(prev => ({ ...prev, cheque_date: e.target.value }))}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cheque_bank_name">Cheque Bank Name (Optional)</Label>
              <Input
                id="cheque_bank_name"
                placeholder="Bank name on cheque"
                value={chequeDetails.cheque_bank_name}
                onChange={(e) => setChequeDetails(prev => ({ ...prev, cheque_bank_name: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const Footer = (
    <div className="flex gap-3 justify-end">
      <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
        Cancel
      </Button>
      <Button onClick={handleConfirm} disabled={!isChequeValid || isLoading}>
        {isLoading ? 'Processing...' : 'Confirm'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Select Payment Mode</SheetTitle>
            <SheetDescription>
              Choose how you want to process the selected payments
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            {Content}
          </div>
          <SheetFooter className="pt-4">
            {Footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Payment Mode</DialogTitle>
          <DialogDescription>
            Choose how you want to process the selected payments
          </DialogDescription>
        </DialogHeader>
        {Content}
        <DialogFooter>
          {Footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
