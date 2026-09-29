// Patient, doctor and non-payroll finance modules are retired from this remix's UI.
// Keep historical data and backend privileges unchanged.
const excluded = new Set([
  'doctors', 'doctor-hub', 'visits', 'payments',
  'cash-payments', 'cash-payments-lite',
  'insurance-payments', 'insurance-payments-lite',
  'quick-payment', 'quick-payment-report',
  'bank-advice-generation', 'bank-advice-generation-beta',
  'bank-advice-history', 'bank-advice-records',
  'bank-advice-payment-report', 'quick-payment-bank-advice-report',
  'tds-reports', 'vendor-reports',
]);

export const isStaffOnlyScreen = (screen: string): boolean => !excluded.has(screen);
export const staffOnlyTab = (screen: string): string => isStaffOnlyScreen(screen) ? screen : 'dashboard';