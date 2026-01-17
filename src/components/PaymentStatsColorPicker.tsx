import React, { useState, useEffect } from 'react';
import { Palette, RotateCcw, CheckCircle, Clock, Wallet, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  usePaymentStatsColors, 
  PaymentStatsColors, 
  COLOR_OPTIONS, 
  DEFAULT_COLORS 
} from '@/hooks/usePaymentStatsColors';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface ColorSelectorProps {
  label: string;
  icon: React.ReactNode;
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ 
  label, 
  icon, 
  selectedColor, 
  onColorChange 
}) => {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </Label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Select color for ${label}`}>
        {COLOR_OPTIONS.map((color) => (
          <TooltipProvider key={color.class}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onColorChange(color.class)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center justify-center",
                    color.bgClass,
                    selectedColor === color.class 
                      ? "border-foreground ring-2 ring-foreground" 
                      : "border-transparent hover:border-muted-foreground"
                  )}
                  aria-label={color.name}
                  aria-checked={selectedColor === color.class}
                  role="radio"
                >
                  {selectedColor === color.class && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{color.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
};

interface PaymentStatsColorPickerProps {
  variant?: 'icon' | 'full';
  className?: string;
}

export const PaymentStatsColorPicker: React.FC<PaymentStatsColorPickerProps> = ({ 
  variant = 'icon',
  className 
}) => {
  const { colors, updateColors } = usePaymentStatsColors();
  const [isOpen, setIsOpen] = useState(false);
  const [tempColors, setTempColors] = useState<PaymentStatsColors>(colors);

  // Sync tempColors when dialog opens or colors change
  useEffect(() => {
    if (isOpen) {
      setTempColors(colors);
    }
  }, [isOpen, colors]);

  const handleApply = () => {
    updateColors(tempColors);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempColors(DEFAULT_COLORS);
  };

  const handleCancel = () => {
    setTempColors(colors);
    setIsOpen(false);
  };

  // Sample amounts for preview
  const samplePaid = 1234567;
  const sampleUnpaid = 987654;
  const sampleTotal = samplePaid + sampleUnpaid;

  return (
    <>
      {/* Trigger Button */}
      {variant === 'icon' ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className={cn("h-9 w-9", className)}
                aria-label="Customize payment stats colors for accessibility"
                onClick={() => setIsOpen(true)}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Customize Colors (Accessibility)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button 
          variant="outline" 
          className={cn("w-full flex items-center justify-center space-x-2", className)}
          onClick={() => setIsOpen(true)}
        >
          <Palette className="h-4 w-4" />
          <span>Customize Payment Colors</span>
        </Button>
      )}

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Customize Payment Stats Colors
            </DialogTitle>
            <DialogDescription>
              Select colors that work best for your vision. Changes are saved for your account only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Color Selectors */}
            <ColorSelector
              label="Paid Amount"
              icon={<CheckCircle className={cn("h-4 w-4", tempColors.paidColor)} />}
              selectedColor={tempColors.paidColor}
              onColorChange={(color) => setTempColors(prev => ({ ...prev, paidColor: color }))}
            />

            <ColorSelector
              label="Unpaid Amount"
              icon={<Clock className={cn("h-4 w-4", tempColors.unpaidColor)} />}
              selectedColor={tempColors.unpaidColor}
              onColorChange={(color) => setTempColors(prev => ({ ...prev, unpaidColor: color }))}
            />

            <ColorSelector
              label="Total Amount"
              icon={<Wallet className={cn("h-4 w-4", tempColors.totalColor)} />}
              selectedColor={tempColors.totalColor}
              onColorChange={(color) => setTempColors(prev => ({ ...prev, totalColor: color }))}
            />

            {/* Live Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview</Label>
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className={cn("h-4 w-4", tempColors.paidColor)} />
                      <span className="text-sm font-medium">Paid</span>
                    </div>
                    <span className={cn("text-sm font-bold", tempColors.paidColor)}>
                      {formatCurrency(samplePaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className={cn("h-4 w-4", tempColors.unpaidColor)} />
                      <span className="text-sm font-medium">Unpaid</span>
                    </div>
                    <span className={cn("text-sm font-bold", tempColors.unpaidColor)}>
                      {formatCurrency(sampleUnpaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Wallet className={cn("h-4 w-4", tempColors.totalColor)} />
                      <span className="text-sm font-medium">Total</span>
                    </div>
                    <span className={cn("text-sm font-bold", tempColors.totalColor)}>
                      {formatCurrency(sampleTotal)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <div className="flex gap-2 sm:ml-auto">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
