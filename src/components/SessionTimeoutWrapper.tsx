import React, { useEffect } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/lib/auth';

interface SessionTimeoutWrapperProps {
  children: React.ReactNode;
}

export const SessionTimeoutWrapper: React.FC<SessionTimeoutWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const { timeoutState, remainingTime } = useSessionTimeout();

  // Add event listener for clearing unsaved data
  useEffect(() => {
    const handleClearUnsavedData = () => {
      // Clear any component-specific unsaved data
      // Components can listen to this event and clear their state
      console.log('Clearing unsaved data due to session timeout');
    };

    window.addEventListener('clearUnsavedData', handleClearUnsavedData);
    
    return () => {
      window.removeEventListener('clearUnsavedData', handleClearUnsavedData);
    };
  }, []);

  // Only render timeout functionality for authenticated users
  if (!user) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {/* Session timeout is handled by the hook automatically */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 bg-black/80 text-white text-xs p-2 rounded">
          Session: {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
        </div>
      )}
    </>
  );
};