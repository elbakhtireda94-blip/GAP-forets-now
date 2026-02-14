import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CahierJournalEntry, JournalCategory, journalCategoryLabels } from '@/data/cahierJournalTypes';

export interface WeeklySummary {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  totalEntries: number;
  totalTimeMinutes: number;
  totalTimeHours: number;
  
  // Key activities
  majorActions: {
    date: string;
    title: string;
    category: JournalCategory | null;
    location: string | null;
  }[];
  
  // Blocking points
  blockingPoints: {
    date: string;
    title: string;
    constraint: string;
  }[];
  
  // Support needs
  supportNeeds: {
    date: string;
    title: string;
    justification: string;
  }[];
  
  // Next steps
  nextSteps: string[];
  
  // By category breakdown
  byCategory: {
    category: JournalCategory;
    label: string;
    count: number;
    timeMinutes: number;
  }[];
  
  // Decisions made
  decisions: {
    date: string;
    title: string;
    decision: string;
  }[];
}

export function useWeeklySummary(entries: CahierJournalEntry[], weeksAgo: number = 0): WeeklySummary {
  return useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(subWeeks(now, weeksAgo), { locale: fr });
    const weekEnd = endOfWeek(subWeeks(now, weeksAgo), { locale: fr });
    
    const weekLabel = `Semaine du ${format(weekStart, 'd MMMM', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`;
    
    // Filter entries for this week
    const weekEntries = entries.filter(e => {
      const entryDate = new Date(e.entry_date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const totalEntries = weekEntries.length;
    const totalTimeMinutes = weekEntries.reduce((sum, e) => sum + (e.temps_passe_min || 0), 0);
    const totalTimeHours = Math.round(totalTimeMinutes / 60 * 10) / 10;
    
    // Major actions (high priority or with results)
    const majorActions = weekEntries
      .filter(e => e.priorite === 'Élevée' || e.resultats_obtenus)
      .slice(0, 5)
      .map(e => ({
        date: format(new Date(e.entry_date), 'd/MM', { locale: fr }),
        title: e.title,
        category: e.category,
        location: e.location_text,
      }));
    
    // Blocking points
    const blockingPoints = weekEntries
      .filter(e => e.contraintes_rencontrees)
      .map(e => ({
        date: format(new Date(e.entry_date), 'd/MM', { locale: fr }),
        title: e.title,
        constraint: e.contraintes_rencontrees!,
      }));
    
    // Support needs
    const supportNeeds = weekEntries
      .filter(e => e.besoin_appui_hierarchique && e.justification_appui)
      .map(e => ({
        date: format(new Date(e.entry_date), 'd/MM', { locale: fr }),
        title: e.title,
        justification: e.justification_appui!,
      }));
    
    // Next steps (unique)
    const nextStepsSet = new Set<string>();
    weekEntries.forEach(e => {
      if (e.prochaines_etapes) {
        nextStepsSet.add(e.prochaines_etapes);
      }
    });
    const nextSteps = Array.from(nextStepsSet).slice(0, 5);
    
    // Decisions
    const decisions = weekEntries
      .filter(e => e.decisions_prises)
      .map(e => ({
        date: format(new Date(e.entry_date), 'd/MM', { locale: fr }),
        title: e.title,
        decision: e.decisions_prises!,
      }));
    
    // By category
    const categoryMap = new Map<JournalCategory, { count: number; timeMinutes: number }>();
    weekEntries.forEach(e => {
      if (e.category) {
        const existing = categoryMap.get(e.category) || { count: 0, timeMinutes: 0 };
        categoryMap.set(e.category, {
          count: existing.count + 1,
          timeMinutes: existing.timeMinutes + (e.temps_passe_min || 0),
        });
      }
    });
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        label: journalCategoryLabels[category] || category,
        count: data.count,
        timeMinutes: data.timeMinutes,
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      weekLabel,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      totalEntries,
      totalTimeMinutes,
      totalTimeHours,
      majorActions,
      blockingPoints,
      supportNeeds,
      nextSteps,
      byCategory,
      decisions,
    };
  }, [entries, weeksAgo]);
}

// Generate exportable text summary
export function generateWeeklySummaryText(summary: WeeklySummary): string {
  const lines: string[] = [];
  
  lines.push(`RÉSUMÉ HEBDOMADAIRE - ${summary.weekLabel}`);
  lines.push('='.repeat(60));
  lines.push('');
  
  // Overview
  lines.push('📊 VUE D\'ENSEMBLE');
  lines.push(`   • ${summary.totalEntries} activités enregistrées`);
  lines.push(`   • ${summary.totalTimeHours}h de temps terrain`);
  lines.push('');
  
  // By category
  if (summary.byCategory.length > 0) {
    lines.push('📁 RÉPARTITION PAR CATÉGORIE');
    summary.byCategory.forEach(cat => {
      lines.push(`   • ${cat.label}: ${cat.count} (${Math.round(cat.timeMinutes / 60 * 10) / 10}h)`);
    });
    lines.push('');
  }
  
  // Major actions
  if (summary.majorActions.length > 0) {
    lines.push('⭐ ACTIONS MAJEURES');
    summary.majorActions.forEach(action => {
      lines.push(`   [${action.date}] ${action.title}${action.location ? ` - ${action.location}` : ''}`);
    });
    lines.push('');
  }
  
  // Decisions
  if (summary.decisions.length > 0) {
    lines.push('✅ DÉCISIONS PRISES');
    summary.decisions.forEach(d => {
      lines.push(`   [${d.date}] ${d.title}`);
      lines.push(`      → ${d.decision}`);
    });
    lines.push('');
  }
  
  // Blocking points
  if (summary.blockingPoints.length > 0) {
    lines.push('⚠️ POINTS BLOQUANTS');
    summary.blockingPoints.forEach(bp => {
      lines.push(`   [${bp.date}] ${bp.title}`);
      lines.push(`      → ${bp.constraint}`);
    });
    lines.push('');
  }
  
  // Support needs
  if (summary.supportNeeds.length > 0) {
    lines.push('🆘 BESOINS D\'APPUI HIÉRARCHIQUE');
    summary.supportNeeds.forEach(need => {
      lines.push(`   [${need.date}] ${need.title}`);
      lines.push(`      → ${need.justification}`);
    });
    lines.push('');
  }
  
  // Next steps
  if (summary.nextSteps.length > 0) {
    lines.push('➡️ PROCHAINES ÉTAPES');
    summary.nextSteps.forEach(step => {
      lines.push(`   • ${step}`);
    });
    lines.push('');
  }
  
  lines.push('');
  lines.push(`Généré le ${format(new Date(), 'd MMMM yyyy à HH:mm', { locale: fr })}`);
  
  return lines.join('\n');
}
