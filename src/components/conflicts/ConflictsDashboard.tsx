import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Map,
  MapPinCheck,
  TrendingUp,
  ArrowUpRight,
  Filter,
  X,
  BarChart3,
  PieChart,
  Building2,
  FileText,
  AlertOctagon,
  ShieldAlert,
  Users,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import { useDatabase, CONFLICT_AXES } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConflictsDashboard, ConflictsDashboardFilters, PriorityCase } from '@/hooks/useConflictsDashboard';
import { cn } from '@/lib/utils';

interface ConflictsDashboardProps {
  onViewConflict?: (id: string) => void;
}

const statusOptions = ['En cours', 'Résolu', 'Escaladé'];
const severityOptions = ['Faible', 'Moyenne', 'Élevée', 'Critique'];

const chartConfig: ChartConfig = {
  conflits: {
    label: 'Conflits',
    color: 'hsl(var(--primary))',
  },
  oppositions: {
    label: 'Oppositions',
    color: 'hsl(45, 93%, 47%)',
  },
};

const ConflictsDashboard: React.FC<ConflictsDashboardProps> = ({ onViewConflict }) => {
  const { user } = useAuth();
  const { data, getAdps } = useDatabase();
  
  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ConflictsDashboardFilters>({
    year: 'all',
    dranef: 'all',
    dpanef: 'all',
    commune: 'all',
    adp: 'all',
    type: 'all',
    axe: 'all',
    status: 'all',
    severity: 'all',
  });

  // Get metrics using the hook
  const metrics = useConflictsDashboard(filters);

  // Get available years from data
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Get DRANEF list
  const dranefs = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    data.regions.forEach(region => {
      region.dranef.forEach(dr => {
        list.push({ id: dr.id, name: dr.name });
      });
    });
    return list;
  }, [data.regions]);

  // Get DPANEF list based on selected DRANEF
  const dpanefs = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    data.regions.forEach(region => {
      region.dranef.forEach(dr => {
        if (filters.dranef === 'all' || dr.id === filters.dranef) {
          dr.dpanef.forEach(dp => {
            list.push({ id: dp.id, name: dp.name });
          });
        }
      });
    });
    return list;
  }, [data.regions, filters.dranef]);

  // Get communes based on selected DPANEF
  const communes = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    data.regions.forEach(region => {
      region.dranef.forEach(dr => {
        dr.dpanef.forEach(dp => {
          if (filters.dpanef === 'all' || dp.id === filters.dpanef) {
            dp.communes.forEach(c => {
              list.push({ id: c.id, name: c.name });
            });
          }
        });
      });
    });
    return list;
  }, [data.regions, filters.dpanef]);

  // Get ADPs
  const adps = getAdps();

  const updateFilter = (key: keyof ConflictsDashboardFilters, value: string) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      // Reset dependent filters
      if (key === 'dranef') {
        updated.dpanef = 'all';
        updated.commune = 'all';
      }
      if (key === 'dpanef') {
        updated.commune = 'all';
      }
      return updated;
    });
  };

  const resetFilters = () => {
    setFilters({
      year: 'all',
      dranef: 'all',
      dpanef: 'all',
      commune: 'all',
      adp: 'all',
      type: 'all',
      axe: 'all',
      status: 'all',
      severity: 'all',
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critique': return 'bg-red-100 text-red-700 border-red-200';
      case 'Élevée': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-4">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Tableau de bord
        </h2>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1"
        >
          <Filter className="h-4 w-4" />
          Filtres
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* Year */}
              <div>
                <Label className="text-xs mb-1 block">Année</Label>
                <Select value={filters.year} onValueChange={v => updateFilter('year', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DRANEF */}
              <div>
                <Label className="text-xs mb-1 block">DRANEF</Label>
                <Select value={filters.dranef} onValueChange={v => updateFilter('dranef', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {dranefs.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DPANEF */}
              <div>
                <Label className="text-xs mb-1 block">DPANEF</Label>
                <Select value={filters.dpanef} onValueChange={v => updateFilter('dpanef', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {dpanefs.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Commune */}
              <div>
                <Label className="text-xs mb-1 block">Commune</Label>
                <Select value={filters.commune} onValueChange={v => updateFilter('commune', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {communes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ADP */}
              <div>
                <Label className="text-xs mb-1 block">ADP</Label>
                <Select value={filters.adp} onValueChange={v => updateFilter('adp', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Tous</SelectItem>
                    {adps.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div>
                <Label className="text-xs mb-1 block">Type</Label>
                <Select value={filters.type} onValueChange={v => updateFilter('type', v as any)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="Conflit">Conflit</SelectItem>
                    <SelectItem value="Opposition">Opposition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Axe (ANEF–Population, Population–Population, ANEF–Institution) */}
              <div>
                <Label className="text-xs mb-1 block">Axe</Label>
                <Select value={filters.axe ?? 'all'} onValueChange={v => updateFilter('axe', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Tous</SelectItem>
                    {CONFLICT_AXES.map(axe => (
                      <SelectItem key={axe.id} value={axe.id}>{axe.shortLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label className="text-xs mb-1 block">Statut</Label>
                <Select value={filters.status} onValueChange={v => updateFilter('status', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Tous</SelectItem>
                    {statusOptions.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div>
                <Label className="text-xs mb-1 block">Gravité</Label>
                <Select value={filters.severity} onValueChange={v => updateFilter('severity', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {severityOptions.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {activeFiltersCount > 0 && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-xs">
                  <X className="h-3 w-3" />
                  Réinitialiser
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-primary/10 rounded-lg p-1.5">
                <AlertCircle className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total conflits</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.totalConflits}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-amber-500/10 rounded-lg p-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total oppositions</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.totalOppositions}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 border-l-2 border-l-yellow-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-yellow-500/10 rounded-lg p-1.5">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Ouverts</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{metrics.ouverts}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 border-l-2 border-l-green-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-green-500/10 rounded-lg p-1.5">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Résolus</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{metrics.resolus}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 border-l-2 border-l-red-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-red-500/10 rounded-lg p-1.5">
                <ArrowUpRight className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Escaladés</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{metrics.escalades}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 border-l-2 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-primary/10 rounded-lg p-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Taux résolution</span>
            </div>
            <div className="text-2xl font-bold text-primary">{metrics.tauxResolution}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Suivi des délits forestiers + Contribution approche participative */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-card border-border/50 border-l-4 border-l-rose-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-rose-500/10 rounded-lg p-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Suivi des délits</span>
            </div>
            <div className="text-2xl font-bold text-rose-600">{metrics.totalDelits}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Délits forestiers (ex. exploitation illégale)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 border-l-4 border-l-emerald-600">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-emerald-500/10 rounded-lg p-1.5">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Contribution approche participative</span>
            </div>
            {metrics.contributionApprocheParticipative !== null ? (
              <>
                <div className="text-2xl font-bold text-emerald-600">
                  {metrics.contributionApprocheParticipative > 0
                    ? `−${metrics.contributionApprocheParticipative} %`
                    : `${metrics.contributionApprocheParticipative} %`}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Réduction estimée des délits en zones ODF/coop. vs zones sans
                </p>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-muted-foreground">—</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Données insuffisantes (délits ou communes avec/sans ODF)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Relation logique</p>
                <p>
                  Délits en zones avec ODF/coop. : <strong>{metrics.delitsEnZonesParticipatives}</strong>
                  {metrics.nbCommunesAvecApprocheParticipative >= 0 && (
                    <span> ({metrics.nbCommunesAvecApprocheParticipative} comm. avec org.)</span>
                  )}
                </p>
                <p>
                  Délits en zones sans : <strong>{metrics.delitsEnZonesSansParticipatif}</strong>
                  {metrics.nbCommunesSansApprocheParticipative >= 0 && (
                    <span> ({metrics.nbCommunesSansApprocheParticipative} comm. sans)</span>
                  )}
                </p>
                <p>
                  La contribution est le % de réduction du taux (délits/commune) en zones à approche participative par rapport aux zones sans.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Row 2 - Oppositions specific */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-amber-50/50 border-amber-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-amber-500/10 rounded-lg p-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Oppositions en cours</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{metrics.oppositionsEnCours}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-green-500/10 rounded-lg p-1.5">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Oppositions levées</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{metrics.oppositionsLevees}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-primary/10 rounded-lg p-1.5">
                <Map className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Superficie opposée</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {metrics.superficieOpposition.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
              <span className="text-sm font-normal text-muted-foreground ml-1">ha</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-green-500/10 rounded-lg p-1.5">
                <MapPinCheck className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Superficie levée</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {metrics.superficieLevee.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
              <span className="text-sm font-normal text-muted-foreground ml-1">ha</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Évolution mensuelle (6 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={metrics.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="conflits" name="Conflits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="oppositions" name="Oppositions" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Répartition par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              {metrics.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={metrics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {metrics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">Aucune donnée</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Communes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top 5 communes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topCommunes.length > 0 ? (
              <div className="space-y-2">
                {metrics.topCommunes.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}</span>
                    <div className="flex-1 bg-muted/50 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-primary/20 h-full flex items-center px-2"
                        style={{
                          width: `${Math.max(20, (item.count / metrics.topCommunes[0].count) * 100)}%`,
                        }}
                      >
                        <span className="text-xs font-medium truncate">{item.name}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Natures */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Top 5 natures de conflits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topNatures.length > 0 ? (
              <div className="space-y-2">
                {metrics.topNatures.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}</span>
                    <div className="flex-1 bg-muted/50 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-amber-500/20 h-full flex items-center px-2"
                        style={{
                          width: `${Math.max(20, (item.count / metrics.topNatures[0].count) * 100)}%`,
                        }}
                      >
                        <span className="text-xs font-medium truncate">{item.name}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quality Alerts */}
      {metrics.qualityAlerts.totalAlerts > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Alertes qualité ({metrics.qualityAlerts.totalAlerts})
              <span className="text-xs font-normal text-muted-foreground ml-2">
                Données manquantes à corriger
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {metrics.qualityAlerts.oppositionsSansSuperficie > 0 && (
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Map className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">
                      Superficie manquante
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {metrics.qualityAlerts.oppositionsSansSuperficie}
                    <span className="text-xs font-normal text-muted-foreground ml-1">oppositions</span>
                  </p>
                </div>
              )}
              {metrics.qualityAlerts.resoluesSansDate > 0 && (
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">
                      Date de levée manquante
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {metrics.qualityAlerts.resoluesSansDate}
                    <span className="text-xs font-normal text-muted-foreground ml-1">résolues</span>
                  </p>
                </div>
              )}
            </div>
            {metrics.qualityAlerts.details.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Cas à corriger (cliquez pour éditer) :</p>
                <div className="flex flex-wrap gap-1">
                  {metrics.qualityAlerts.details.slice(0, 8).map((item) => (
                    <Badge
                      key={`${item.id}-${item.type}`}
                      variant="outline"
                      className="cursor-pointer hover:bg-amber-100 text-xs"
                      onClick={() => onViewConflict?.(item.id)}
                    >
                      {item.commune} - {item.type === 'missing_superficie' ? 'Superficie' : 'Date'}
                    </Badge>
                  ))}
                  {metrics.qualityAlerts.details.length > 8 && (
                    <Badge variant="secondary" className="text-xs">
                      +{metrics.qualityAlerts.details.length - 8} autres
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Priority Cases */}
      {metrics.priorityCases.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertOctagon className="h-4 w-4" />
              Cas prioritaires ({metrics.priorityCases.length})
              <span className="text-xs font-normal text-muted-foreground ml-2">
                En cours • Gravité Élevée/Critique
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.priorityCases.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-lg p-3 border border-red-100 hover:border-red-300 cursor-pointer transition-colors"
                  onClick={() => onViewConflict?.(c.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={cn(getSeverityColor(c.severity), 'text-xs border')}>
                          {c.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{c.commune}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatDate(c.dateReported)}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{c.nature}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConflictsDashboard;
