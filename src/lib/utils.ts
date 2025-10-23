import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validates Indian PAN number format
 * Format: AAAAA9999A (5 letters, 4 digits, 1 letter)
 */
export function validatePAN(pan: string): boolean {
  if (!pan) return true; // Optional field
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  return panRegex.test(pan);
}

/**
 * Handles errors from create-user edge function
 * Provides user-friendly error messages for duplicate email addresses
 */
export function handleCreateUserError(error: any, result: any, providedEmail?: string): string {
  const errorMsg = result?.error || error?.message || 'Failed to create user';
  const errorCode = result?.code;
  
  // Check for duplicate email error
  if (errorCode === 'email_exists' || /email.*already.*(registered|exists)/i.test(errorMsg)) {
    if (providedEmail) {
      return `Email "${providedEmail}" is already registered. Please use a different email address.`;
    }
    return 'This email address is already registered. Please use a different email.';
  }
  
  return errorMsg;
}
