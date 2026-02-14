/**
 * DemoBadge — Floating badge displayed when in demo/presentation mode.
 * Shows a subtle indicator that the app is in read-only demo mode.
 */

import React from 'react';
import { Eye, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDemo } from '@/hooks/useDemo';
import { cn } from '@/lib/utils';

interface DemoBadgeProps {
  className?: string;
  variant?: 'floating' | 'inline';
}

const DemoBadge: React.FC<DemoBadgeProps> = ({ className, variant = 'floating' }) => {
  const { isDemo, demoLabel } = useDemo();

  // Only show demo badge in development mode
  if (!isDemo || import.meta.env.PROD) return null;

  if (variant === 'inline') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 text-[10px] px-2 py-0.5 border-amber-300 bg-amber-50 text-amber-700',
          'dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
          className
        )}
      >
        <Eye className="h-3 w-3" />
        Démo
      </Badge>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-amber-100/95 backdrop-blur-sm border border-amber-300 shadow-lg',
        'dark:bg-amber-950/90 dark:border-amber-700',
        'animate-slide-up',
        className
      )}
    >
      <Shield className="h-4 w-4 text-amber-700 dark:text-amber-300" />
      <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
        Mode démonstration — {demoLabel}
      </span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-700 dark:text-amber-300">
        Lecture seule
      </Badge>
    </div>
  );
};

export default DemoBadge;
