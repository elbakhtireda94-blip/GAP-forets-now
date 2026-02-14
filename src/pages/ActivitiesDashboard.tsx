import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Activity, Calendar, Users, MapPin, 
  BarChart3, PieChart as PieChartIcon, TrendingUp, CalendarDays
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
import BottomNav from '@/components/BottomNav';
import { useDatabase, Activity as ActivityType } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';

// Couleurs par type d'activité
const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  'Sensibilisation': 'hsl(220, 90%, 56%)',
  'Formation': 'hsl(280, 70%, 50%)',
  'Réunion': 'hsl(42, 100%, 50%)',
  'Atelier': 'hsl(162, 100%, 21%)',
  'Distribution': 'hsl(120, 60%, 40%)',
  'Visite terrain': 'hsl(180, 60%, 40%)',
  'Médiation': 'hsl(0, 70%, 50%)',
  'Suivi projet': 'hsl(200, 70%, 50%)',
  'Réunion communautaire': 'hsl(30, 80%, 50%)',
  'Accompagnement et/ou encadrement des organisations structurelles': 'hsl(300, 50%, 45%)',
  'Autre': 'hsl(0, 0%, 60%)',
};

const CHART_COLORS = [
  'hsl(162, 100%, 21%)', 
  'hsl(220, 90%, 56%)', 
  'hsl(42, 100%, 50%)', 
  'hsl(280, 70%, 50%)', 
  'hsl(0, 70%, 50%)',
  'hsl(180, 60%, 40%)',
  'hsl(120, 60%, 40%)',
  'hsl(30, 80%, 50%)',
  'hsl(300, 50%, 45%)',
  'hsl(0, 0%, 60%)',
];

const ActivitiesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, applyScopeFilter } = useAuth();
  const {
    getActivities,
    getCommuneName,
    getAdpName,
    getRegions,
  } = useDatabase();

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

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

  // Apply RBAC scope filter
  const scopedActivities = useMemo(() => {
    const allActivities = getActivities();
    return applyScopeFilter(allActivities, 'activity');
  }, [getActivities, applyScopeFilter]);

  // Get available years from activities
  const availableYears = useMemo(() => {
    const years = new Set(scopedActivities.map(a => a.date.substring(0, 4)));
    return Array.from(years).sort().reverse();
  }, [scopedActivities]);

  // Get available months
  const months = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
  ];

  // Get unique activity types
  const activityTypes = useMemo(() => {
    const types = new Set(scopedActivities.map(a => a.type));
    return Array.from(types).sort();
  }, [scopedActivities]);

  // Apply filters
  const filteredActivities = useMemo(() => {
    return scopedActivities.filter(activity => {
      if (selectedYear !== 'all' && !activity.date.startsWith(selectedYear)) return false;
      if (selectedMonth !== 'all') {
        const actMonth = activity.date.substring(5, 7);
        if (actMonth !== selectedMonth) return false;
      }
      if (selectedType !== 'all' && activity.type !== selectedType) return false;
      return true;
    });
  }, [scopedActivities, selectedYear, selectedMonth, selectedType]);

  // KPIs
  const kpis = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const thisMonth = filteredActivities.filter(a => a.date.startsWith(currentMonth)).length;
    const totalParticipants = filteredActivities.reduce((sum, a) => sum + (a.participants || 0), 0);
    const avgParticipants = filteredActivities.length > 0 
      ? Math.round(totalParticipants / filteredActivities.length) 
      : 0;
    const uniqueCommunes = new Set(filteredActivities.map(a => a.commune_id)).size;

    return {
      total: filteredActivities.length,
      thisMonth,
      totalParticipants,
      avgParticipants,
      uniqueCommunes,
    };
  }, [filteredActivities]);

  // Distribution by type (pie chart)
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredActivities.forEach(a => {
      const type = a.type || 'Autre';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredActivities]);

  // Monthly evolution (line chart)
  const monthlyEvolution = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    filteredActivities.forEach(a => {
      const month = a.date.substring(0, 7);
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    return Object.entries(monthCounts)
      .map(([month, count]) => {
        const [year, m] = month.split('-');
        const monthName = months.find(mo => mo.value === m)?.label || m;
        return {
          month: `${monthName.substring(0, 3)} ${year.substring(2)}`,
          fullMonth: month,
          activites: count,
        };
      })
      .sort((a, b) => a.fullMonth.localeCompare(b.fullMonth))
      .slice(-12); // Last 12 months
  }, [filteredActivities]);

  // Distribution by commune (bar chart)
  const communeDistribution = useMemo(() => {
    const counts: Record<string, { id: string; count: number; participants: number }> = {};
    filteredActivities.forEach(a => {
      if (!counts[a.commune_id]) {
        counts[a.commune_id] = { id: a.commune_id, count: 0, participants: 0 };
      }
      counts[a.commune_id].count += 1;
      counts[a.commune_id].participants += a.participants || 0;
    });
    return Object.values(counts)
      .map(c => ({
        name: getCommuneName(c.id) || c.id,
        activites: c.count,
        participants: c.participants,
      }))
      .sort((a, b) => b.activites - a.activites)
      .slice(0, 10); // Top 10 communes
  }, [filteredActivities, getCommuneName]);

  // Participants by type (bar chart)
  const participantsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredActivities.forEach(a => {
      const type = a.type || 'Autre';
      counts[type] = (counts[type] || 0) + (a.participants || 0);
    });
    return Object.entries(counts)
      .map(([type, participants]) => ({ 
        type: type.length > 15 ? type.substring(0, 15) + '…' : type, 
        fullType: type,
        participants 
      }))
      .sort((a, b) => b.participants - a.participants);
  }, [filteredActivities]);

  // Recent activities table
  const recentActivities = useMemo(() => {
    return [...filteredActivities]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [filteredActivities]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate('/activites')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Tableau de bord Activités</h1>
            <p className="text-primary-foreground/80 text-sm">{getUserContextLabel()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 bg-muted/30 border-b border-border">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Année</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Toutes</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Mois</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Tous</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Tous</SelectItem>
                {activityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.length > 20 ? type.substring(0, 20) + '…' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 py-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.total}</p>
            <p className="text-xs text-muted-foreground">Total activités</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <CalendarDays className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.thisMonth}</p>
            <p className="text-xs text-muted-foreground">Ce mois</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.totalParticipants.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-muted-foreground">Participants</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.avgParticipants}</p>
            <p className="text-xs text-muted-foreground">Moy. participants</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <MapPin className="h-6 w-6 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.uniqueCommunes}</p>
            <p className="text-xs text-muted-foreground">Communes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="px-4 py-2 grid md:grid-cols-2 gap-4">
        {/* Type Distribution Pie Chart */}
        <Card className="bg-card border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Répartition par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name.length > 10 ? name.substring(0, 10) + '…' : name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={ACTIVITY_TYPE_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Activités']}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Evolution Line Chart */}
        <Card className="bg-card border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyEvolution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="activites" 
                    stroke="hsl(162, 100%, 21%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(162, 100%, 21%)' }}
                    name="Activités"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="px-4 py-2 grid md:grid-cols-2 gap-4">
        {/* Commune Distribution Bar Chart */}
        <Card className="bg-card border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Top 10 Communes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {communeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={communeDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 9 }} 
                    width={100}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="activites" fill="hsl(162, 100%, 21%)" name="Activités" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants by Type Bar Chart */}
        <Card className="bg-card border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Participants par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participantsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={participantsByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="type" 
                    tick={{ fontSize: 9 }} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string, props: any) => [
                      value.toLocaleString('fr-FR'),
                      props.payload.fullType
                    ]}
                  />
                  <Bar dataKey="participants" fill="hsl(220, 90%, 56%)" name="Participants" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities Table */}
      <div className="px-4 py-4">
        <Card className="bg-card border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Activités récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Commune</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Participants</TableHead>
                    <TableHead className="text-xs font-semibold">ADP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aucune activité
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentActivities.map(activity => (
                      <TableRow 
                        key={activity.id} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate('/activites')}
                      >
                        <TableCell className="text-xs">{formatDate(activity.date)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: `${ACTIVITY_TYPE_COLORS[activity.type] || 'hsl(0, 0%, 60%)'}20`,
                              borderColor: ACTIVITY_TYPE_COLORS[activity.type] || 'hsl(0, 0%, 60%)',
                              color: ACTIVITY_TYPE_COLORS[activity.type] || 'hsl(0, 0%, 60%)'
                            }}
                          >
                            {activity.type.length > 15 ? activity.type.substring(0, 15) + '…' : activity.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{getCommuneName(activity.commune_id) || '-'}</TableCell>
                        <TableCell className="text-center text-xs font-medium">
                          {activity.participants || 0}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {getAdpName(activity.adp_id) || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation to full list */}
      <div className="px-4 pb-4">
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => navigate('/activites')}
        >
          <Activity className="h-4 w-4" />
          Voir toutes les activités
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ActivitiesDashboard;
