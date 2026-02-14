import { useState } from 'react';

interface TimeoutState {
  isWarningShown: boolean;
  isActive: boolean;
  remainingTime: number;
  lastActivity: Date;
}

export const useSessionTimeout = () => {
  const [timeoutState] = useState<TimeoutState>({
    isWarningShown: false,
    isActive: true,
    remainingTime: 9999,
    lastActivity: new Date()
  });

  return {
    timeoutState,
    extendSession: async () => {},
    clearUnsavedData: () => {},
    remainingTime: 9999
  };
};
