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
 * Extracts the actual error body when supabase.functions.invoke returns
 * a generic "non-2xx status code" message, then provides user-friendly text.
 */
export async function handleCreateUserError(error: any, result: any, providedEmail?: string): Promise<string> {
  let errorMsg: string = result?.error || '';
  let errorCode: string | undefined = result?.code;

  // supabase.functions.invoke wraps non-2xx responses in FunctionsHttpError
  // and the JSON body is on error.context (a Response). Read it to surface
  // the real server-side message instead of the generic wrapper text.
  if (!errorMsg && error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.clone().json();
      errorMsg = body?.error || errorMsg;
      errorCode = body?.code || errorCode;
    } catch {
      try {
        const text = await error.context.clone().text();
        if (text) errorMsg = text;
      } catch { /* ignore */ }
    }
  }

  if (!errorMsg) {
    errorMsg = error?.message || 'Failed to create user';
  }

  // Friendly duplicate-email message
  if (errorCode === 'email_exists' || /email.*already.*(registered|exists)/i.test(errorMsg)) {
    if (providedEmail) {
      return `Email "${providedEmail}" is already registered. Please use a different email address.`;
    }
    return 'This email address is already registered. Please use a different email.';
  }

  return errorMsg;
}
