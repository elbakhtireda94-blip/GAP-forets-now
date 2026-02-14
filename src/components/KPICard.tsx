import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  isActive?: boolean;
  onClick?: () => void;
  kpiId?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
  isActive = false,
  onClick,
  kpiId,
}) => {
  const isClickable = !!onClick;
  
  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-5 shadow-card border border-border/50 transition-all duration-300",
        isClickable && "cursor-pointer hover:shadow-lg hover:border-primary/30",
        isActive && "ring-2 ring-primary ring-offset-2 border-primary shadow-lg",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
      data-kpi-id={kpiId}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trendValue && (
            <p
              className={cn(
                "text-xs font-medium mt-2",
                trend === 'up' && "text-green-600",
                trend === 'down' && "text-red-500",
                trend === 'neutral' && "text-muted-foreground"
              )}
            >
              {trendValue}
            </p>
          )}
        </div>
        <div className={cn(
          "rounded-xl p-3 transition-colors duration-200",
          isActive ? "bg-primary text-primary-foreground" : "bg-primary/10"
        )}>
          <Icon className={cn("h-6 w-6", isActive ? "text-primary-foreground" : "text-primary")} />
        </div>
      </div>
      {isActive && (
        <div className="mt-3 pt-2 border-t border-primary/20">
          <span className="text-xs font-medium text-primary">Vue carte active</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
