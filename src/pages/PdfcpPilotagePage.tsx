/**
 * PdfcpPilotagePage — Interactive PDFCP dashboard with map, KPIs, alerts, and comparative table.
 * Bidirectional interactions: map ↔ KPIs ↔ alerts ↔ comparative table.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Wallet,
  TrendingUp,
  AlertTriangle,
  MapPin,
  BarChart3,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KPICard from '@/components/KPICard';
import MoroccoMap, { KpiHighlightMode } from '@/components/MoroccoMap';
import DashboardBreadcrumb from '@/components/DashboardBreadcrumb';
import PdfcpAlertesPanel from '@/components/pdfcp/PdfcpAlertesPanel';
import BottomNav from '@/components/BottomNav';
import { usePdfcpAlerts, PdfcpAlert } from '@/hooks/usePdfcpAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useDynamicYears } from '@/hooks/useDynamicYears';
import { normalizeRegionName } from '@/data/moroccoRegions';
import { formatDh, formatNumber } from '@/lib/formatters';
import type { DrillDownLevel } from '@/hooks/useDrillDownNavigation';
import { cn } from '@/lib/utils';

// --- Taux execution color logic ---

function getTauxColor(taux: number): string {
  if (taux >= 95) return 'text-green-700';
  if (taux >= 80) return 'text-emerald-600';
  if (taux >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getTauxBg(taux: number): string {
  if (taux >= 95) return 'bg-green-100 border-green-200';
  if (taux >= 80) return 'bg-emerald-100 border-emerald-200';
  if (taux >= 60) return 'bg-amber-100 border-amber-200';
  return 'bg-red-100 border-red-200';
}

// --- Main Component ---

const PdfcpPilotagePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getDranefName, getDpanefName, getCommuneName, getDpanefsByDranef, getCommunesByDpanef } = useDatabase();
  const { currentYear } = useDynamicYears();

  // --- Drill-down state ---
  const [selectedDranef, setSelectedDranef] = useState('');
  const [selectedDpanef, setSelectedDpanef] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [activeKpi, setActiveKpi] = useState<KpiHighlightMode>(null);

  // Current drill-down level
  const currentLevel = useMemo<DrillDownLevel>(() => {
    if (selectedCommune && selectedCommune !== 'all') return 'commune';
    if (selectedDpanef && selectedDpanef !== 'all') return 'dpanef';
    if (selectedDranef && selectedDranef !== 'all') return 'region';
    return 'national';
  }, [selectedDranef, selectedDpanef, selectedCommune]);

  // Human-readable names
  const dranefName = useMemo(() => {
    if (!selectedDranef || selectedDranef === 'all') return undefined;
    return getDranefName(selectedDranef) || selectedDranef;
  }, [selectedDranef, getDranefName]);

  const dpanefName = useMemo(() => {
    if (!selectedDpanef || selectedDpanef === 'all') return undefined;
    return getDpanefName(selectedDpanef) || selectedDpanef;
  }, [selectedDpanef, getDpanefName]);

  const communeName = useMemo(() => {
    if (!selectedCommune || selectedCommune === 'all') return undefined;
    return getCommuneName(selectedCommune) || selectedCommune;
  }, [selectedCommune, getCommuneName]);

  // Province name for map
  const selectedProvinceName = useMemo(() => {
    if (!selectedDpanef || selectedDpanef === 'all') return undefined;
    const name = getDpanefName(selectedDpanef);
    if (!name) return undefined;
    return name.replace(/^DPANEF\s*/i, '').trim();
  }, [selectedDpanef, getDpanefName]);

  // Communes for map
  const communesForMap = useMemo(() => {
    if (currentLevel !== 'dpanef' && currentLevel !== 'commune') return [];
    if (!selectedDpanef || selectedDpanef === 'all') return [];
    return getCommunesByDpanef(selectedDpanef);
  }, [currentLevel, selectedDpanef, getCommunesByDpanef]);

  // --- Alerts hook with filters ---
  const alertFilters = useMemo(() => ({
    dranefId: selectedDranef && selectedDranef !== 'all' ? selectedDranef : undefined,
    dpanefId: selectedDpanef && selectedDpanef !== 'all' ? selectedDpanef : undefined,
    communeId: selectedCommune && selectedCommune !== 'all' ? selectedCommune : undefined,
  }), [selectedDranef, selectedDpanef, selectedCommune]);

  const { alerts, summary, kpis, isLoading } = usePdfcpAlerts(alertFilters);

  // --- Region data for map (alerts by region) ---
  const { regionStats, mapData, regionDataByKpi } = useMemo(() => {
    // Build region-level alert counts for map coloring
    const alertsByRegion = new Map<string, { total: number; critique: number }>();
    alerts.forEach(a => {
      const dranef = getDranefName(a.dranef_id) || a.dranef_id;
      const current = alertsByRegion.get(dranef) || { total: 0, critique: 0 };
      current.total++;
      if (a.severity === 'critique') current.critique++;
      alertsByRegion.set(dranef, current);
    });

    const stats = Array.from(alertsByRegion.entries()).map(([region, counts]) => ({
      region,
      regionId: '', // Will be matched by normalizeRegionName
      ...counts,
    }));

    const regionDataByKpi: Record<string, Record<string, number>> = {
      alertes: {},
      critiques: {},
    };

    stats.forEach(s => {
      const normalized = normalizeRegionName(s.region);
      if (normalized) {
        regionDataByKpi.alertes[normalized] = s.total;
        regionDataByKpi.critiques[normalized] = s.critique;
      }
    });

    // Default map data: show alert counts
    const mapData = stats.map(s => ({
      name: normalizeRegionName(s.region) || s.region,
      value: s.total,
    }));

    return { regionStats: stats, mapData, regionDataByKpi };
  }, [alerts, getDranefName]);

  // --- Selected region name for map ---
  const selectedRegionName = useMemo(() => {
    if (!selectedDranef || selectedDranef === 'all') return undefined;
    const name = getDranefName(selectedDranef);
    if (!name) return undefined;
    return normalizeRegionName(name) || name;
  }, [selectedDranef, getDranefName]);

  // --- Handlers ---
  const handleRegionClick = useCallback((regionNameFromMap: string) => {
    if (!regionNameFromMap) {
      setSelectedDranef('');
      setSelectedDpanef('');
      setSelectedCommune('');
      return;
    }
    // We need to find the DRANEF ID from the region name
    // For now, store the region name - the alerts hook will filter by dranef_id
    // We'll match via getDranefName
    setSelectedDranef(regionNameFromMap);
    setSelectedDpanef('');
    setSelectedCommune('');
  }, []);

  const handleProvinceClick = useCallback((provinceName: string) => {
    if (!provinceName) return;
    const availableDpanefs = selectedDranef ? getDpanefsByDranef(selectedDranef) : [];
    const normalizedProvince = provinceName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const matched = availableDpanefs.find(dp => {
      const normalizedDp = dp.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/dpanef\s*/i, '')
        .replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      return normalizedDp.includes(normalizedProvince) || normalizedProvince.includes(normalizedDp);
    });
    if (matched) {
      setSelectedDpanef(matched.id);
      setSelectedCommune('');
    }
  }, [selectedDranef, getDpanefsByDranef]);

  const handleCommuneClick = useCallback((communeId: string) => {
    setSelectedCommune(communeId);
  }, []);

  const handleBreadcrumbNavigate = useCallback((level: DrillDownLevel) => {
    switch (level) {
      case 'national':
        setSelectedDranef('');
        setSelectedDpanef('');
        setSelectedCommune('');
        break;
      case 'region':
        setSelectedDpanef('');
        setSelectedCommune('');
        break;
      case 'dpanef':
        setSelectedCommune('');
        break;
    }
  }, []);

  const handleResetAll = useCallback(() => {
    setSelectedDranef('');
    setSelectedDpanef('');
    setSelectedCommune('');
    setActiveKpi(null);
  }, []);

  const handleAlertClick = useCallback((alert: PdfcpAlert) => {
    // Navigate to the PDFCP detail page
    navigate(`/pdfcp/${alert.pdfcp_id}`);
  }, [navigate]);

  const handleKpiClick = useCallback((kpiId: KpiHighlightMode) => {
    setActiveKpi(prev => prev === kpiId ? null : kpiId);
  }, []);

  // --- Comparative table data ---
  const comparativeData = useMemo(() => {
    // Group alerts by year for a summary view
    const byYear = new Map<number, {
      year: number;
      retard: number;
      ecart: number;
      depassement: number;
      faibleTaux: number;
      critique: number;
      warning: number;
    }>();

    alerts.forEach(a => {
      if (!byYear.has(a.year)) {
        byYear.set(a.year, {
          year: a.year,
          retard: 0,
          ecart: 0,
          depassement: 0,
          faibleTaux: 0,
          critique: 0,
          warning: 0,
        });
      }
      const entry = byYear.get(a.year)!;
      if (a.type === 'retard_execution') entry.retard++;
      if (a.type === 'ecart_cp_concerte') entry.ecart++;
      if (a.type === 'depassement_budget') entry.depassement++;
      if (a.type === 'faible_taux') entry.faibleTaux++;
      if (a.severity === 'critique') entry.critique++;
      if (a.severity === 'warning') entry.warning++;
    });

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [alerts]);

  // Context label
  const contextLabel = useMemo(() => {
    if (!user) return '';
    switch (user.scope_level) {
      case 'ADMIN':
      case 'NATIONAL':
        return 'Pilotage national PDFCP';
      case 'REGIONAL':
        return `Pilotage régional – ${user.role_label}`;
      case 'PROVINCIAL':
        return `Pilotage provincial – ${user.role_label}`;
      case 'LOCAL':
        return `Pilotage terrain – ${user.name}`;
      default:
        return '';
    }
  }, [user]);

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
            <h1 className="text-xl font-bold text-primary-foreground">Pilotage PDFCP</h1>
            <p className="text-primary-foreground/70 text-sm">{contextLabel}</p>
          </div>
        </div>
      </header>

      <div className="px-4 -mt-3 space-y-4">
        {/* Breadcrumb */}
        <DashboardBreadcrumb
          selectedDranef={selectedDranef}
          selectedDpanef={selectedDpanef}
          selectedCommune={selectedCommune}
          dranefName={dranefName}
          dpanefName={dpanefName}
          communeName={communeName}
          onNavigate={handleBreadcrumbNavigate}
          onReset={handleResetAll}
          className="animate-slide-up"
        />

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <KPICard
            title="PDFCP"
            value={kpis.totalPdfcp}
            icon={FileText}
            trend="neutral"
            kpiId="pdfcp"
            isActive={activeKpi === 'pdfcp'}
            onClick={() => handleKpiClick('pdfcp')}
          />
          <KPICard
            title="Budget CP"
            value={formatDh(kpis.budgetCp)}
            icon={Wallet}
            trend="neutral"
          />
          <KPICard
            title="Budget Exécuté"
            value={formatDh(kpis.budgetExec)}
            icon={Wallet}
            trend={kpis.tauxExecution >= 80 ? 'up' : kpis.tauxExecution >= 60 ? 'neutral' : 'down'}
            trendValue={`${kpis.tauxExecution}% exécution`}
          />
          <div className={cn(
            'rounded-2xl p-5 shadow-card border transition-all',
            getTauxBg(kpis.tauxExecution)
          )}>
            <p className="text-sm font-medium text-muted-foreground mb-1">Taux Global</p>
            <p className={cn('text-3xl font-bold', getTauxColor(kpis.tauxExecution))}>
              {kpis.tauxExecution}%
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">
                {summary.critique} critique{summary.critique !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {summary.warning} alerte{summary.warning !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main content: Map + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {/* Left: Map */}
          <div className="lg:col-span-7">
            <Card className="border-border/50 shadow-soft overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Carte de pilotage PDFCP
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[420px]">
                  <MoroccoMap
                    data={mapData}
                    selectedRegion={selectedRegionName}
                    onRegionClick={handleRegionClick}
                    onProvinceClick={handleProvinceClick}
                    onCommuneClick={handleCommuneClick}
                    communeList={communesForMap}
                    selectedProvinceName={selectedProvinceName}
                    indicator="alertes"
                    highlightMode={activeKpi}
                    regionDataByKpi={regionDataByKpi}
                    drillLevel={currentLevel}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Alerts Panel */}
          <div className="lg:col-span-5">
            <PdfcpAlertesPanel
              alerts={alerts}
              onAlertClick={handleAlertClick}
              className="h-full"
            />
          </div>
        </div>

        {/* Comparative Alerts Summary Table */}
        <Card className="border-border/50 shadow-soft animate-slide-up" style={{ animationDelay: '150ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Synthèse des alertes par année
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparativeData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {isLoading ? 'Chargement...' : 'Aucune donnée comparative disponible'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Année</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">⏱️ Retards</span>
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">↕️ Écarts</span>
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">💰 Dépass.</span>
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">📉 Faible taux</span>
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">🔴 Critiques</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">🟠 Attention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparativeData.map(row => (
                      <tr key={row.year} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-semibold">{row.year}</td>
                        <td className="text-center py-2 px-3">
                          <Badge variant={row.retard > 0 ? 'destructive' : 'secondary'} className="text-xs">
                            {row.retard}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant={row.ecart > 0 ? 'outline' : 'secondary'} className="text-xs">
                            {row.ecart}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant={row.depassement > 0 ? 'destructive' : 'secondary'} className="text-xs">
                            {row.depassement}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge
                            className={cn(
                              'text-xs',
                              row.faibleTaux > 0
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {row.faibleTaux}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          {row.critique > 0 ? (
                            <span className="text-red-600 font-bold">{row.critique}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="text-center py-2 px-3">
                          {row.warning > 0 ? (
                            <span className="text-amber-600 font-semibold">{row.warning}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default PdfcpPilotagePage;
