import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Clock, CheckCircle, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ValidationStatus, VALIDATION_STATUS_LABELS, VALIDATION_STATUS_COLORS } from '@/types/database.types';
import { cn } from '@/lib/utils';

interface AuditInfo {
  created_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  validated_at?: string | null;
  validated_by?: string | null;
  validated_by_name?: string | null;
  status?: ValidationStatus | string | null;
  sync_status?: 'synced' | 'pending' | 'error' | null;
}

interface AuditPanelProps {
  data: AuditInfo;
  className?: string;
  showSync?: boolean;
  compact?: boolean;
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy à HH:mm', { locale: fr });
  } catch {
    return dateString;
  }
};

const AuditRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}> = ({ icon, label, value, subValue }) => (
  <div className="flex items-start gap-3 py-2">
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </div>
  </div>
);

const SyncBadge: React.FC<{ status: 'synced' | 'pending' | 'error' | null | undefined }> = ({ status }) => {
  if (!status) return null;
  
  const config = {
    synced: { icon: Cloud, label: 'Synchronisé', className: 'bg-green-100 text-green-800 border-green-300' },
    pending: { icon: CloudOff, label: 'En attente', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    error: { icon: AlertCircle, label: 'Erreur sync', className: 'bg-red-100 text-red-800 border-red-300' },
  };
  
  const { icon: Icon, label, className } = config[status];
  
  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const AuditPanel: React.FC<AuditPanelProps> = ({ 
  data, 
  className, 
  showSync = false,
  compact = false 
}) => {
  const status = data.status as ValidationStatus | undefined;
  const statusLabel = status ? VALIDATION_STATUS_LABELS[status] : null;
  const statusColor = status ? VALIDATION_STATUS_COLORS[status] : '';

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 text-xs text-muted-foreground', className)}>
        {statusLabel && (
          <Badge variant="outline" className={cn('text-xs', statusColor)}>
            {statusLabel}
          </Badge>
        )}
        {showSync && data.sync_status && <SyncBadge status={data.sync_status} />}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(data.updated_at || data.created_at)}
        </span>
        {(data.updated_by_name || data.created_by_name) && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {data.updated_by_name || data.created_by_name}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Traçabilité</h4>
        <div className="flex items-center gap-2">
          {statusLabel && (
            <Badge variant="outline" className={statusColor}>
              {statusLabel}
            </Badge>
          )}
          {showSync && <SyncBadge status={data.sync_status} />}
        </div>
      </div>
      
      <Separator className="mb-3" />
      
      <div className="space-y-1">
        <AuditRow
          icon={<User className="h-4 w-4" />}
          label="Créé par"
          value={data.created_by_name || data.created_by || '-'}
          subValue={formatDate(data.created_at)}
        />
        
        {(data.updated_at && data.updated_at !== data.created_at) && (
          <AuditRow
            icon={<Clock className="h-4 w-4" />}
            label="Dernière modification"
            value={data.updated_by_name || data.updated_by || '-'}
            subValue={formatDate(data.updated_at)}
          />
        )}
        
        {data.validated_at && (
          <AuditRow
            icon={<CheckCircle className="h-4 w-4 text-green-600" />}
            label="Validé par"
            value={data.validated_by_name || data.validated_by || '-'}
            subValue={formatDate(data.validated_at)}
          />
        )}
      </div>
    </div>
  );
};

export default AuditPanel;
