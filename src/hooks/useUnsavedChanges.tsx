import { useEffect, useCallback, useRef } from 'react';

interface UnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  onClear?: () => void;
}

export const useUnsavedChanges = ({ hasUnsavedChanges, onClear }: UnsavedChangesOptions) => {
  const clearCallbackRef = useRef(onClear);
  
  // Update ref when callback changes
  useEffect(() => {
    clearCallbackRef.current = onClear;
  }, [onClear]);

  // Handle session timeout clear event
  useEffect(() => {
    const handleClearUnsavedData = () => {
      if (hasUnsavedChanges && clearCallbackRef.current) {
        clearCallbackRef.current();
      }
    };

    window.addEventListener('clearUnsavedData', handleClearUnsavedData);
    
    return () => {
      window.removeEventListener('clearUnsavedData', handleClearUnsavedData);
    };
  }, [hasUnsavedChanges]);

  // Warn before page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const clearUnsavedChanges = useCallback(() => {
    if (clearCallbackRef.current) {
      clearCallbackRef.current();
    }
  }, []);

  return {
    clearUnsavedChanges
  };
};