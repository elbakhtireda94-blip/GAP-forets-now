import React from 'react';
import { BookOpen, Clock, Link2, AlertTriangle, TrendingUp, Calendar, Send, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useJournalDashboard } from '@/hooks/useJournalDashboard';
import { CahierJournalEntry, journalCategoryColors, JournalCategory } from '@/data/cahierJournalTypes';
import { WeeklySummaryExport } from './WeeklySummaryExport';

interface JournalDashboardProps {
  entries: CahierJournalEntry[];
}

const COLORS = ['#006A4E', '#2C8F6B', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722'];

export const JournalDashboard: React.FC<JournalDashboardProps> = ({ entries }) => {
  const stats = useJournalDashboard(entries);

  // Calculate submission/validation rates
  const drafts = entries.filter(e => e.statut_validation === 'Brouillon').length;
  const validated = entries.filter(e => e.statut_validation === 'Validé ADP').length;
  const transmitted = entries.filter(e => e.statut_validation === 'Transmis hiérarchie').length;
  const submissionRate = entries.length > 0 ? Math.round(((validated + transmitted) / entries.length) * 100) : 0;

  return (
    <div className="space-y-4 mb-6">
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-medium">7 derniers jours</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.last7Days}</p>
            <p className="text-xs text-muted-foreground">entrées</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">30 derniers jours</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.last30Days}</p>
            <p className="text-xs text-muted-foreground">entrées</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Temps terrain</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalTimeHours}h</p>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Link2 className="h-4 w-4" />
              <span className="text-xs font-medium">Liées PDFCP</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.linkedToPdfcpPercent}%</p>
            <p className="text-xs text-muted-foreground">des activités</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 2 - Workflow metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-medium">Brouillons</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{drafts}</p>
            <p className="text-xs text-muted-foreground">en attente</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Validées</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{validated}</p>
            <p className="text-xs text-muted-foreground">par ADP</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cyan-600 mb-1">
              <Send className="h-4 w-4" />
              <span className="text-xs font-medium">Transmises</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{transmitted}</p>
            <p className="text-xs text-muted-foreground">à la hiérarchie</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 3 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Besoin d'appui</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.needingAppuiPercent}%</p>
            <p className="text-xs text-muted-foreground">nécessitent un appui</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Taux soumission</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{submissionRate}%</p>
            <p className="text-xs text-muted-foreground">validées ou transmises</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Weekly Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Distribution */}
        {stats.byCategory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Répartition par catégorie</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {stats.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value} entrées`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {stats.byCategory.slice(0, 4).map((cat, idx) => (
                  <Badge 
                    key={cat.key} 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: COLORS[idx % COLORS.length], color: COLORS[idx % COLORS.length] }}
                  >
                    {cat.name.split(' ')[0]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Summary Export */}
        <WeeklySummaryExport entries={entries} />
      </div>

      {/* Weekly Evolution Chart */}
      {stats.weeklyEvolution.some(w => w.count > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Évolution hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyEvolution}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Activités" fill="#006A4E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Locations */}
      {stats.byCommune.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top lieux d'intervention</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {stats.byCommune.map((loc, idx) => (
                <div key={loc.name} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{loc.name}</span>
                  <Badge variant="secondary" className="ml-2">{loc.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JournalDashboard;
