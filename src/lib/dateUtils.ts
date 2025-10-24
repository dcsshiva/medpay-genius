import { format as dateFnsFormat, formatDistanceToNow as dateFnsFormatDistanceToNow } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Indian Standard Time timezone
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date/time in IST
 */
export const getCurrentISTDate = (): Date => {
  return toZonedTime(new Date(), IST_TIMEZONE);
};

/**
 * Convert any date to IST
 */
export const toIST = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, IST_TIMEZONE);
};

/**
 * Format date in IST timezone
 */
export const formatInIST = (date: Date | string, formatStr: string = 'MMM dd, yyyy'): string => {
  const istDate = toIST(date);
  return dateFnsFormat(istDate, formatStr);
};

/**
 * Format date with time in IST
 */
export const formatDateTimeIST = (date: Date | string): string => {
  return formatInIST(date, 'MMM dd, yyyy HH:mm');
};

/**
 * Format only date in IST
 */
export const formatDateIST = (date: Date | string): string => {
  return formatInIST(date, 'MMM dd, yyyy');
};

/**
 * Format for display in long format
 */
export const formatLongDateIST = (date: Date | string): string => {
  return formatInIST(date, 'EEEE, MMM dd, yyyy');
};

/**
 * Format for form inputs (yyyy-MM-dd)
 */
export const formatInputDateIST = (date: Date | string): string => {
  return formatInIST(date, 'yyyy-MM-dd');
};

/**
 * Get ISO string in IST (for database storage)
 */
export const toISOStringIST = (date?: Date): string => {
  const istDate = date ? toIST(date) : getCurrentISTDate();
  // Convert IST date back to UTC for proper ISO string
  return fromZonedTime(istDate, IST_TIMEZONE).toISOString();
};

/**
 * Format distance to now in IST
 */
export const formatDistanceToNowIST = (date: Date | string): string => {
  const istDate = toIST(date);
  return dateFnsFormatDistanceToNow(istDate, { addSuffix: true });
};

/**
 * Format for file timestamps
 */
export const formatFileTimestampIST = (): string => {
  return formatInIST(getCurrentISTDate(), 'yyyy-MM-dd_HH-mm-ss');
};

/**
 * Format for reports/exports header
 */
export const formatReportDateIST = (): string => {
  return formatInIST(getCurrentISTDate(), 'dd/MM/yyyy');
};

/**
 * Format for detailed timestamps with timezone indicator
 */
export const formatFullDateTimeIST = (date: Date | string): string => {
  return formatInIST(date, 'PPpp') + ' IST';
};

/**
 * Get the minimum selectable date for leave applications
 * After 11:59 PM IST, minimum date moves to day after tomorrow
 * Before 11:59 PM IST, minimum date is tomorrow
 */
export const getMinLeaveDate = (): Date => {
  const nowIST = getCurrentISTDate();
  const currentHour = nowIST.getHours();
  const currentMinute = nowIST.getMinutes();
  
  // After 11:59 PM (23:59), need to apply for day after tomorrow
  const daysToAdd = (currentHour === 23 && currentMinute >= 59) ? 2 : 1;
  
  const minDate = new Date(nowIST);
  minDate.setDate(minDate.getDate() + daysToAdd);
  minDate.setHours(0, 0, 0, 0); // Start of day
  
  return minDate;
};

/**
 * Get the maximum selectable date (15 days from now in IST)
 */
export const getMaxLeaveDate = (): Date => {
  const nowIST = getCurrentISTDate();
  const maxDate = new Date(nowIST);
  maxDate.setDate(maxDate.getDate() + 15);
  maxDate.setHours(23, 59, 59, 999); // End of day
  
  return maxDate;
};

/**
 * Check if a date is selectable for leave application
 */
export const isDateSelectableForLeave = (date: Date): boolean => {
  const minDate = getMinLeaveDate();
  const maxDate = getMaxLeaveDate();
  
  return date >= minDate && date <= maxDate;
};
