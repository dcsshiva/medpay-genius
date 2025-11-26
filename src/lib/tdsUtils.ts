/**
 * TDS (Tax Deducted at Source) Utility Functions
 */

export const TDS_RATE = 0.10; // 10% TDS

export interface TDSCalculation {
  grossAmount: number;
  tdsAmount: number;
  tdsPercentage: number;
  netAmount: number;
}

export interface PartPaymentCalculation extends TDSCalculation {
  releasePercentage: number;
  remainingGross: number;
  remainingAfterRelease: number;
}

/**
 * Calculate TDS breakdown for a given amount
 */
export const calculateTDS = (amount: number, tdsRate: number = TDS_RATE): TDSCalculation => {
  const grossAmount = amount;
  const tdsAmount = grossAmount * tdsRate;
  const netAmount = grossAmount - tdsAmount;
  
  return {
    grossAmount,
    tdsAmount,
    tdsPercentage: tdsRate * 100,
    netAmount
  };
};

/**
 * Calculate part payment (partial release) with TDS
 * @param totalGross - Total gross amount of the payment
 * @param alreadyReleasedGross - Amount already released
 * @param releasePercentage - Percentage of remaining to release (1-100)
 * @param tdsRate - TDS rate (default 10%)
 */
export const calculatePartPayment = (
  totalGross: number,
  alreadyReleasedGross: number,
  releasePercentage: number,
  tdsRate: number = TDS_RATE
): PartPaymentCalculation => {
  const remainingGross = totalGross - alreadyReleasedGross;
  const releaseGross = remainingGross * (releasePercentage / 100);
  const tdsAmount = releaseGross * tdsRate;
  const netAmount = releaseGross - tdsAmount;
  
  return {
    grossAmount: releaseGross,
    tdsAmount,
    tdsPercentage: tdsRate * 100,
    netAmount,
    releasePercentage,
    remainingGross,
    remainingAfterRelease: remainingGross - releaseGross
  };
};

/**
 * Calculate part payment by fixed amount
 * @param totalGross - Total gross amount of the payment
 * @param alreadyReleasedGross - Amount already released  
 * @param releaseAmount - Fixed amount to release
 * @param tdsRate - TDS rate (default 10%)
 */
export const calculatePartPaymentByAmount = (
  totalGross: number,
  alreadyReleasedGross: number,
  releaseAmount: number,
  tdsRate: number = TDS_RATE
): PartPaymentCalculation => {
  const remainingGross = totalGross - alreadyReleasedGross;
  // Ensure release amount doesn't exceed remaining
  const releaseGross = Math.min(releaseAmount, remainingGross);
  const releasePercentage = remainingGross > 0 ? (releaseGross / remainingGross) * 100 : 0;
  const tdsAmount = releaseGross * tdsRate;
  const netAmount = releaseGross - tdsAmount;
  
  return {
    grossAmount: releaseGross,
    tdsAmount,
    tdsPercentage: tdsRate * 100,
    netAmount,
    releasePercentage,
    remainingGross,
    remainingAfterRelease: remainingGross - releaseGross
  };
};

/**
 * Get financial year for a given date (April to March)
 * Returns format like "2024-25"
 */
export const getFinancialYear = (date: Date = new Date()): string => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  if (month >= 3) { // April onwards (month 3 = April, 0-indexed)
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

/**
 * Get financial year start date
 */
export const getFinancialYearStart = (date: Date = new Date()): Date => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  if (month >= 3) { // April onwards
    return new Date(year, 3, 1); // April 1st current year
  } else {
    return new Date(year - 1, 3, 1); // April 1st previous year
  }
};

/**
 * Get financial year end date
 */
export const getFinancialYearEnd = (date: Date = new Date()): Date => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  if (month >= 3) { // April onwards
    return new Date(year + 1, 2, 31); // March 31st next year
  } else {
    return new Date(year, 2, 31); // March 31st current year
  }
};

/**
 * Get quarter for a given date (Q1-Q4 based on financial year)
 * Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
 */
export const getQuarter = (date: Date = new Date()): string => {
  const month = date.getMonth();
  
  if (month >= 3 && month <= 5) return 'Q1'; // Apr-Jun
  if (month >= 6 && month <= 8) return 'Q2'; // Jul-Sep
  if (month >= 9 && month <= 11) return 'Q3'; // Oct-Dec
  return 'Q4'; // Jan-Mar
};

/**
 * Get quarter date range
 */
export const getQuarterDateRange = (
  financialYear: string,
  quarter: string
): { startDate: Date; endDate: Date } => {
  const [startYear] = financialYear.split('-');
  const year = parseInt(startYear);
  
  const quarterMap = {
    Q1: { start: [year, 3, 1], end: [year, 5, 30] },      // Apr-Jun
    Q2: { start: [year, 6, 1], end: [year, 8, 30] },      // Jul-Sep
    Q3: { start: [year, 9, 1], end: [year, 11, 31] },     // Oct-Dec
    Q4: { start: [year + 1, 0, 1], end: [year + 1, 2, 31] } // Jan-Mar
  };
  
  const range = quarterMap[quarter as keyof typeof quarterMap];
  
  return {
    startDate: new Date(range.start[0], range.start[1], range.start[2]),
    endDate: new Date(range.end[0], range.end[1], range.end[2])
  };
};

/**
 * Generate TDS certificate number
 * Format: TDS/FY/QUARTER/DOCTORCODE/SEQUENCE
 */
export const generateCertificateNumber = (
  financialYear: string,
  quarter: string,
  doctorCode: string,
  sequence: number
): string => {
  return `TDS/${financialYear}/${quarter}/${doctorCode}/${String(sequence).padStart(3, '0')}`;
};

/**
 * Get all financial years for dropdown (last 5 years)
 */
export const getFinancialYearOptions = (): string[] => {
  const currentDate = new Date();
  const currentFY = getFinancialYear(currentDate);
  const [startYear] = currentFY.split('-');
  const year = parseInt(startYear);
  
  const years: string[] = [];
  for (let i = 0; i < 5; i++) {
    const y = year - i;
    years.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  
  return years;
};

/**
 * Get all quarters
 */
export const getQuarterOptions = (): string[] => {
  return ['Q1', 'Q2', 'Q3', 'Q4'];
};
