import { useMemo } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';

/**
 * Hook to dynamically generate available years based on actual data.
 * Ensures future-proof year selection without hardcoding.
 * 
 * Sources checked:
 * - PDFCP: year_start, year_end (includes all intermediate years)
 * - Activities: date field
 * - Conflicts: date_reported field
 * 
 * Returns years sorted descending (newest first), includes current year,
 * and optionally future years if data exists.
 */
export const useDynamicYears = () => {
  const { getPdfcs, getActivities, getConflicts } = useDatabase();

  const result = useMemo(() => {
    const currentYear = new Date().getFullYear(); // e.g., 2026
    const yearsSet = new Set<number>();

    // Always include current year (2026, 2027, etc.)
    yearsSet.add(currentYear);

    // Add years from PDFCP programs (year_start to year_end range)
    const pdfcs = getPdfcs();
    pdfcs.forEach(p => {
      if (p.year_start) yearsSet.add(p.year_start);
      if (p.year_end) yearsSet.add(p.year_end);
      // Include ALL intermediate years in the PDFCP range
      if (p.year_start && p.year_end) {
        for (let y = p.year_start; y <= p.year_end; y++) {
          yearsSet.add(y);
        }
      }
    });

    // Add years from activities (using 'date' field from DatabaseContext)
    const activities = getActivities();
    activities.forEach(a => {
      if (a.date) {
        const year = new Date(a.date).getFullYear();
        if (year >= 2020 && year <= currentYear + 10) { // Extended range for future planning
          yearsSet.add(year);
        }
      }
    });

    // Add years from conflicts (using 'date_reported' field from DatabaseContext)
    const conflicts = getConflicts();
    conflicts.forEach(c => {
      if (c.date_reported) {
        const year = new Date(c.date_reported).getFullYear();
        if (year >= 2020 && year <= currentYear + 10) {
          yearsSet.add(year);
        }
      }
    });

    // Baseline: ensure 2021 to current year is always available
    for (let y = 2021; y <= currentYear; y++) {
      yearsSet.add(y);
    }

    // Sort descending (newest first: 2026, 2025, 2024...)
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    const yearsAsStrings = sortedYears.map(y => y.toString());

    // Determine default: current year if data exists, else latest available
    const hasDataForCurrentYear = pdfcs.some(p => 
      (p.year_start && p.year_start <= currentYear && p.year_end && p.year_end >= currentYear)
    ) || activities.some(a => a.date && new Date(a.date).getFullYear() === currentYear)
      || conflicts.some(c => c.date_reported && new Date(c.date_reported).getFullYear() === currentYear);

    const defaultYear = hasDataForCurrentYear 
      ? currentYear.toString() 
      : yearsAsStrings[0] || currentYear.toString();

    return {
      years: yearsAsStrings,
      currentYear: currentYear.toString(),
      defaultYear,
    };
  }, [getPdfcs, getActivities, getConflicts]);

  return result;
};

export default useDynamicYears;
