import { useMemo } from 'react';
import { CahierJournalEntry, JournalCategory, journalCategoryLabels } from '@/data/cahierJournalTypes';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface JournalDashboardStats {
  // Main KPIs
  totalEntries: number;
  last7Days: number;
  last30Days: number;
  totalTimeMinutes: number;
  totalTimeHours: number;
  linkedToPdfcpPercent: number;
  needingAppuiPercent: number;
  
  // Distributions
  byCategory: { name: string; value: number; key: JournalCategory }[];
  byCommune: { name: string; count: number }[];
  weeklyEvolution: { week: string; count: number }[];
  
  // Priority breakdown
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export function useJournalDashboard(entries: CahierJournalEntry[]) {
  return useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subMonths(now, 0);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = subMonths(now, 1);
    
    // Main KPIs
    const totalEntries = entries.length;
    
    const last7Days = entries.filter(e => {
      const entryDate = parseISO(e.entry_date);
      return entryDate >= sevenDaysAgo;
    }).length;
    
    const last30Days = entries.filter(e => {
      const entryDate = parseISO(e.entry_date);
      return entryDate >= thirtyDaysAgo;
    }).length;
    
    const totalTimeMinutes = entries.reduce((sum, e) => sum + (e.temps_passe_min || 0), 0);
    const totalTimeHours = Math.round(totalTimeMinutes / 60 * 10) / 10;
    
    const linkedToPdfcp = entries.filter(e => e.pdfcp_id).length;
    const linkedToPdfcpPercent = totalEntries > 0 
      ? Math.round((linkedToPdfcp / totalEntries) * 100) 
      : 0;
    
    const needingAppui = entries.filter(e => e.besoin_appui_hierarchique).length;
    const needingAppuiPercent = totalEntries > 0 
      ? Math.round((needingAppui / totalEntries) * 100) 
      : 0;
    
    // By Category
    const categoryMap = new Map<JournalCategory, number>();
    entries.forEach(e => {
      if (e.category) {
        categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + 1);
      }
    });
    const byCategory = Array.from(categoryMap.entries())
      .map(([key, value]) => ({
        name: journalCategoryLabels[key] || key,
        value,
        key,
      }))
      .sort((a, b) => b.value - a.value);
    
    // By Commune
    const communeMap = new Map<string, number>();
    entries.forEach(e => {
      if (e.location_text) {
        communeMap.set(e.location_text, (communeMap.get(e.location_text) || 0) + 1);
      }
    });
    const byCommune = Array.from(communeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Weekly Evolution (last 6 weeks)
    const weeklyEvolution: { week: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const weekStart = startOfWeek(subMonths(now, 0), { locale: fr });
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = endOfWeek(weekStart, { locale: fr });
      
      const weekEntries = entries.filter(e => {
        const entryDate = parseISO(e.entry_date);
        return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
      }).length;
      
      weeklyEvolution.push({
        week: format(weekStart, 'dd/MM', { locale: fr }),
        count: weekEntries,
      });
    }
    
    // By Priority
    const priorityMap = new Map<string, number>();
    entries.forEach(e => {
      const priority = e.priorite || 'Moyenne';
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
    });
    const byPriority = Array.from(priorityMap.entries())
      .map(([priority, count]) => ({ priority, count }));
    
    // By Status
    const statusMap = new Map<string, number>();
    entries.forEach(e => {
      const status = e.statut_validation || 'Brouillon';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const byStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }));
    
    return {
      totalEntries,
      last7Days,
      last30Days,
      totalTimeMinutes,
      totalTimeHours,
      linkedToPdfcpPercent,
      needingAppuiPercent,
      byCategory,
      byCommune,
      weeklyEvolution,
      byPriority,
      byStatus,
    } as JournalDashboardStats;
  }, [entries]);
}
