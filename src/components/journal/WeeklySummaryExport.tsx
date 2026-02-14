import React, { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, FileText, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWeeklySummary, generateWeeklySummaryText, WeeklySummary } from '@/hooks/useWeeklySummary';
import { CahierJournalEntry, journalCategoryLabels } from '@/data/cahierJournalTypes';

interface WeeklySummaryExportProps {
  entries: CahierJournalEntry[];
}

export const WeeklySummaryExport: React.FC<WeeklySummaryExportProps> = ({ entries }) => {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const summary = useWeeklySummary(entries, weeksAgo);
  
  const handleExport = () => {
    const text = generateWeeklySummaryText(summary);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume-hebdo-${summary.weekStart}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleCopy = async () => {
    const text = generateWeeklySummaryText(summary);
    await navigator.clipboard.writeText(text);
  };
  
  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Résumé hebdomadaire
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setWeeksAgo(prev => prev + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[60px] text-center">
              {weeksAgo === 0 ? 'Cette semaine' : weeksAgo === 1 ? 'Semaine passée' : `S-${weeksAgo}`}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setWeeksAgo(prev => Math.max(0, prev - 1))}
              disabled={weeksAgo === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{summary.weekLabel}</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Overview stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{summary.totalEntries}</p>
            <p className="text-xs text-muted-foreground">activités</p>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{summary.totalTimeHours}h</p>
            <p className="text-xs text-muted-foreground">temps terrain</p>
          </div>
        </div>
        
        {summary.totalEntries === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune activité cette semaine</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-4 pr-4">
              {/* By category */}
              {summary.byCategory.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Répartition</h4>
                  <div className="flex flex-wrap gap-1">
                    {summary.byCategory.map(cat => (
                      <Badge key={cat.category} variant="outline" className="text-xs">
                        {cat.label.split(' ')[0]} ({cat.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Major actions */}
              {summary.majorActions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Actions majeures
                  </h4>
                  <div className="space-y-1">
                    {summary.majorActions.map((action, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">[{action.date}]</span>{' '}
                        <span className="font-medium">{action.title}</span>
                        {action.location && (
                          <span className="text-muted-foreground"> — {action.location}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Blocking points */}
              {summary.blockingPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Points bloquants ({summary.blockingPoints.length})
                  </h4>
                  <div className="space-y-1">
                    {summary.blockingPoints.slice(0, 3).map((bp, idx) => (
                      <div key={idx} className="text-xs p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="font-medium text-amber-900">{bp.title}</p>
                        <p className="text-amber-700 mt-0.5">{bp.constraint.slice(0, 80)}...</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Support needs */}
              {summary.supportNeeds.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Besoins d'appui ({summary.supportNeeds.length})
                  </h4>
                  <div className="space-y-1">
                    {summary.supportNeeds.slice(0, 2).map((need, idx) => (
                      <div key={idx} className="text-xs p-2 bg-red-50 rounded border border-red-200">
                        <p className="font-medium text-red-900">{need.title}</p>
                        <p className="text-red-700 mt-0.5">{need.justification.slice(0, 80)}...</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Next steps */}
              {summary.nextSteps.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-primary" />
                    Prochaines étapes
                  </h4>
                  <div className="space-y-1">
                    {summary.nextSteps.map((step, idx) => (
                      <div key={idx} className="text-xs p-2 bg-primary/5 rounded flex items-start gap-1">
                        <span className="text-primary">•</span>
                        <span>{step.slice(0, 100)}{step.length > 100 ? '...' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        
        {/* Export buttons */}
        {summary.totalEntries > 0 && (
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={handleCopy}
            >
              Copier
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 text-xs gap-1"
              onClick={handleExport}
            >
              <Download className="h-3 w-3" />
              Exporter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklySummaryExport;
