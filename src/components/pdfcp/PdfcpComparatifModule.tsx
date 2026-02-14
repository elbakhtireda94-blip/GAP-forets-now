import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Filter,
  RotateCcw,
  Download,
  ChevronDown,
  History,
  Lock,
  Unlock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { usePdfcpAggregates } from '@/hooks/usePdfcpAggregates';
import { LigneComparatif, actionTypeConfig, ActionType } from '@/data/comparatifTypes';
import {
  PdfcpValidation,
  ValidationStatus,
  EtatType,
  ETAT_LABELS,
  ETAT_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  getEcartStatus,
  calculateTaux,
  isLockedForScope,
  getLockMessage,
} from '@/data/pdfcp_entry_types';
import { UnlockRequestsAPI } from '@/data/unlock_requests';
import validationData from '@/data/pdfcp_validation.json';
import zonesData from '@/data/zones.json';
import { formatDh } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import UnlockRequestModal from './UnlockRequestModal';

interface PdfcpComparatifModuleProps {
  pdfcpId: string;
  communeCode: string;
}

type EcartFilter = 'all' | 'sous' | 'sur' | 'conforme';

// Mapping ActionType to display label
const ACTION_TYPE_LABELS: Record<string, string> = {
  'Reboisement': 'Reboisement',
  'CMD': 'Compensation Mise en Défens',
  'PFNL': 'Produits Forestiers Non Ligneux',
  'Sensibilisation': 'Sensibilisation',
  'Sylvopastoralisme': 'Sylvopastoralisme',
  'Points_Eau': "Points d'eau",
  'Pistes': 'Pistes',
  'Regeneration': 'Régénération',
  'Apiculture': 'Apiculture',
  'Arboriculture': 'Arboriculture',
  'Equipement': 'Équipement',
};

