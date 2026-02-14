 import React from 'react';
 import { Home, ChevronRight, MapPin, Building2, TreePine, RotateCcw } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 interface DrillDownLevel {
   level: 'national' | 'region' | 'dpanef' | 'commune';
   id?: string;
   name?: string;
 }
 
 interface DashboardBreadcrumbProps {
   selectedDranef: string;
   selectedDpanef: string;
   selectedCommune: string;
   dranefName?: string;
   dpanefName?: string;
   communeName?: string;
   onNavigate: (level: 'national' | 'region' | 'dpanef' | 'commune') => void;
   onReset: () => void;
   className?: string;
 }
 
 const DashboardBreadcrumb: React.FC<DashboardBreadcrumbProps> = ({
   selectedDranef,
   selectedDpanef,
   selectedCommune,
   dranefName,
   dpanefName,
   communeName,
   onNavigate,
   onReset,
   className,
 }) => {
   // Determine current drill-down level
   const getCurrentLevel = (): DrillDownLevel['level'] => {
     if (selectedCommune && selectedCommune !== 'all') return 'commune';
     if (selectedDpanef && selectedDpanef !== 'all') return 'dpanef';
     if (selectedDranef && selectedDranef !== 'all') return 'region';
     return 'national';
   };
 
   const currentLevel = getCurrentLevel();
   const isFiltered = currentLevel !== 'national';
 
   // Build breadcrumb items
   const items: { level: DrillDownLevel['level']; label: string; icon: React.ReactNode; active: boolean }[] = [
     {
       level: 'national',
       label: 'National',
       icon: <Home className="h-3.5 w-3.5" />,
       active: currentLevel === 'national',
     },
   ];
 
   if (selectedDranef && selectedDranef !== 'all') {
     items.push({
       level: 'region',
       label: dranefName || 'Région',
       icon: <MapPin className="h-3.5 w-3.5" />,
       active: currentLevel === 'region',
     });
   }
 
   if (selectedDpanef && selectedDpanef !== 'all') {
     items.push({
       level: 'dpanef',
       label: dpanefName || 'DPANEF',
       icon: <Building2 className="h-3.5 w-3.5" />,
       active: currentLevel === 'dpanef',
     });
   }
 
   if (selectedCommune && selectedCommune !== 'all') {
     items.push({
       level: 'commune',
       label: communeName || 'Commune',
       icon: <TreePine className="h-3.5 w-3.5" />,
       active: currentLevel === 'commune',
     });
   }
 
   // Get level indicator badge
   const getLevelBadge = () => {
     switch (currentLevel) {
       case 'national':
         return { label: 'Vue Nationale', color: 'bg-primary/10 text-primary border-primary/20' };
       case 'region':
         return { label: 'Vue Régionale', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' };
       case 'dpanef':
         return { label: 'Vue Provinciale', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20' };
       case 'commune':
         return { label: 'Vue Communale', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' };
     }
   };
 
   const levelBadge = getLevelBadge();
 
   return (
     <div className={cn(
       "bg-card rounded-xl border border-border/50 shadow-sm transition-all duration-300",
       isFiltered && "ring-1 ring-primary/20",
       className
     )}>
       <div className="px-4 py-3 flex items-center justify-between gap-4">
         {/* Breadcrumb navigation */}
         <nav className="flex items-center gap-1 flex-wrap min-w-0">
           {items.map((item, index) => (
             <React.Fragment key={item.level}>
               {index > 0 && (
                 <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
               )}
               <button
                 onClick={() => onNavigate(item.level)}
                 disabled={item.active}
                 className={cn(
                   "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium",
                   "transition-all duration-200 min-w-0",
                   item.active
                     ? "bg-primary text-primary-foreground shadow-sm cursor-default"
                     : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                 )}
               >
                 {item.icon}
                 <span className="truncate max-w-[120px] sm:max-w-[180px]">{item.label}</span>
               </button>
             </React.Fragment>
           ))}
         </nav>
 
         {/* Right side: Level badge + Reset button */}
         <div className="flex items-center gap-2 flex-shrink-0">
           {/* Level indicator badge */}
           <span className={cn(
             "hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
             "transition-all duration-300 animate-fade-in",
             levelBadge.color
           )}>
             {levelBadge.label}
           </span>
 
           {/* Reset button - only show when filtered */}
           {isFiltered && (
             <Button
               variant="outline"
               size="sm"
               onClick={onReset}
               className="h-8 px-3 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 animate-scale-in"
             >
               <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
               Réinitialiser
             </Button>
           )}
         </div>
       </div>
 
       {/* Drill-down hint - only show at national level */}
       {currentLevel === 'national' && (
         <div className="px-4 pb-3 pt-0">
           <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
             <MapPin className="h-3 w-3" />
             Cliquez sur une région de la carte pour explorer les données territoriales
           </p>
         </div>
       )}
     </div>
   );
 };
 
 export default DashboardBreadcrumb;