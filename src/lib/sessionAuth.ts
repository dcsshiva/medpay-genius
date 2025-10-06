/**
 * Helper functions for custom session authentication
 */

/**
 * Get session token from sessionStorage
 */
export const getSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('session_token');
};

/**
 * Get Authorization headers for edge function calls
 * Returns headers object with Bearer token for custom session authentication
 */
export const getSessionAuthHeaders = () => {
  const sessionToken = getSessionToken();
  
  if (!sessionToken) {
    throw new Error('No active session found');
  }
  
  return {
    Authorization: `Bearer ${sessionToken}`
  };
};
