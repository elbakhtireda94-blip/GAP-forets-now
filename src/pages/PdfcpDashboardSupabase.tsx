import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Wallet, TrendingUp, CheckCircle, Clock, 
  BarChart3, Eye, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import PageHeader from '@/components/PageHeader';
import FilterBarHierarchical, { HierarchicalFilters } from '@/components/FilterBarHierarchical';
import DataTable, { Column } from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { usePdfcpSupabase, PdfcpProgram } from '@/hooks/usePdfcpSupabase';
import { formatDh } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['hsl(162, 100%, 21%)', 'hsl(42, 100%, 50%)', 'hsl(220, 90%, 56%)', 'hsl(0, 70%, 50%)'];

const VALIDATION_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  CONCERTE_ADP: 'Concerté ADP',
  VALIDE_DPANEF: 'Validé DPANEF',
  VALIDE_CENTRAL: 'Validé Central',
  VERROUILLE: 'Verrouillé',
};

const PdfcpDashboardSupabase: React.FC = () => {
  const navigate = useNavigate();
  const { user, applyScopeFilter } = useAuth();
  const { getCommuneName, getDranefName, getDpanefName, getRegions } = useDatabase();
  const { programs, isProgramsLoading } = usePdfcpSupabase();

  const [filters, setFilters] = useState<HierarchicalFilters>({});

  // Filter programs
  const filteredPrograms = useMemo(() => {
    let result = programs;
    
    // Apply scope filter
    result = applyScopeFilter(result, 'pdfcp');
    
    // Apply user filters
    if (filters.year) {
      const year = parseInt(filters.year);
      result = result.filter(p => p.start_year <= year && p.end_year >= year);
    }
    if (filters.dranef) {
      result = result.filter(p => p.dranef_id === filters.dranef);
    }
    if (filters.dpanef) {
      result = result.filter(p => p.dpanef_id === filters.dpanef);
    }
    if (filters.commune) {
      result = result.filter(p => p.commune_id === filters.commune);
    }
    if (filters.status) {
      result = result.filter(p => p.validation_status === filters.status);
    }
    
    return result;
  }, [programs, filters, applyScopeFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredPrograms.length;
    const brouillon = filteredPrograms.filter(p => p.validation_status === 'BROUILLON').length;
    const concerteAdp = filteredPrograms.filter(p => p.validation_status === 'CONCERTE_ADP').length;
    const valideDpanef = filteredPrograms.filter(p => p.validation_status === 'VALIDE_DPANEF').length;
    const valideCentral = filteredPrograms.filter(p => p.validation_status === 'VALIDE_CENTRAL').length;
    const verrouille = filteredPrograms.filter(p => p.validation_status === 'VERROUILLE').length;
    const totalBudget = filteredPrograms.reduce((sum, p) => sum + (p.total_budget_dh || 0), 0);

    return { total, brouillon, concerteAdp, valideDpanef, valideCentral, verrouille, totalBudget };
  }, [filteredPrograms]);

  // Status distribution chart
  const statusChartData = useMemo(() => [
    { name: 'Brouillon', value: kpis.brouillon, color: 'hsl(220, 10%, 50%)' },
    { name: 'Concerté ADP', value: kpis.concerteAdp, color: 'hsl(220, 90%, 56%)' },
    { name: 'Validé DPANEF', value: kpis.valideDpanef, color: 'hsl(42, 100%, 50%)' },
    { name: 'Validé Central', value: kpis.valideCentral, color: 'hsl(162, 100%, 21%)' },
    { name: 'Verrouillé', value: kpis.verrouille, color: 'hsl(0, 70%, 50%)' },
  ].filter(d => d.value > 0), [kpis]);

  // By DRANEF chart
  const byDranefData = useMemo(() => {
    const counts: Record<string, { count: number; budget: number }> = {};
    filteredPrograms.forEach(p => {
      const name = getDranefName(p.dranef_id) || p.dranef_id;
      if (!counts[name]) counts[name] = { count: 0, budget: 0 };
      counts[name].count += 1;
      counts[name].budget += p.total_budget_dh || 0;
    });
    return Object.entries(counts)
      .map(([name, data]) => ({ name: name.substring(0, 15), fullName: name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredPrograms, getDranefName]);

  // By year chart
  const byYearData = useMemo(() => {
    const years: Record<number, number> = {};
    filteredPrograms.forEach(p => {
      for (let y = p.start_year; y <= p.end_year; y++) {
        years[y] = (years[y] || 0) + 1;
      }
    });
    return Object.entries(years)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [filteredPrograms]);

  // Top communes
  const topCommunes = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPrograms.forEach(p => {
      if (p.commune_id) {
        const name = getCommuneName(p.commune_id) || p.commune_id;
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredPrograms, getCommuneName]);

  // Table columns
  const columns: Column<PdfcpProgram>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (p) => <span className="font-mono text-xs">{p.code}</span>,
    },
    {
      key: 'title',
      header: 'Titre',
      sortable: true,
      render: (p) => <span className="font-medium">{p.title}</span>,
    },
    {
      key: 'commune_id',
      header: 'Commune',
      render: (p) => getCommuneName(p.commune_id) || '-',
    },
    {
      key: 'start_year',
      header: 'Période',
      sortable: true,
      render: (p) => `${p.start_year}-${p.end_year}`,
    },
    {
      key: 'total_budget_dh',
      header: 'Budget',
      sortable: true,
      className: 'text-right',
      render: (p) => <span className="font-mono">{formatDh(p.total_budget_dh)}</span>,
    },
    {
      key: 'validation_status',
      header: 'Statut',
      sortable: true,
      render: (p) => (
        <Badge variant={
          p.validation_status === 'VERROUILLE' ? 'destructive' :
          p.validation_status === 'VALIDE_CENTRAL' ? 'default' :
          p.validation_status === 'VALIDE_DPANEF' ? 'secondary' :
          p.validation_status === 'CONCERTE_ADP' ? 'outline' : 'secondary'
        } className="text-xs">
          {VALIDATION_STATUS_LABELS[p.validation_status] || p.validation_status}
        </Badge>
      ),
    },
  ];

  const statusOptions = [
    { value: 'BROUILLON', label: 'Brouillon' },
    { value: 'CONCERTE_ADP', label: 'Concerté ADP' },
    { value: 'VALIDE_DPANEF', label: 'Validé DPANEF' },
    { value: 'VALIDE_CENTRAL', label: 'Validé Central' },
    { value: 'VERROUILLE', label: 'Verrouillé' },
  ];

  if (isProgramsLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="bg-primary pt-8 pb-6 px-4">
          <Skeleton className="h-8 w-64 bg-primary-foreground/20" />
        </header>
        <div className="px-4 space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
        <BottomNav />
      </div>
    );
  }

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
            <h1 className="text-xl font-bold text-primary-foreground">Programmes en base centrale</h1>
            <p className="text-primary-foreground/70 text-sm">
              Liste des PDFCP enregistrés en base centrale — cliquez sur une ligne pour ouvrir le programme et accéder aux actions cartographiques.
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 -mt-3 space-y-4">
        {/* Filters */}
        <Card className="border-border/50 shadow-soft">
          <CardContent className="pt-4 pb-3">
            <FilterBarHierarchical
              filters={filters}
              onFiltersChange={setFilters}
              showStatus
              statusOptions={statusOptions}
            />
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            title="Total PDFCP"
            value={kpis.total}
            icon={FileText}
            trend="neutral"
            trendValue={`${kpis.verrouille} verrouillés`}
          />
          <KPICard
            title="Budget Total"
            value={formatDh(kpis.totalBudget)}
            icon={Wallet}
          />
          <KPICard
            title="Validé Central"
            value={kpis.valideCentral + kpis.verrouille}
            icon={CheckCircle}
            trend="up"
            trendValue={`${kpis.total > 0 ? Math.round(((kpis.valideCentral + kpis.verrouille) / kpis.total) * 100) : 0}%`}
          />
          <KPICard
            title="En attente"
            value={kpis.brouillon + kpis.concerteAdp + kpis.valideDpanef}
            icon={Clock}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status distribution */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Répartition par statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* By DRANEF */}
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Par DRANEF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDranefData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} PDFCP`, 'Nombre']} />
                    <Bar dataKey="count" fill="hsl(162, 100%, 21%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evolution by year */}
        {byYearData.length > 1 && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Évolution par année
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={byYearData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(162, 100%, 21%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(162, 100%, 21%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top communes */}
        {topCommunes.length > 0 && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Top 5 Communes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topCommunes.map((commune, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{commune.name}</span>
                    <Badge variant="secondary">{commune.count} PDFCP</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data table */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Liste des PDFCP ({filteredPrograms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Titre</th>
                    <th className="text-left p-2">Commune</th>
                    <th className="text-center p-2">Période</th>
                    <th className="text-right p-2">Budget</th>
                    <th className="text-center p-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.slice(0, 10).map(p => (
                    <tr 
                      key={p.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/pdfcp/${p.id}`)}
                    >
                      <td className="p-2 font-mono text-xs">{p.code}</td>
                      <td className="p-2 font-medium">{p.title}</td>
                      <td className="p-2">{getCommuneName(p.commune_id) || '-'}</td>
                      <td className="p-2 text-center">{p.start_year}-{p.end_year}</td>
                      <td className="p-2 text-right font-mono">{formatDh(p.total_budget_dh)}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          {VALIDATION_STATUS_LABELS[p.validation_status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default PdfcpDashboardSupabase;
