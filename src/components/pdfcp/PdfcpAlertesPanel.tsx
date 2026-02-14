/**
 * PdfcpAlertesPanel - Displays PDFCP automatic alerts with severity, filtering, and click-to-zoom.
 */

import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, Filter, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PdfcpAlert,
  PdfcpAlertType,
  AlertSeverity,
  ALERT_TYPE_LABELS,
  ALERT_TYPE_ICONS,
} from '@/hooks/usePdfcpAlerts';

interface PdfcpAlertesPanelProps {
  alerts: PdfcpAlert[];
  onAlertClick?: (alert: PdfcpAlert) => void;
  className?: string;
  compact?: boolean;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ElementType; className: string; label: string }> = {
  critique: {
    icon: AlertCircle,
    className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300',
    label: 'Critique',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
    label: 'Attention',
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300',
    label: 'Info',
  },
};

const SEVERITY_BADGE_CONFIG: Record<AlertSeverity, string> = {
  critique: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
};

const PdfcpAlertesPanel: React.FC<PdfcpAlertesPanelProps> = ({
  alerts,
  onAlertClick,
  className,
  compact = false,
}) => {
  const [filterType, setFilterType] = useState<PdfcpAlertType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [expanded, setExpanded] = useState(!compact);

  const filtered = useMemo(() => {
    let result = alerts;
    if (filterType !== 'all') {
      result = result.filter(a => a.type === filterType);
    }
    if (filterSeverity !== 'all') {
      result = result.filter(a => a.severity === filterSeverity);
    }
    // Sort by severity (critique first)
    return result.sort((a, b) => {
      const order: Record<AlertSeverity, number> = { critique: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [alerts, filterType, filterSeverity]);

  const counts = useMemo(() => ({
    critique: alerts.filter(a => a.severity === 'critique').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }), [alerts]);

  if (alerts.length === 0) {
    return (
      <div className={cn('rounded-xl border border-border/50 bg-card p-4 text-center', className)}>
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="rounded-full bg-green-100 p-3">
            <Info className="h-5 w-5 text-green-700" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Aucune alerte active</p>
          <p className="text-xs text-muted-foreground/70">Tous les indicateurs sont conformes</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card shadow-sm', className)}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-foreground">Alertes PDFCP</span>
          <Badge variant="secondary" className="text-xs">{alerts.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Severity summary pills */}
          {counts.critique > 0 && (
            <Badge className={cn('text-[10px] px-1.5 py-0', SEVERITY_BADGE_CONFIG.critique)}>
              {counts.critique} critique{counts.critique > 1 ? 's' : ''}
            </Badge>
          )}
          {counts.warning > 0 && (
            <Badge className={cn('text-[10px] px-1.5 py-0', SEVERITY_BADGE_CONFIG.warning)}>
              {counts.warning}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <>
          {/* Filters */}
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as PdfcpAlertType | 'all')}>
              <SelectTrigger className="h-7 text-xs w-[160px]">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {(Object.keys(ALERT_TYPE_LABELS) as PdfcpAlertType[]).map(type => (
                  <SelectItem key={type} value={type}>
                    {ALERT_TYPE_ICONS[type]} {ALERT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v as AlertSeverity | 'all')}>
              <SelectTrigger className="h-7 text-xs w-[120px]">
                <SelectValue placeholder="Gravité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="critique">🔴 Critique</SelectItem>
                <SelectItem value="warning">🟠 Attention</SelectItem>
                <SelectItem value="info">🔵 Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert list */}
          <ScrollArea className="max-h-[400px]">
            <div className="px-3 pb-3 space-y-2">
              {filtered.map(alert => {
                const config = SEVERITY_CONFIG[alert.severity];
                const SeverityIcon = config.icon;

                return (
                  <button
                    key={alert.id}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm',
                      config.className,
                      onAlertClick && 'cursor-pointer hover:ring-1 hover:ring-primary/30'
                    )}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityIcon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">
                            {ALERT_TYPE_ICONS[alert.type]} {ALERT_TYPE_LABELS[alert.type]}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {alert.year}
                          </Badge>
                        </div>
                        <p className="text-xs mt-1 font-medium truncate">{alert.pdfcp_title}</p>
                        <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin className="h-3 w-3 opacity-60" />
                          <span className="text-[10px] opacity-70">{alert.action_label}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-4">
                  Aucune alerte pour ces filtres
                </p>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
};

export default PdfcpAlertesPanel;
