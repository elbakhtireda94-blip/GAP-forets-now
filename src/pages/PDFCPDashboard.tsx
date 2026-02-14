import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Wallet, TrendingUp, CheckCircle, Clock, Users, 
  BarChart3, PieChart as PieChartIcon, Eye, AlertTriangle, Activity, 
  AlertCircle, ExternalLink, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import KPICard from '@/components/KPICard';
import BottomNav from '@/components/BottomNav';
import { useDatabase, PDFC, Activity as ActivityType, Conflict, CONFLICT_NATURES } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDh } from '@/lib/formatters';

const COLORS = ['hsl(162, 100%, 21%)', 'hsl(42, 100%, 50%)', 'hsl(220, 90%, 56%)', 'hsl(0, 70%, 50%)', 'hsl(280, 70%, 50%)'];
const CONFLICT_COLORS = ['hsl(0, 70%, 50%)', 'hsl(20, 90%, 50%)', 'hsl(42, 100%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(0, 0%, 60%)'];
const ACTIVITY_COLORS = ['hsl(220, 90%, 56%)', 'hsl(162, 100%, 21%)', 'hsl(42, 100%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(0, 70%, 50%)'];

const PDFCPDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, applyScopeFilter } = useAuth();
  const {
    getPdfcs,
    getCommuneName,
    getAdpName,
    getPdfcPrevusByPdfcId,
    getPdfcCpsByPdfcId,
    getPdfcExecByPdfcId,
    getRegions,
    getActivities,
    getConflicts,
  } = useDatabase();

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('all');

  // Get user context for subtitle
  const getUserContextLabel = () => {
    if (!user) return '';
    switch (user.scope_level) {
      case 'ADMIN':
      case 'NATIONAL':
        return 'Vue nationale consolidée';
      case 'REGIONAL':
        return `Vue régionale – ${user.role_label}`;
      case 'PROVINCIAL':
        return `Vue provinciale – ${user.role_label}`;
      case 'LOCAL':
        return `Vue terrain – ${user.name}`;
      default:
        return '';
    }
  };

  // Apply RBAC scope filter first
  const scopedPdfcs = useMemo(() => {
    const allPdfcs = getPdfcs();
    return applyScopeFilter(allPdfcs, 'pdfcp');
  }, [getPdfcs, applyScopeFilter]);

  // Apply RBAC scope filter to activities
  const scopedActivities = useMemo(() => {
    const allActivities = getActivities();
    return applyScopeFilter(allActivities, 'activity');
  }, [getActivities, applyScopeFilter]);

  // Apply RBAC scope filter to conflicts
  const scopedConflicts = useMemo(() => {
    const allConflicts = getConflicts();
    return applyScopeFilter(allConflicts, 'conflict');
  }, [getConflicts, applyScopeFilter]);

  // Get unique periods (year ranges)
  const periods = useMemo(() => {
    const periodsSet = new Set<string>();
    scopedPdfcs.forEach(p => {
      periodsSet.add(`${p.year_start}-${p.year_end}`);
    });
    return Array.from(periodsSet).sort();
  }, [scopedPdfcs]);

  // Get territory options based on scope
  const territoryOptions = useMemo(() => {
    if (user?.scope_level === 'ADMIN' || user?.scope_level === 'NATIONAL') {
      const regions = getRegions();
      const dranefs: { id: string; name: string }[] = [];
      regions.forEach(r => r.dranef.forEach(d => dranefs.push({ id: d.id, name: d.name })));
      return dranefs;
    }
    return [];
  }, [user, getRegions]);

  // Get communes for filtered PDFCPs
  const filteredCommuneIds = useMemo(() => {
    let result = scopedPdfcs;
    if (selectedYear !== 'all') {
      const [start, end] = selectedYear.split('-').map(Number);
      result = result.filter(p => p.year_start === start && p.year_end === end);
    }
    if (selectedStatus !== 'all') {
      result = result.filter(p => p.status === selectedStatus);
    }
    if (selectedTerritory !== 'all' && (user?.scope_level === 'ADMIN' || user?.scope_level === 'NATIONAL')) {
      const regions = getRegions();
      const communeIds = new Set<string>();
      regions.forEach(r => {
        r.dranef.forEach(d => {
          if (d.id === selectedTerritory) {
            d.dpanef.forEach(dp => {
              dp.communes.forEach(c => communeIds.add(c.id));
            });
          }
        });
      });
      result = result.filter(p => communeIds.has(p.commune_id));
    }
    return new Set(result.map(p => p.commune_id));
  }, [scopedPdfcs, selectedYear, selectedStatus, selectedTerritory, user, getRegions]);

  // Apply filters
  const filteredPdfcs = useMemo(() => {
    let result = scopedPdfcs;

    if (selectedYear !== 'all') {
      const [start, end] = selectedYear.split('-').map(Number);
      result = result.filter(p => p.year_start === start && p.year_end === end);
    }

    if (selectedStatus !== 'all') {
      result = result.filter(p => p.status === selectedStatus);
    }

    // Territory filter only for ADMIN/NATIONAL
    if (selectedTerritory !== 'all' && (user?.scope_level === 'ADMIN' || user?.scope_level === 'NATIONAL')) {
      const regions = getRegions();
      const communeIds = new Set<string>();
      regions.forEach(r => {
        r.dranef.forEach(d => {
          if (d.id === selectedTerritory) {
            d.dpanef.forEach(dp => {
              dp.communes.forEach(c => communeIds.add(c.id));
            });
          }
        });
      });
      result = result.filter(p => communeIds.has(p.commune_id));
    }

    return result;
  }, [scopedPdfcs, selectedYear, selectedStatus, selectedTerritory, user, getRegions]);

  // Filter activities by PDFCP communes/territory
  const linkedActivities = useMemo(() => {
    return scopedActivities.filter(a => filteredCommuneIds.has(a.commune_id));
  }, [scopedActivities, filteredCommuneIds]);

  // Filter conflicts by PDFCP communes/territory
  const linkedConflicts = useMemo(() => {
    return scopedConflicts.filter(c => filteredCommuneIds.has(c.commune_id));
  }, [scopedConflicts, filteredCommuneIds]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalPdfcp = filteredPdfcs.length;
    const enCours = filteredPdfcs.filter(p => p.status === 'En cours').length;
    const valides = filteredPdfcs.filter(p => p.status === 'Validé').length;
    const finalises = filteredPdfcs.filter(p => p.status === 'Finalisé').length;

    // Calculate budget
    let budgetProgramme = 0;
    let budgetExecute = 0;

    filteredPdfcs.forEach(pdfc => {
      // Budget from components (programme)
      pdfc.components.forEach(c => {
        budgetProgramme += c.budget_dh || 0;
      });

      // Budget exécuté from actions_executees
      const executed = getPdfcExecByPdfcId(pdfc.id);
      executed.forEach(a => {
        budgetExecute += a.cout_reel_dh || 0;
      });
    });

    const tauxExecution = budgetProgramme > 0 ? Math.round((budgetExecute / budgetProgramme) * 100) : 0;

    return {
      totalPdfcp,
      enCours,
      valides,
      finalises,
      budgetProgramme,
      budgetExecute,
      tauxExecution,
    };
  }, [filteredPdfcs, getPdfcExecByPdfcId]);

  // Integrated KPIs (activities + conflicts)
  const integratedKpis = useMemo(() => {
    const totalActivities = linkedActivities.length;
    const totalConflicts = linkedConflicts.length;
    const conflitsEnCours = linkedConflicts.filter(c => c.status === 'En cours').length;
    
    // Activities of type médiation/sensibilisation
    const mediationActivities = linkedActivities.filter(a => 
      ['Médiation', 'Sensibilisation', 'Réunion communautaire'].includes(a.type)
    ).length;
    
    // Coverage rate
    const couvertureTerrain = totalConflicts > 0 
      ? Math.round((totalActivities / totalConflicts) * 100) 
      : totalActivities > 0 ? 100 : 0;

    // PDFCPs with unresolved conflicts
    const pdfcWithUnresolvedConflicts = filteredPdfcs.filter(pdfc => {
      const pdfcConflicts = linkedConflicts.filter(c => c.commune_id === pdfc.commune_id && c.status !== 'Résolu');
      return pdfcConflicts.length > 0;
    }).length;

    // PDFCPs with conflicts but no activities
    const pdfcWithConflictsNoActivities = filteredPdfcs.filter(pdfc => {
      const pdfcConflicts = linkedConflicts.filter(c => c.commune_id === pdfc.commune_id);
      const pdfcActivities = linkedActivities.filter(a => a.commune_id === pdfc.commune_id);
      return pdfcConflicts.length > 0 && pdfcActivities.length === 0;
    }).length;

    // PDFCPs under high social pressure (≥3 conflicts)
    const pdfcHighPressure = filteredPdfcs.filter(pdfc => {
      const pdfcConflicts = linkedConflicts.filter(c => c.commune_id === pdfc.commune_id);
      return pdfcConflicts.length >= 3;
    }).length;

    // Recent activities (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentActivities = linkedActivities.filter(a => new Date(a.date) >= thirtyDaysAgo).length;

    return {
      totalActivities,
      totalConflicts,
      conflitsEnCours,
      mediationActivities,
      couvertureTerrain,
      pdfcWithUnresolvedConflicts,
      pdfcWithConflictsNoActivities,
      pdfcHighPressure,
      recentActivities,
    };
  }, [linkedActivities, linkedConflicts, filteredPdfcs]);

  // Chart data: Status distribution
  const statusChartData = useMemo(() => [
    { name: 'En cours', value: kpis.enCours, color: 'hsl(42, 100%, 50%)' },
    { name: 'Validés', value: kpis.valides, color: 'hsl(220, 90%, 56%)' },
    { name: 'Finalisés', value: kpis.finalises, color: 'hsl(162, 100%, 21%)' },
  ].filter(d => d.value > 0), [kpis]);

  // Chart data: Budget comparison
  const budgetChartData = useMemo(() => [
    { name: 'Programmé', value: kpis.budgetProgramme },
    { name: 'Exécuté', value: kpis.budgetExecute },
  ], [kpis]);

  // Chart data: Conflicts vs Activities by PDFCP
  const conflictsVsActivitiesData = useMemo(() => {
    return filteredPdfcs.slice(0, 10).map(pdfc => {
      const pdfcConflicts = linkedConflicts.filter(c => c.commune_id === pdfc.commune_id).length;
      const pdfcActivities = linkedActivities.filter(a => a.commune_id === pdfc.commune_id).length;
      return {
        name: pdfc.title.length > 15 ? pdfc.title.substring(0, 15) + '...' : pdfc.title,
        conflits: pdfcConflicts,
        activites: pdfcActivities,
      };
    });
  }, [filteredPdfcs, linkedConflicts, linkedActivities]);

  // Chart data: Conflict types distribution
  const conflictTypesData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    linkedConflicts.forEach(c => {
      const nature = c.nature || 'Autre';
      typeCounts[nature] = (typeCounts[nature] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .map(([name, value], index) => ({ 
        name: name.length > 25 ? name.substring(0, 25) + '...' : name, 
        value,
        color: CONFLICT_COLORS[index % CONFLICT_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [linkedConflicts]);

  // Chart data: Activity types distribution
  const activityTypesData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    linkedActivities.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .map(([name, value], index) => ({ 
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        value,
        color: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [linkedActivities]);

  // Chart data: Evolution by year
  const evolutionData = useMemo(() => {
    const yearlyData: Record<number, { prevu: number; cp: number; execute: number }> = {};

    filteredPdfcs.forEach(pdfc => {
      const prevus = getPdfcPrevusByPdfcId(pdfc.id);
      const cpList = getPdfcCpsByPdfcId(pdfc.id);
      const executed = getPdfcExecByPdfcId(pdfc.id);

      prevus.forEach(p => {
        if (!yearlyData[p.annee]) yearlyData[p.annee] = { prevu: 0, cp: 0, execute: 0 };
        yearlyData[p.annee].prevu += p.quantite_physique || 0;
      });

      cpList.forEach(c => {
        if (!yearlyData[c.annee]) yearlyData[c.annee] = { prevu: 0, cp: 0, execute: 0 };
        yearlyData[c.annee].cp += c.quantite_programmee || 0;
      });

      executed.forEach(e => {
        if (!yearlyData[e.annee]) yearlyData[e.annee] = { prevu: 0, cp: 0, execute: 0 };
        yearlyData[e.annee].execute += e.quantite_realisee || 0;
      });
    });

    return Object.entries(yearlyData)
      .map(([year, data]) => ({ year: parseInt(year), ...data }))
      .sort((a, b) => a.year - b.year);
  }, [filteredPdfcs, getPdfcPrevusByPdfcId, getPdfcCpsByPdfcId, getPdfcExecByPdfcId]);

  // Suivi Terrain table data
  const suiviTerrainData = useMemo(() => {
    return filteredPdfcs.map(pdfc => {
      const pdfcActivities = linkedActivities.filter(a => a.commune_id === pdfc.commune_id);
      const pdfcConflicts = linkedConflicts.filter(c => c.commune_id === pdfc.commune_id);
      const conflitsEnCours = pdfcConflicts.filter(c => c.status !== 'Résolu').length;
      
      // Last activity date
      const lastActivity = pdfcActivities.length > 0 
        ? pdfcActivities.reduce((latest, a) => a.date > latest.date ? a : latest).date
        : null;

      // Is recent (within 30 days)
      const isRecent = lastActivity && (new Date().getTime() - new Date(lastActivity).getTime()) < 30 * 24 * 60 * 60 * 1000;

      return {
        pdfc,
        communeName: getCommuneName(pdfc.commune_id),
        activitiesCount: pdfcActivities.length,
        lastActivity,
        conflictsCount: pdfcConflicts.length,
        hasOngoingConflicts: conflitsEnCours > 0,
        isRecent,
      };
    });
  }, [filteredPdfcs, linkedActivities, linkedConflicts, getCommuneName]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'En cours': return 'secondary';
      case 'Validé': return 'outline';
      case 'Finalisé': return 'default';
      default: return 'secondary';
    }
  };

  const calculateTauxExecution = (pdfc: PDFC) => {
    const budgetProgramme = pdfc.components.reduce((sum, c) => sum + (c.budget_dh || 0), 0);
    const executed = getPdfcExecByPdfcId(pdfc.id);
    const budgetExecute = executed.reduce((sum, a) => sum + (a.cout_reel_dh || 0), 0);
    return budgetProgramme > 0 ? Math.round((budgetExecute / budgetProgramme) * 100) : 0;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleNavigateToActivities = (communeId?: string) => {
    if (communeId) {
      navigate(`/activites?commune=${communeId}`);
    } else {
      navigate('/activites');
    }
  };

  const handleNavigateToConflicts = (communeId?: string) => {
    if (communeId) {
      navigate(`/oppositions?commune=${communeId}`);
    } else {
      navigate('/oppositions');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary pt-8 pb-6 px-4">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate('/pdfcp')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary-foreground">Tableau de bord PDFCP</h1>
            <p className="text-primary-foreground/70 text-sm">{getUserContextLabel()}</p>
          </div>
        </div>
      </header>

      <div className="px-4 -mt-3 space-y-4">
        {/* Filters */}
        <Card className="border-border/50 shadow-soft">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes périodes</SelectItem>
                  {periods.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="Validé">Validé</SelectItem>
                  <SelectItem value="Finalisé">Finalisé</SelectItem>
                </SelectContent>
              </Select>

              {(user?.scope_level === 'ADMIN' || user?.scope_level === 'NATIONAL') && territoryOptions.length > 0 && (
                <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Territoire" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes régions</SelectItem>
                    {territoryOptions.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name.replace('DRANEF ', '')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PDFCP KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
          <KPICard
            title="Total PDFCP"
            value={kpis.totalPdfcp}
            icon={FileText}
            trend="neutral"
          />
          <KPICard
            title="En cours"
            value={kpis.enCours}
            icon={Clock}
            trend="neutral"
            trendValue="actifs"
          />
          <KPICard
            title="Validés"
            value={kpis.valides}
            icon={CheckCircle}
            trend="up"
          />
          <KPICard
            title="Finalisés"
            value={kpis.finalises}
            icon={CheckCircle}
            trend="up"
            className="bg-primary/5"
          />
        </div>

        {/* Budget KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget programmé</p>
                  <p className="text-lg font-bold">{formatDh(kpis.budgetProgramme)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget exécuté</p>
                  <p className="text-lg font-bold">{formatDh(kpis.budgetExecute)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpis.tauxExecution >= 80 ? 'bg-green-100 dark:bg-green-900/30' : kpis.tauxExecution >= 50 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <BarChart3 className={`h-5 w-5 ${kpis.tauxExecution >= 80 ? 'text-green-600 dark:text-green-400' : kpis.tauxExecution >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taux d'exécution</p>
                  <p className="text-lg font-bold">{kpis.tauxExecution}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integrated Terrain KPIs Section */}
        <Card className="border-border/50 shadow-soft animate-slide-up" style={{ animationDelay: '75ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Suivi Terrain Intégré
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total activities */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Activités terrain</p>
                  <p className="text-lg font-bold">{integratedKpis.totalActivities}</p>
                </div>
              </div>
              
              {/* Total conflicts */}
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conflits liés</p>
                  <p className="text-lg font-bold">{integratedKpis.totalConflicts}</p>
                </div>
              </div>
              
              {/* Ongoing conflicts */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conflits en cours</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{integratedKpis.conflitsEnCours}</p>
                </div>
              </div>
              
              {/* Mediation activities */}
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Médiation/Sensib.</p>
                  <p className="text-lg font-bold">{integratedKpis.mediationActivities}</p>
                </div>
              </div>
            </div>

            {/* Alert indicators */}
            {(integratedKpis.pdfcWithUnresolvedConflicts > 0 || integratedKpis.pdfcWithConflictsNoActivities > 0 || integratedKpis.pdfcHighPressure > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {integratedKpis.pdfcWithUnresolvedConflicts > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {integratedKpis.pdfcWithUnresolvedConflicts} PDFCP avec conflits non résolus
                  </Badge>
                )}
                {integratedKpis.pdfcWithConflictsNoActivities > 0 && (
                  <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    {integratedKpis.pdfcWithConflictsNoActivities} PDFCP sans activité associée
                  </Badge>
                )}
                {integratedKpis.pdfcHighPressure > 0 && (
                  <Badge variant="outline" className="gap-1 border-red-500 text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    {integratedKpis.pdfcHighPressure} PDFCP à forte pression sociale
                  </Badge>
                )}
              </div>
            )}

            {/* Quick navigation buttons */}
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => handleNavigateToActivities()}
              >
                <Activity className="h-4 w-4" />
                Voir activités terrain
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => handleNavigateToConflicts()}
              >
                <AlertTriangle className="h-4 w-4" />
                Voir conflits liés
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row - PDFCP Status & Budget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {/* Status Donut */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Répartition par statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Aucune donnée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Comparison */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Budget programmé vs exécuté
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => formatDh(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip
                      formatter={(value: number) => formatDh(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(162, 100%, 21%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row - Conflicts vs Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '125ms' }}>
          {/* Conflicts vs Activities Bar Chart */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Conflits vs Activités par PDFCP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                {conflictsVsActivitiesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conflictsVsActivitiesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9 }} 
                        stroke="hsl(var(--muted-foreground))" 
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="conflits" name="Conflits" fill="hsl(0, 70%, 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="activites" name="Activités" fill="hsl(220, 90%, 56%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Aucune donnée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conflict Types Donut */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Typologie des conflits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                {conflictTypesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conflictTypesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ value }) => value}
                        labelLine={false}
                      >
                        {conflictTypesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: 10, paddingLeft: 10 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Aucun conflit
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row - Activity Types & Evolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
          {/* Activity Types Bar */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Activités par type (réponse terrain)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {activityTypesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityTypesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))" 
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value, name, props) => [value, props.payload.fullName || name]}
                      />
                      <Bar dataKey="value" fill="hsl(220, 90%, 56%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Aucune activité
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evolution Line Chart */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Évolution annuelle des actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {evolutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="prevu" name="Prévu" stroke="hsl(220, 90%, 56%)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="cp" name="CP" stroke="hsl(42, 100%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="execute" name="Exécuté" stroke="hsl(162, 100%, 21%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Aucune donnée d'évolution
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suivi Terrain Table */}
        <Card className="border-border/50 shadow-soft animate-slide-up" style={{ animationDelay: '175ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Suivi Terrain PDFCP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">PDFCP</TableHead>
                    <TableHead>Commune</TableHead>
                    <TableHead className="text-center">Activités</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead className="text-center">Conflits</TableHead>
                    <TableHead className="text-center">En cours</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suiviTerrainData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Aucun PDFCP trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    suiviTerrainData.map(item => (
                      <TableRow key={item.pdfc.id}>
                        <TableCell className="font-medium">
                          {item.pdfc.title}
                        </TableCell>
                        <TableCell>{item.communeName}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {item.activitiesCount}
                            {item.isRecent && (
                              <span className="text-green-500 text-lg" title="Activité récente (<30j)">🟢</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(item.lastActivity)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.conflictsCount}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.hasOngoingConflicts ? (
                            <span className="text-red-500 text-lg" title="Conflits en cours">🔴</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/pdfcp/${item.pdfc.id}`)}
                            title="Voir le PDFCP"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed PDFCP Table */}
        <Card className="border-border/50 shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Liste détaillée des PDFCP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Intitulé</TableHead>
                    <TableHead>Commune</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Budget prog.</TableHead>
                    <TableHead className="text-right">Budget exéc.</TableHead>
                    <TableHead className="text-right">% Exéc.</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPdfcs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucun PDFCP trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPdfcs.map(pdfc => {
                      const budgetProg = pdfc.components.reduce((sum, c) => sum + (c.budget_dh || 0), 0);
                      const executed = getPdfcExecByPdfcId(pdfc.id);
                      const budgetExec = executed.reduce((sum, a) => sum + (a.cout_reel_dh || 0), 0);
                      const taux = calculateTauxExecution(pdfc);

                      return (
                        <TableRow key={pdfc.id}>
                          <TableCell className="font-medium">{pdfc.title}</TableCell>
                          <TableCell>{getCommuneName(pdfc.commune_id)}</TableCell>
                          <TableCell>{pdfc.year_start}-{pdfc.year_end}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(pdfc.status)}>{pdfc.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatDh(budgetProg)}</TableCell>
                          <TableCell className="text-right">{formatDh(budgetExec)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-medium ${taux >= 80 ? 'text-green-600' : taux >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {taux}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/pdfcp/${pdfc.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default PDFCPDashboard;
