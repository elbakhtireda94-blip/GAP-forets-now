import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle, Clock, FileText, AlertTriangle, Unlock, 
  ArrowRight, User, Lock, Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TIMELINE_ACTION_CONFIG } from '@/data/pdfcpValidationWorkflow';

interface ValidationEvent {
  id: string;
  action: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  performed_by_name?: string;
  performed_by_role?: string;
  created_at: string;
}

interface PdfcpValidationTimelineProps {
  events: ValidationEvent[];
  className?: string;
}

const getActionConfig = (action: string) => {
  return TIMELINE_ACTION_CONFIG[action] || { 
    icon: ArrowRight, 
    label: action, 
    color: 'text-gray-600 bg-gray-100' 
  };
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return dateString;
  }
};

const PdfcpValidationTimeline: React.FC<PdfcpValidationTimelineProps> = ({ 
  events, 
  className 
}) => {
  if (events.length === 0) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground', className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucun historique de validation</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('max-h-[400px]', className)}>
      <div className="relative pl-6 space-y-4">
        {/* Timeline line */}
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

        {events.map((event, index) => {
          const config = getActionConfig(event.action);
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className={cn(
                'absolute -left-4 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center',
                config.color
              )}>
                <Icon className="h-2.5 w-2.5" />
              </div>

              {/* Content */}
              <div className="flex-1 bg-muted/30 rounded-lg p-3 ml-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="outline" className={cn('text-xs', config.color)}>
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(event.created_at)}
                  </span>
                </div>

                {event.note && (
                  <p className="text-sm text-foreground mb-2">{event.note}</p>
                )}

                {event.performed_by_name && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{event.performed_by_name}</span>
                    {event.performed_by_role && (
                      <span className="text-muted-foreground/60">
                        ({event.performed_by_role})
                      </span>
                    )}
                  </div>
                )}

                {event.from_status && event.to_status && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <span className="font-mono bg-muted px-1 rounded">{event.from_status}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-mono bg-muted px-1 rounded">{event.to_status}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default PdfcpValidationTimeline;