const PdfcpComparatifModule: React.FC<PdfcpComparatifModuleProps> = ({
  pdfcpId,
}) => {
  // Auth context pour les permissions
  const { user } = useAuth();
  const scopeLevel = user?.scope_level || 'LOCAL';

  // Use the centralized hook - SINGLE SOURCE OF TRUTH
  const {
    pdfcp,
    lignesComparatif,
    comparatifTotals,
  } = usePdfcpAggregates(pdfcpId);

  // State
  const [activeTab, setActiveTab] = useState<'CONCERTE' | 'CP' | 'EXECUTE' | 'COMPARATIF'>('CONCERTE');
  const [showFilters, setShowFilters] = useState(false);
  const [filterActions, setFilterActions] = useState<string[]>([]);
  const [filterPerimetre, setFilterPerimetre] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterEcart, setFilterEcart] = useState<EcartFilter>('all');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [synthYearSelect, setSynthYearSelect] = useState<number | null>(null);
  const [showUnlockRequestModal, setShowUnlockRequestModal] = useState(false);

  // Initialiser validation avec les nouveaux champs
  const [validation, setValidation] = useState<PdfcpValidation>(() => {
    const found = (validationData as PdfcpValidation[]).find(v => v.pdfcpId === pdfcpId);
    if (found) return found;
    return {
      pdfcpId,
      status: 'BROUILLON',
      locked: false,
      validatedAdpBy: null,
      validatedAdpAt: null,
      validatedDpanefBy: null,
      validatedDpanefAt: null,
      visaDranefBy: null,
      visaDranefAt: null,
      note: null,
    };
  });

  // Dériver l'état de verrouillage selon le scope de l'utilisateur
  const isLocked = isLockedForScope(validation.status, scopeLevel);
  const lockMessage = getLockMessage(validation.status);

  // Derive PDFCP year window
  const windowYears = useMemo(() => {
    if (!pdfcp) return [];
    const years: number[] = [];
    for (let y = pdfcp.year_start; y <= pdfcp.year_end; y++) {
      years.push(y);
    }
    return years;
  }, [pdfcp]);

  // Set default synthesis year to first year in window
  const effectiveSynthYear = synthYearSelect ?? windowYears[0] ?? new Date().getFullYear();

  // Get unique perimetres and sites from lignesComparatif
  const perimetres = useMemo(() => 
    [...new Set(lignesComparatif.map(l => l.perimetre_id))], 
    [lignesComparatif]
  );
  
  const sites = useMemo(() => {
    let data = lignesComparatif;
    if (filterPerimetre !== 'all') {
      data = lignesComparatif.filter(l => l.perimetre_id === filterPerimetre);
    }
    return [...new Set(data.map(l => l.site_id))];
  }, [lignesComparatif, filterPerimetre]);

  // Zone label helpers
  const getPerimetreLabel = (id: string): string => {
    for (const zone of zonesData as any[]) {
      for (const p of zone.perimetres || []) {
        if (p.perimetre_id === id || p.id === id) return p.nom;
      }
    }
    return id;
  };

  const getSiteLabel = (id: string): string => {
    for (const zone of zonesData as any[]) {
      for (const p of zone.perimetres || []) {
        for (const s of p.sites || []) {
          if (s.site_id === id || s.id === id) return s.nom;
        }
      }
    }
    return id;
  };

  // Filter lignes
  const filteredLignes = useMemo(() => {
    let data = lignesComparatif;
    if (filterActions.length > 0) {
      data = data.filter(l => filterActions.includes(l.action_type));
    }
    if (filterPerimetre !== 'all') {
      data = data.filter(l => l.perimetre_id === filterPerimetre);
    }
    if (filterSite !== 'all') {
      data = data.filter(l => l.site_id === filterSite);
    }
    return data;
  }, [lignesComparatif, filterActions, filterPerimetre, filterSite]);

  // Get unique action types from the data
  const uniqueActionTypes = useMemo(() => 
    [...new Set(lignesComparatif.map(l => l.action_type))],
    [lignesComparatif]
  );

  // Build pivot data: action_type -> year -> { PREVU, CP, EXECUTE }
  type PivotData = Record<string, Record<number, Record<EtatType, { physique: number; financier: number }>>>;

  const pivotData = useMemo<PivotData>(() => {
    const pivot: PivotData = {};
    
    // Initialize structure for all action types and years
    uniqueActionTypes.forEach(actionType => {
      pivot[actionType] = {};
      windowYears.forEach(year => {
        pivot[actionType][year] = {
          CONCERTE: { physique: 0, financier: 0 },
          CP: { physique: 0, financier: 0 },
          EXECUTE: { physique: 0, financier: 0 },
        };
      });
    });

    // Aggregate from filteredLignes (based on year and action filters)
    filteredLignes.forEach(ligne => {
      if (!pivot[ligne.action_type]) {
        pivot[ligne.action_type] = {};
        windowYears.forEach(year => {
          pivot[ligne.action_type][year] = {
            CONCERTE: { physique: 0, financier: 0 },
            CP: { physique: 0, financier: 0 },
            EXECUTE: { physique: 0, financier: 0 },
          };
        });
      }
      
      if (pivot[ligne.action_type][ligne.annee]) {
        // CONCERTE
        pivot[ligne.action_type][ligne.annee].CONCERTE.physique += ligne.quantite_prevue;
        pivot[ligne.action_type][ligne.annee].CONCERTE.financier += ligne.budget_prevu;
        // CP
        pivot[ligne.action_type][ligne.annee].CP.physique += ligne.quantite_programmee || 0;
        pivot[ligne.action_type][ligne.annee].CP.financier += ligne.budget_programme || 0;
        // EXECUTE
        pivot[ligne.action_type][ligne.annee].EXECUTE.physique += ligne.quantite_realisee;
        pivot[ligne.action_type][ligne.annee].EXECUTE.financier += ligne.cout_reel;
      }
    });

    return pivot;
  }, [filteredLignes, uniqueActionTypes, windowYears]);

  // Actions that have data (for display)
  const activeActions = useMemo(() => 
    uniqueActionTypes.filter(at => {
      const yearData = pivotData[at];
      if (!yearData) return false;
      return windowYears.some(y => {
        const d = yearData[y];
        return d && (d.CONCERTE.physique > 0 || d.CP.physique > 0 || d.EXECUTE.physique > 0);
      });
    }),
    [uniqueActionTypes, pivotData, windowYears]
  );

  // Ecart filter for comparatif
  const filteredActionsForComparatif = useMemo(() => {
    if (filterEcart === 'all') return activeActions;
    return activeActions.filter(actionType => {
      for (const year of windowYears) {
        const data = pivotData[actionType]?.[year];
        if (!data) continue;
        const ecartVsCp = getEcartStatus(data.EXECUTE.physique, data.CP.physique);
        if (ecartVsCp === filterEcart) return true;
      }
      return false;
    });
  }, [filterEcart, windowYears, pivotData, activeActions]);

  // Totals for current etat tab (from pivot)
  const getTotalsForEtat = useCallback((etat: EtatType) => {
    const result: Record<number, { physique: number; financier: number }> = {};
    windowYears.forEach(year => {
      result[year] = { physique: 0, financier: 0 };
    });
    Object.values(pivotData).forEach(yearData => {
      windowYears.forEach(year => {
        if (yearData[year]?.[etat]) {
          result[year].physique += yearData[year][etat].physique;
          result[year].financier += yearData[year][etat].financier;
        }
      });
    });
    return result;
  }, [pivotData, windowYears]);

  // Calculate sous-exécution count from aggregated pivot data
  const sousExecCount = useMemo(() => {
    let count = 0;
    activeActions.forEach(actionType => {
      windowYears.forEach(year => {
        const data = pivotData[actionType]?.[year];
        if (data && data.CP.physique > 0 && data.EXECUTE.physique < data.CP.physique * 0.95) {
          count++;
        }
      });
    });
    return count;
  }, [pivotData, activeActions, windowYears]);

  // Synthesis for selected year
  const synthesisData = useMemo(() => {
    return activeActions.map(actionType => {
      const data = pivotData[actionType]?.[effectiveSynthYear];
      const label = ACTION_TYPE_LABELS[actionType] || actionTypeConfig[actionType as ActionType]?.label || actionType;
      const unite = lignesComparatif.find(l => l.action_type === actionType)?.unite || 'unité';
      
      if (!data) {
        return {
          action: label,
          unite,
          prevu: 0,
          cp: 0,
          execute: 0,
          tauxVsCp: null,
          tauxVsPrevu: null,
          ecart: 0,
        };
      }
      return {
        action: label,
        unite,
        prevu: data.CONCERTE.physique,
        cp: data.CP.physique,
        execute: data.EXECUTE.physique,
        tauxVsCp: calculateTaux(data.EXECUTE.physique, data.CP.physique),
        tauxVsPrevu: calculateTaux(data.EXECUTE.physique, data.CONCERTE.physique),
        ecart: data.EXECUTE.physique - data.CP.physique,
      };
    }).filter(d => d.prevu > 0 || d.cp > 0 || d.execute > 0);
  }, [pivotData, effectiveSynthYear, activeActions, lignesComparatif]);

  // Reset filters
  const resetFilters = () => {
    setFilterActions([]);
    setFilterPerimetre('all');
    setFilterSite('all');
    setFilterEcart('all');
  };

  // Export CSV
  const exportCSV = () => {
    const etat = activeTab === 'COMPARATIF' ? null : activeTab;
    const headers = ['Action', 'Unité', ...windowYears.flatMap(y => 
      etat ? [`${y} Physique`, `${y} Financier`] : [`${y} Prévu`, `${y} CP`, `${y} Exécuté`]
    )];
    const rows = activeActions.map(actionType => {
      const label = ACTION_TYPE_LABELS[actionType] || actionType;
      const unite = lignesComparatif.find(l => l.action_type === actionType)?.unite || 'unité';
      const row = [label, unite];
      windowYears.forEach(year => {
        const data = pivotData[actionType]?.[year];
        if (etat) {
          row.push((data?.[etat]?.physique || 0).toString(), (data?.[etat]?.financier || 0).toString());
        } else {
          row.push(
            (data?.CONCERTE?.physique || 0).toString(),
            (data?.CP?.physique || 0).toString(),
            (data?.EXECUTE?.physique || 0).toString()
          );
        }
      });
      return row;
    });
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comparatif_${pdfcpId}_${activeTab}.csv`;
    link.click();
    toast({ title: 'Export réussi', description: 'Fichier CSV téléchargé' });
  };

  // Validation handlers - new workflow: BROUILLON → CONCERTE_ADP → VALIDE_DPANEF → VALIDE_CENTRAL → VERROUILLE
  const handleValidateAdp = () => {
    if (!user) return;
    setValidation({
      ...validation,
      status: 'CONCERTE_ADP',
      locked: false,
      validatedAdpBy: { userId: user.id, name: user.name },
      validatedAdpAt: new Date().toISOString(),
    });
    toast({ title: 'Validation Concerté ADP effectuée', description: lockMessage });
  };

  const handleValidateDpanef = () => {
    if (!user) return;
    setValidation({
      ...validation,
      status: 'VALIDE_DPANEF',
      locked: false,
      validatedDpanefBy: { userId: user.id, name: user.name },
      validatedDpanefAt: new Date().toISOString(),
    });
    toast({ title: 'Validation DPANEF effectuée', description: 'Module validé au niveau provincial' });
  };

  const handleVisaDranef = () => {
    if (!user) return;
    setValidation({
      ...validation,
      status: 'VALIDE_CENTRAL',
      locked: false,
      visaDranefBy: { userId: user.id, name: user.name },
      visaDranefAt: new Date().toISOString(),
    });
    toast({ title: 'Validation Central effectuée', description: 'Module validé au niveau central' });
  };

  const handleUnlock = () => {
    setValidation({
      ...validation,
      status: 'BROUILLON',
      locked: false,
      validatedAdpBy: null,
      validatedAdpAt: null,
      validatedDpanefBy: null,
      validatedDpanefAt: null,
      visaDranefBy: null,
      visaDranefAt: null,
    });
    toast({ title: 'Déverrouillé', description: 'Le module est de nouveau éditable' });
  };

  // Permissions - only VERROUILLE blocks modifications
  const canValidateAdp = scopeLevel === 'LOCAL' && validation.status === 'BROUILLON';
  const canValidateDpanef = scopeLevel === 'PROVINCIAL' && validation.status === 'CONCERTE_ADP';
  const canVisaDranef = scopeLevel === 'REGIONAL' && validation.status === 'VALIDE_DPANEF';
  const canUnlock = scopeLevel === 'ADMIN';
  
  const showUnlockRequestButton = validation.status !== 'BROUILLON' && 
    ['LOCAL', 'PROVINCIAL', 'REGIONAL', 'NATIONAL'].includes(scopeLevel);
  
  // Vérifier s'il y a déjà une demande en cours
  const hasPendingRequest = UnlockRequestsAPI.hasPendingRequest(pdfcpId);
  
  // Territoire pour la demande
  const getTerritoire = (): string => {
    if (!user) return '';
    if (scopeLevel === 'LOCAL') return user.commune_ids?.[0] || user.commune || 'Commune';
    if (scopeLevel === 'PROVINCIAL') return user.dpanef_id || user.dpanef || 'DPANEF';
    if (scopeLevel === 'REGIONAL') return user.dranef_id || user.dranef || 'DRANEF';
    return 'National';
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('COMPARATIF MODULE DEBUG', {
      pdfcpId,
      windowYears,
      nbLignesComparatif: lignesComparatif.length,
      comparatifTotals,
      activeActions,
      sousExecCount,
    });
  }

  // Render single etat table
  const renderEtatTable = (etat: EtatType) => {
    const totals = getTotalsForEtat(etat);
    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <TableRow>
              <TableHead rowSpan={2} className="min-w-[160px] border-r bg-muted font-semibold">Action</TableHead>
              <TableHead rowSpan={2} className="w-[60px] text-center border-r bg-muted">Unité</TableHead>
              {windowYears.map(year => (
                <TableHead key={year} colSpan={2} className="text-center border-r bg-muted font-semibold">{year}</TableHead>
              ))}
              <TableHead colSpan={2} className="text-center bg-primary/10 font-semibold">Total</TableHead>
            </TableRow>
            <TableRow>
              {windowYears.map(year => (
                <React.Fragment key={`sub-${year}`}>
                  <TableHead className="text-center text-xs w-[80px] border-r bg-muted/60">Phys.</TableHead>
                  <TableHead className="text-center text-xs w-[90px] border-r bg-muted/60">Fin. (DH)</TableHead>
                </React.Fragment>
              ))}
              <TableHead className="text-center text-xs w-[80px] bg-primary/5">Phys.</TableHead>
              <TableHead className="text-center text-xs w-[90px] bg-primary/5">Fin. (DH)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeActions.map((actionType, idx) => {
              if (filterActions.length > 0 && !filterActions.includes(actionType)) return null;
              const label = ACTION_TYPE_LABELS[actionType] || actionType;
              const unite = lignesComparatif.find(l => l.action_type === actionType)?.unite || 'unité';
              const rowTotal = windowYears.reduce(
                (acc, year) => ({
                  physique: acc.physique + (pivotData[actionType]?.[year]?.[etat]?.physique || 0),
                  financier: acc.financier + (pivotData[actionType]?.[year]?.[etat]?.financier || 0),
                }),
                { physique: 0, financier: 0 }
              );
              return (
                <TableRow key={actionType} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  <TableCell className="font-medium border-r">{label}</TableCell>
                  <TableCell className="text-center border-r">
                    <Badge variant="outline" className="text-xs">{unite}</Badge>
                  </TableCell>
                  {windowYears.map(year => {
                    const data = pivotData[actionType]?.[year]?.[etat] || { physique: 0, financier: 0 };
                    return (
                      <React.Fragment key={`${actionType}-${year}`}>
                        <TableCell className="p-1 border-r text-center text-sm">
                          {data.physique || '-'}
                        </TableCell>
                        <TableCell className="p-1 border-r text-center text-sm">
                          {data.financier ? data.financier.toLocaleString() : '-'}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                  <TableCell className="text-center font-medium bg-primary/5">{rowTotal.physique.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-medium bg-primary/5">{rowTotal.financier.toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
            {/* Totals row */}
            <TableRow className="bg-muted font-semibold">
              <TableCell colSpan={2} className="border-r">TOTAL</TableCell>
              {windowYears.map(year => (
                <React.Fragment key={`tot-${year}`}>
                  <TableCell className="text-center border-r">{totals[year]?.physique?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-center border-r">{totals[year]?.financier?.toLocaleString() || 0}</TableCell>
                </React.Fragment>
              ))}
              <TableCell className="text-center bg-primary/10">
                {Object.values(totals).reduce((s, t) => s + t.physique, 0).toLocaleString()}
              </TableCell>
              <TableCell className="text-center bg-primary/10">
                {Object.values(totals).reduce((s, t) => s + t.financier, 0).toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render comparatif table
  const renderComparatifTable = () => (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
          <TableRow>
            <TableHead rowSpan={2} className="min-w-[160px] border-r bg-muted font-semibold">Action</TableHead>
            <TableHead rowSpan={2} className="w-[50px] text-center border-r bg-muted">État</TableHead>
            {windowYears.map(year => (
              <TableHead key={year} colSpan={2} className="text-center border-r bg-muted font-semibold">{year}</TableHead>
            ))}
          </TableRow>
          <TableRow>
            {windowYears.map(year => (
              <React.Fragment key={`sub-${year}`}>
                <TableHead className="text-center text-xs w-[70px] border-r bg-muted/60">Phys.</TableHead>
                <TableHead className="text-center text-xs w-[80px] border-r bg-muted/60">%</TableHead>
              </React.Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredActionsForComparatif.map((actionType, idx) => {
            if (filterActions.length > 0 && !filterActions.includes(actionType)) return null;
            const label = ACTION_TYPE_LABELS[actionType] || actionType;
            const unite = lignesComparatif.find(l => l.action_type === actionType)?.unite || 'unité';
            const etats: EtatType[] = ['CONCERTE', 'CP', 'EXECUTE'];
            return (
              <React.Fragment key={actionType}>
                {etats.map((etat, etatIdx) => (
                  <TableRow
                    key={`${actionType}-${etat}`}
                    className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${etatIdx === 0 ? 'border-t-2' : ''}`}
                  >
                    {etatIdx === 0 && (
                      <TableCell rowSpan={4} className="font-medium border-r align-top pt-3">
                        {label}
                        <Badge variant="outline" className="ml-2 text-xs">{unite}</Badge>
                      </TableCell>
                    )}
                    <TableCell className={`text-xs border-r ${ETAT_COLORS[etat]}`}>{etat}</TableCell>
                    {windowYears.map(year => {
                      const data = pivotData[actionType]?.[year]?.[etat];
                      const cp = pivotData[actionType]?.[year]?.CP?.physique || 0;
                      const taux = etat === 'EXECUTE' && cp > 0 ? Math.round((data?.physique || 0) / cp * 100) : null;
                      return (
                        <React.Fragment key={`${actionType}-${etat}-${year}`}>
                          <TableCell className="text-center border-r text-sm">{data?.physique || '-'}</TableCell>
                          <TableCell className="text-center border-r text-sm">
                            {etat === 'EXECUTE' && taux !== null ? (
                              <span className={taux < 95 ? 'text-red-600' : taux > 105 ? 'text-amber-600' : 'text-green-600'}>
                                {taux}%
                              </span>
                            ) : '-'}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}
                  </TableRow>
                ))}
                {/* Ecart row */}
                <TableRow className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} border-b-2`}>
                  <TableCell className="text-xs border-r font-medium bg-gray-100">ÉCART</TableCell>
                  {windowYears.map(year => {
                    const exec = pivotData[actionType]?.[year]?.EXECUTE?.physique || 0;
                    const cp = pivotData[actionType]?.[year]?.CP?.physique || 0;
                    const ecart = exec - cp;
                    const status = getEcartStatus(exec, cp);
                    return (
                      <React.Fragment key={`ecart-${actionType}-${year}`}>
                        <TableCell className="text-center border-r">
                          <span className={ecart < 0 ? 'text-red-600' : ecart > 0 ? 'text-green-600' : ''}>
                            {ecart !== 0 ? (ecart > 0 ? '+' : '') + ecart : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center border-r">
                          {status === 'sous' && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                          {status === 'sur' && <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />}
                          {status === 'conforme' && <Minus className="h-4 w-4 text-gray-400 mx-auto" />}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  if (!pdfcp) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement du PDFCP...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Comparatif PDFCP (Prévu) vs CP (Programmé) vs Réalisé
            <Badge variant="outline" className="ml-2 text-xs">
              {pdfcp.year_start}–{pdfcp.year_end}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Validation status badge */}
            <Badge className={STATUS_COLORS[validation.status]}>
              {isLocked && <Lock className="h-3 w-3 mr-1" />}
              {STATUS_LABELS[validation.status]}
            </Badge>
          </div>
        </div>
        
        {/* AVERTISSEMENT ROUGE PERMANENT - Visible quand verrouillé */}
        {validation.status !== 'BROUILLON' && (
          <div className="mt-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-red-700 font-semibold">
                  Les éléments saisis seront portés au niveau du programme définitif du PDFCP.
                </p>
                <p className="text-red-600 font-medium">
                  Pour reprendre cette partie, veuillez saisir l'Admin.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Lock status banner */}
        {isLocked && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
            <Lock className="h-4 w-4" />
            <span>Module verrouillé — {lockMessage}
              {validation.validatedAdpAt && ` (Validé ADP le ${format(new Date(validation.validatedAdpAt), 'dd/MM/yyyy', { locale: fr })})`}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Cards - Using comparatifTotals from hook (SINGLE SOURCE) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
            <div className="text-xs text-blue-600 mb-1">Total Prévu</div>
            <div className="font-bold text-blue-800">{formatDh(comparatifTotals.totalPrevu)}</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
            <div className="text-xs text-amber-600 mb-1">Total CP</div>
            <div className="font-bold text-amber-800">{formatDh(comparatifTotals.totalCP)}</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
            <div className="text-xs text-green-600 mb-1">Total Exécuté</div>
            <div className="font-bold text-green-800">{formatDh(comparatifTotals.totalExecute)}</div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
            <div className="text-xs text-purple-600 mb-1">Taux vs CP</div>
            <div className={`font-bold ${comparatifTotals.tauxVsCp >= 95 ? 'text-green-700' : 'text-red-700'}`}>
              {comparatifTotals.tauxVsCp}%
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
            <div className="text-xs text-red-600 mb-1">Sous-exécution</div>
            <div className="font-bold text-red-800">{sousExecCount} actions</div>
          </div>
        </div>

        {/* Synthesis section - MOVED BEFORE TABS */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Synthèse par année</h4>
            <Select value={effectiveSynthYear.toString()} onValueChange={v => setSynthYearSelect(parseInt(v))}>
              <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {windowYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-center">Prévu</TableHead>
                  <TableHead className="text-center">CP</TableHead>
                  <TableHead className="text-center">Exécuté</TableHead>
                  <TableHead className="text-center">% vs CP</TableHead>
                  <TableHead className="text-center">% vs Prévu</TableHead>
                  <TableHead className="text-center">Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {synthesisData.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucune donnée pour {effectiveSynthYear}</TableCell></TableRow>
                ) : (
                  synthesisData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.action} <Badge variant="outline" className="ml-1 text-xs">{row.unite}</Badge></TableCell>
                      <TableCell className="text-center">{row.prevu}</TableCell>
                      <TableCell className="text-center">{row.cp}</TableCell>
                      <TableCell className="text-center">{row.execute}</TableCell>
                      <TableCell className="text-center">
                        {row.tauxVsCp !== null ? (
                          <span className={row.tauxVsCp < 95 ? 'text-red-600' : 'text-green-600'}>{row.tauxVsCp}%</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.tauxVsPrevu !== null ? <span>{row.tauxVsPrevu}%</span> : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={row.ecart < 0 ? 'text-red-600' : row.ecart > 0 ? 'text-green-600' : ''}>
                          {row.ecart !== 0 ? (row.ecart > 0 ? '+' : '') + row.ecart : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                {(filterActions.length > 0 || filterPerimetre !== 'all' || filterEcart !== 'all') && (
                  <Badge variant="secondary" className="ml-2">Actifs</Badge>
                )}
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <div className="flex gap-2">
              <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-1" />
                    Historique
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Historique des modifications</DialogTitle>
                    <DialogDescription>
                      Liste des modifications effectuées sur ce module comparatif.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-center py-4">Aucune modification enregistrée</p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Exporter
              </Button>
            </div>
          </div>
          <CollapsibleContent className="pt-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
                <Select value={filterActions[0] || 'all'} onValueChange={v => setFilterActions(v === 'all' ? [] : [v])}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Toutes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {uniqueActionTypes.map(at => (
                      <SelectItem key={at} value={at}>{ACTION_TYPE_LABELS[at] || at}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Périmètre</label>
                <Select value={filterPerimetre} onValueChange={setFilterPerimetre}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {perimetres.map(p => <SelectItem key={p} value={p}>{getPerimetreLabel(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Site</label>
                <Select value={filterSite} onValueChange={setFilterSite}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {sites.map(s => <SelectItem key={s} value={s}>{getSiteLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Écarts</label>
                <Select value={filterEcart} onValueChange={(v: EcartFilter) => setFilterEcart(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="sous">Sous-exécution</SelectItem>
                    <SelectItem value="sur">Sur-exécution</SelectItem>
                    <SelectItem value="conforme">Conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Empty state message */}
        {lignesComparatif.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-yellow-800 font-medium">⚠️ Aucune ligne prévue opérationnelle</div>
            <div className="text-yellow-600 text-sm mt-1">
              Les tableaux ci-dessous seront alimentés une fois les lignes prévues saisies.
            </div>
          </div>
        )}

        {/* Tabs - Detailed tables */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="CONCERTE" className="text-xs">Concerté (PDFCP)</TabsTrigger>
            <TabsTrigger value="CP" className="text-xs">Programmé (CP)</TabsTrigger>
            <TabsTrigger value="EXECUTE" className="text-xs">Exécuté</TabsTrigger>
            <TabsTrigger value="COMPARATIF" className="text-xs">Comparatif</TabsTrigger>
          </TabsList>

          <TabsContent value="CONCERTE" className="mt-4">{renderEtatTable('CONCERTE')}</TabsContent>
          <TabsContent value="CP" className="mt-4">{renderEtatTable('CP')}</TabsContent>
          <TabsContent value="EXECUTE" className="mt-4">{renderEtatTable('EXECUTE')}</TabsContent>
          <TabsContent value="COMPARATIF" className="mt-4">{renderComparatifTable()}</TabsContent>
        </Tabs>

        {/* Bandeau de statut de validation */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${STATUS_COLORS[validation.status]}`}>
          <div className="flex items-center gap-2">
            {validation.status === 'BROUILLON' ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span className="font-medium">{STATUS_LABELS[validation.status]}</span>
            <span className="text-sm opacity-75">— {lockMessage}</span>
          </div>
          {validation.status !== 'BROUILLON' && validation.validatedAdpAt && (
            <span className="text-xs opacity-60">
              Validé ADP: {format(new Date(validation.validatedAdpAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
            </span>
          )}
        </div>

        {/* Validation buttons - conditionnels selon permissions */}
        <div className="border-t pt-4 flex flex-wrap gap-2 justify-end">
          {/* Bouton Valider ADP - visible pour LOCAL uniquement */}
          {scopeLevel === 'LOCAL' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!canValidateAdp}
                  title={!canValidateAdp ? 'Validation ADP déjà effectuée ou non autorisée' : ''}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Valider ADP
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la validation ADP</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action valide le module au niveau commune. Il sera ensuite soumis au DPANEF pour validation provinciale.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleValidateAdp}>Valider ADP</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Bouton Valider DPANEF - visible pour PROVINCIAL uniquement */}
          {scopeLevel === 'PROVINCIAL' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!canValidateDpanef}
                  title={!canValidateDpanef ? 'En attente de validation ADP' : ''}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Valider DPANEF
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la validation DPANEF</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action verrouille le module au niveau provincial. Les données ne pourront plus être modifiées par l'ADP.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleValidateDpanef}>Valider DPANEF</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Bouton VISA DRANEF - visible pour REGIONAL uniquement */}
          {scopeLevel === 'REGIONAL' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  disabled={!canVisaDranef}
                  title={!canVisaDranef ? 'En attente de validation DPANEF' : ''}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  VISA DRANEF
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer le VISA DRANEF</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action appose le visa régional et verrouille définitivement le module. Cette opération est finale.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleVisaDranef}>Apposer VISA</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Bouton Demander déverrouillage - visible pour LOCAL, PROVINCIAL, REGIONAL, NATIONAL */}
          {showUnlockRequestButton && !canUnlock && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUnlockRequestModal(true)}
              disabled={hasPendingRequest}
              title={hasPendingRequest ? 'Une demande de déverrouillage est déjà en cours' : ''}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Send className="h-4 w-4 mr-1" />
              {hasPendingRequest ? 'Demande en cours...' : 'Demander déverrouillage (Admin)'}
            </Button>
          )}

          {/* Bouton Déverrouiller - visible pour ADMIN uniquement */}
          {canUnlock && validation.status !== 'BROUILLON' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Unlock className="h-4 w-4 mr-1" />
                  Déverrouiller (Admin)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Déverrouiller le module</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est réservée aux administrateurs. Le module redeviendra éditable et toutes les validations seront annulées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnlock}>Déverrouiller</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Modal de demande de déverrouillage */}
        <UnlockRequestModal
          isOpen={showUnlockRequestModal}
          onClose={() => setShowUnlockRequestModal(false)}
          pdfcpId={pdfcpId}
          pdfcpName={pdfcp?.title || pdfcpId}
          currentStatus={validation.status}
          territoire={getTerritoire()}
        />
      </CardContent>
    </Card>
  );
};

export default PdfcpComparatifModule;
