import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Activity, AlertTriangle, TrendingUp, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/contexts/DatabaseContext';
import BottomNav from '@/components/BottomNav';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(162, 100%, 21%)', 'hsl(153, 53%, 37%)', 'hsl(140, 30%, 60%)', 'hsl(0, 84%, 60%)'];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { getStats } = useDatabase();
  const stats = getStats();

  // Prepare data for charts
  const activitiesChartData = Object.entries(stats.activitiesByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
      activités: count,
    }));

  const conflictsPieData = Object.entries(stats.conflictsByStatus).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  const pdfcPieData = Object.entries(stats.pdfcByStatus).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate('/menu')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Tableau de Bord</h1>
            <p className="text-primary-foreground/80 text-sm">Vue d'ensemble des données</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalAdp}</p>
                <p className="text-xs text-muted-foreground">ADP Total</p>
              </div>
            </div>
            <p className="text-xs text-primary mt-2">{stats.activeAdp} actifs</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalPdfc}</p>
                <p className="text-xs text-muted-foreground">PDFCP</p>
              </div>
            </div>
            <p className="text-xs text-primary mt-2">{stats.pdfcByStatus['Finalisé'] || 0} finalisés</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/10 rounded-lg p-2">
                <Activity className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalActivities}</p>
                <p className="text-xs text-muted-foreground">Activités</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 rounded-lg p-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalConflicts}</p>
                <p className="text-xs text-muted-foreground">Conflits</p>
              </div>
            </div>
            <p className="text-xs text-destructive mt-2">{stats.conflictsByStatus['En cours'] || 0} en cours</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 rounded-lg p-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalOppositions}</p>
                <p className="text-xs text-muted-foreground">Oppositions</p>
              </div>
            </div>
            <p className="text-xs text-orange-500 mt-2">{stats.oppositionsByStatus['En cours'] || 0} en cours</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="px-4 space-y-4">
        {/* Activities Chart */}
        <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Activités par mois
          </h3>
          <div className="h-48">
            {activitiesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activitiesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="activités" fill="hsl(162, 100%, 21%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Pas de données
              </div>
            )}
          </div>
        </div>

        {/* Status Charts Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Conflicts by Status */}
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <h3 className="font-semibold text-foreground mb-3 text-sm">Conflits par statut</h3>
            <div className="h-32">
              {conflictsPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conflictsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {conflictsPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  Aucun conflit
                </div>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {conflictsPieData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PDFCP by Status */}
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <h3 className="font-semibold text-foreground mb-3 text-sm">PDFCP par statut</h3>
            <div className="h-32">
              {pdfcPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pdfcPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pdfcPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  Aucun PDFCP
                </div>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {pdfcPieData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
          <h3 className="font-semibold text-foreground mb-3">Résumé</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Conflits résolus</span>
              </div>
              <span className="font-semibold">{stats.conflictsByStatus['Résolu'] || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-muted-foreground">PDFCP en cours</span>
              </div>
              <span className="font-semibold">{stats.pdfcByStatus['En cours'] || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-secondary" />
                <span className="text-muted-foreground">Taux ADP actifs</span>
              </div>
              <span className="font-semibold">
                {stats.totalAdp > 0 ? Math.round((stats.activeAdp / stats.totalAdp) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default DashboardPage;
