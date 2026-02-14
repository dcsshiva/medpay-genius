import React from 'react';

interface SessionTimeoutWrapperProps {
  children: React.ReactNode;
}

export const SessionTimeoutWrapper: React.FC<SessionTimeoutWrapperProps> = ({ children }) => {
  return <>{children}</>;
};
