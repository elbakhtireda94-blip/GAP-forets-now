// Utility functions for formatting values consistently across the app

/**
 * Format a monetary value in Moroccan Dirhams (DH)
 * All internal values are assumed to be in DH
 */
export const formatDh = (amount: number): string => {
  return new Intl.NumberFormat('fr-MA', { 
    style: 'decimal', 
    maximumFractionDigits: 0 
  }).format(amount) + ' DH';
};

/**
 * Format a monetary value without the DH suffix
 */
export const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat('fr-MA', { 
    style: 'decimal', 
    maximumFractionDigits: 0 
  }).format(amount);
};

/**
 * Parse a monetary string to DH (number)
 * Handles various formats and converts to base DH
 */
export const parseMoneyToDh = (value: string | number): number => {
  if (typeof value === 'number') return value;
  
  // Remove currency symbols, spaces, and non-numeric chars except decimal separators
  const cleaned = value
    .replace(/[DH\s]/gi, '')
    .replace(/\u00a0/g, '') // non-breaking space
    .replace(/,/g, '.') // French decimal separator
    .replace(/[^\d.-]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Check if a year is within the PDFCP window
 */
export const isYearInWindow = (year: number, yearStart: number, yearEnd: number): boolean => {
  return year >= yearStart && year <= yearEnd;
};
