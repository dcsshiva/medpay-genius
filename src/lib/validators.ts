/**
 * Validates if a string is a valid 10-digit mobile number
 */
export const validateMobileNumber = (value: string): boolean => {
  return /^[0-9]{10}$/.test(value);
};

/**
 * Formats a string to contain only numeric characters, limited to 10 digits
 */
export const formatMobileNumber = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 10);
};

/**
 * Validates IFSC code format
 */
export const validateIFSCCode = (value: string): boolean => {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);
};
