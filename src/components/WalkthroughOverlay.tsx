import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, X, Lightbulb } from 'lucide-react';
import type { WalkthroughStep } from '@/hooks/useWalkthrough';

interface WalkthroughOverlayProps {
  isActive: boolean;
  currentStep: WalkthroughStep | null;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;

const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStep) return;

    const updatePosition = () => {
      const el = document.querySelector(`[data-walkthrough="${currentStep.target}"]`);
      if (!el) {
        setTargetRect(null);
        return;
      }

      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      // Scroll element into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // Initial + debounced resize
    updatePosition();
    const resizeHandler = () => updatePosition();
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('scroll', resizeHandler, true);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler, true);
    };
  }, [isActive, currentStep]);

  // Position tooltip relative to target
  useEffect(() => {
    if (!targetRect || !currentStep) return;

    const pos = currentStep.position || 'right';
    const style: React.CSSProperties = { position: 'fixed', zIndex: 10002, maxWidth: 320 };

    switch (pos) {
      case 'right':
        style.top = targetRect.top;
        style.left = targetRect.left + targetRect.width + PADDING + TOOLTIP_GAP;
        break;
      case 'bottom':
        style.top = targetRect.top + targetRect.height + PADDING + TOOLTIP_GAP;
        style.left = targetRect.left;
        break;
      case 'left':
        style.top = targetRect.top;
        style.right = window.innerWidth - targetRect.left + TOOLTIP_GAP;
        break;
      case 'top':
        style.bottom = window.innerHeight - targetRect.top + TOOLTIP_GAP;
        style.left = Math.max(16, targetRect.left - 100);
        break;
    }

    // Clamp to viewport
    if (style.left && typeof style.left === 'number') {
      style.left = Math.min(style.left, window.innerWidth - 340);
      style.left = Math.max(16, style.left);
    }
    if (style.top && typeof style.top === 'number') {
      style.top = Math.min(style.top, window.innerHeight - 200);
      style.top = Math.max(16, style.top);
    }

    setTooltipStyle(style);
  }, [targetRect, currentStep]);

  if (!isActive || !currentStep) return null;

  const spotlightClipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${targetRect.left - PADDING}px ${targetRect.top - PADDING}px,
        ${targetRect.left - PADDING}px ${targetRect.top + targetRect.height + PADDING}px,
        ${targetRect.left + targetRect.width + PADDING}px ${targetRect.top + targetRect.height + PADDING}px,
        ${targetRect.left + targetRect.width + PADDING}px ${targetRect.top - PADDING}px,
        ${targetRect.left - PADDING}px ${targetRect.top - PADDING}px
      )`
    : undefined;

  return createPortal(
    <>
      {/* Backdrop with spotlight cutout */}
      <div
        className="fixed inset-0 z-[10000] transition-all duration-300"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          clipPath: spotlightClipPath,
        }}
        onClick={onSkip}
      />

      {/* Spotlight border glow */}
      {targetRect && (
        <div
          className="fixed z-[10001] rounded-lg border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.2)] transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - PADDING,
            left: targetRect.left - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
          }}
        />
      )}

      {/* Tooltip card */}
      <div ref={tooltipRef} style={tooltipStyle} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <Card className="border-primary/50 shadow-xl bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-semibold text-foreground text-sm">{currentStep.title}</h3>
              </div>
              <button
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {currentStepIndex + 1} of {totalSteps}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-xs h-7 px-2"
                >
                  Skip tour
                </Button>
                {currentStepIndex > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onNext}
                  className="h-7 px-3 text-xs"
                >
                  {currentStepIndex === totalSteps - 1 ? 'Done' : 'Next'}
                  {currentStepIndex < totalSteps - 1 && <ChevronRight className="h-3 w-3 ml-1" />}
                </Button>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 pt-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === currentStepIndex
                      ? 'w-4 bg-primary'
                      : i < currentStepIndex
                      ? 'w-1.5 bg-primary/50'
                      : 'w-1.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>,
    document.body
  );
};

export default WalkthroughOverlay;
