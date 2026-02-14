import React, { useState, useMemo, useCallback } from 'react';
import { Users, FileText, TreePine, AlertTriangle, Gavel, Map, Bug, Building2 } from 'lucide-react';
import KPICard from '@/components/KPICard';
import FilterBar from '@/components/FilterBar';
import DashboardBreadcrumb from '@/components/DashboardBreadcrumb';
import MoroccoMap, { KpiHighlightMode } from '@/components/MoroccoMap';

import StatsTable from '@/components/StatsTable';
import DemoBadge from '@/components/DemoBadge';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardStats, StatsFilters } from '@/hooks/useDashboardStats';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useDynamicYears } from '@/hooks/useDynamicYears';
import { normalizeRegionName, MOROCCO_REGIONS } from '@/data/moroccoRegions';
import { type DrillDownLevel } from '@/hooks/useDrillDownNavigation';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { getDranefName, getDpanefName, getCommuneName, getDpanefsByDranef, getCommunesByDpanef } = useDatabase();
  const { currentYear } = useDynamicYears();
  
  // Default to current year (e.g., 2026)
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDranef, setSelectedDranef] = useState('');
  const [selectedDpanef, setSelectedDpanef] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedIndicator, setSelectedIndicator] = useState('pdfcp');
  const [debugMode, setDebugMode] = useState(false);
  
  // NEW: KPI highlight mode for bidirectional sync
  const [activeKpi, setActiveKpi] = useState<KpiHighlightMode>(null);

  // Build filters object - only include non-empty values
  const filters: StatsFilters = {
    dranef: selectedDranef && selectedDranef !== 'all' ? selectedDranef : undefined,
    dpanef: selectedDpanef && selectedDpanef !== 'all' ? selectedDpanef : undefined,
    commune: selectedCommune && selectedCommune !== 'all' ? selectedCommune : undefined,
    year: selectedYear && selectedYear !== 'all' ? selectedYear : undefined,
  };

  // Get stats from unified DatabaseContext source
  const { stats, regionStats } = useDashboardStats(filters);

  // Get human-readable names for breadcrumb
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

  // Get available drill-down options for current level
  const drillDownOptions = useMemo(() => {
    if (selectedDranef && selectedDranef !== 'all' && (!selectedDpanef || selectedDpanef === 'all')) {
      return getDpanefsByDranef(selectedDranef);
    }
    if (selectedDpanef && selectedDpanef !== 'all' && (!selectedCommune || selectedCommune === 'all')) {
      return getCommunesByDpanef(selectedDpanef);
    }
    return [];
  }, [selectedDranef, selectedDpanef, selectedCommune, getDpanefsByDranef, getCommunesByDpanef]);

  // Get current drill-down level
  const currentLevel = useMemo<DrillDownLevel>(() => {
    if (selectedCommune && selectedCommune !== 'all') return 'commune';
    if (selectedDpanef && selectedDpanef !== 'all') return 'dpanef';
    if (selectedDranef && selectedDranef !== 'all') return 'region';
    return 'national';
  }, [selectedDranef, selectedDpanef, selectedCommune]);

  // Commune data for map when at DPANEF level
  const communesForMap = useMemo(() => {
    if (currentLevel !== 'dpanef' && currentLevel !== 'commune') return [];
    if (!selectedDpanef || selectedDpanef === 'all') return [];
    return getCommunesByDpanef(selectedDpanef);
  }, [currentLevel, selectedDpanef, getCommunesByDpanef]);

  // Province name for map matching (strip "DPANEF " prefix)
  const selectedProvinceName = useMemo(() => {
    if (!selectedDpanef || selectedDpanef === 'all') return undefined;
    const name = getDpanefName(selectedDpanef);
    if (!name) return undefined;
    return name.replace(/^DPANEF\s*/i, '').trim();
  }, [selectedDpanef, getDpanefName]);

  // Handle commune click from map
  const handleCommuneClick = useCallback((communeId: string) => {
    setSelectedCommune(communeId);
  }, []);

  // Build region data by KPI type for map highlighting
  // Use official region names (normalized) for proper map matching
  const regionDataByKpi = useMemo(() => {
    const result: Record<string, Record<string, number>> = {
      adp: {},
      pdfcp: {},
      odf: {},
      activites: {},
      oppositions: {},
      conflits: {},
      organisations: {},
    };
    
    regionStats.forEach(r => {
      // Convert DRANEF name to official region name for map matching
      const officialName = normalizeRegionName(r.region) || r.region;
      result.adp[officialName] = r.adp;
      result.pdfcp[officialName] = r.pdfcp;
      result.odf[officialName] = r.odf;
      result.activites[officialName] = r.activites;
      result.oppositions[officialName] = r.oppositions;
      result.conflits[officialName] = r.conflits;
      // For organisations, we'll use a default count (could be enhanced)
      result.organisations[officialName] = r.adp > 0 ? 1 : 0;
    });
    
    return result;
  }, [regionStats]);

  // Map data based on selected indicator or active KPI
  // Use official region names for proper map matching
  const mapData = useMemo(() => {
    const indicatorToUse = activeKpi || selectedIndicator;
    return regionStats.map(r => {
      // Convert DRANEF name to official region name
      const officialName = normalizeRegionName(r.region) || r.region;
      return {
        name: officialName,
        value: indicatorToUse === 'adp' ? r.adp :
               indicatorToUse === 'pdfcp' ? r.pdfcp :
               indicatorToUse === 'odf' ? r.odf :
               indicatorToUse === 'oppositions' ? r.oppositions :
               indicatorToUse === 'conflits' ? r.conflits : r.activites,
      };
    });
  }, [regionStats, selectedIndicator, activeKpi]);

  const indicators = [
    { id: 'adp', label: 'ADP' },
    { id: 'pdfcp', label: 'PDFCP' },
    { id: 'odf', label: 'ODF' },
    { id: 'activites', label: 'Activités' },
    { id: 'oppositions', label: 'Oppositions' },
    { id: 'conflits', label: 'Conflits' },
  ];

  const getIndicatorLabel = () => {
    const indicatorToUse = activeKpi || selectedIndicator;
    return indicators.find(i => i.id === indicatorToUse)?.label || 'Indicateur';
  };

  // Check if user is admin for debug mode visibility
  const isAdmin = user?.role === 'admin';

  // Handle KPI card click - toggle highlight mode
  const handleKpiClick = useCallback((kpiId: KpiHighlightMode) => {
    setActiveKpi(prev => prev === kpiId ? null : kpiId);
    // Also update the indicator tabs to match
    if (kpiId) {
      setSelectedIndicator(kpiId);
    }
  }, []);

  // Handle region selection with filter sync
  // The map sends official region names like "Souss-Massa"
  // We need to find the matching DRANEF ID from regionStats
  const handleRegionClick = useCallback((regionNameFromMap: string) => {
    if (!regionNameFromMap) {
      // Reset to national view
      setSelectedDranef('');
      setSelectedDpanef('');
      setSelectedCommune('');
      return;
    }
    
    // The map sends normalized official region names (e.g., "Souss-Massa")
    // regionStats.region contains DRANEF names without "DRANEF " prefix (e.g., "Rabat-Salé-Kénitra")
    // We need to match using the normalizeRegionName function
    
    // First, find the regionStats entry that matches the official region name
    let matchingRegion = regionStats.find(r => {
      // Try to normalize the DRANEF name and see if it matches
      const normalizedDranefName = normalizeRegionName(r.region);
      return normalizedDranefName === regionNameFromMap;
    });
    
    // If no match found, try direct match (DRANEF name might already be the official region name)
    if (!matchingRegion) {
      matchingRegion = regionStats.find(r => r.region === regionNameFromMap);
    }
    
    // If still no match, try to match the official region name directly
    if (!matchingRegion) {
      // The region might not have data, but we should still allow selection
      // Try to find by checking if normalizing the incoming name matches any region
      matchingRegion = regionStats.find(r => {
        const normalizedIncoming = normalizeRegionName(regionNameFromMap);
        const normalizedStored = normalizeRegionName(r.region);
        return normalizedIncoming === normalizedStored;
      });
    }
    
    if (matchingRegion) {
      setSelectedDranef(matchingRegion.regionId);
    } else {
      // Region not found in data - the map shows this region but we don't have data
      // Keep the map selection visual but don't filter (reset filter)
      console.log(`[Dashboard] Region "${regionNameFromMap}" not found in regionStats`);
    }
    
    setSelectedDpanef('');
    setSelectedCommune('');
  }, [regionStats]);

  // Reset all filters (map + KPI)
  const handleResetAll = useCallback(() => {
    setSelectedDranef('');
    setSelectedDpanef('');
    setSelectedCommune('');
    setActiveKpi(null);
    setSelectedIndicator('pdfcp');
  }, []);

  // Handle breadcrumb navigation (drill-up)
  const handleBreadcrumbNavigate = useCallback((level: 'national' | 'region' | 'dpanef' | 'commune') => {
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

  // Handle drill-down into DPANEF or Commune (from list clicks)
  const handleDrillDown = useCallback((type: 'dpanef' | 'commune', id: string) => {
    if (type === 'dpanef') {
      setSelectedDpanef(id);
      setSelectedCommune('');
    } else if (type === 'commune') {
      setSelectedCommune(id);
    }
  }, []);

  // Handle province click from the map (match province name to DPANEF)
  const handleProvinceClick = useCallback((provinceName: string) => {
    if (!provinceName) return;
    
    // Try to match the province name to a DPANEF in the current region
    const availableDpanefs = selectedDranef ? getDpanefsByDranef(selectedDranef) : [];
    
    // Normalize for comparison
    const normalizedProvince = provinceName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    const matchedDpanef = availableDpanefs.find(dp => {
      const normalizedDpanef = dp.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/dpanef\s*/i, '')
        .replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      return normalizedDpanef.includes(normalizedProvince) || normalizedProvince.includes(normalizedDpanef);
    });
    
    if (matchedDpanef) {
      setSelectedDpanef(matchedDpanef.id);
      setSelectedCommune('');
    }
  }, [selectedDranef, getDpanefsByDranef]);

  // Selected region name for map highlighting
  const selectedRegionName = useMemo(() => {
    if (!selectedDranef || selectedDranef === 'all') return undefined;
    const regionStat = regionStats.find(r => r.regionId === selectedDranef);
    if (!regionStat) return undefined;
    return normalizeRegionName(regionStat.region) || regionStat.region;
  }, [selectedDranef, regionStats]);

  // Check if any filter is active
  const hasActiveFilters = selectedDranef || selectedDpanef || selectedCommune || activeKpi;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="bg-primary pt-8 pb-6 px-4">
        <h1 className="text-xl font-bold text-primary-foreground text-center">
          Dashboard National
        </h1>
        <p className="text-primary-foreground/70 text-sm text-center mt-1">
          Suivi des indicateurs ANEF
        </p>
      </header>

      <div className="px-4 -mt-3 space-y-4">
        {/* Filters */}
        <div className="animate-slide-up">
          <FilterBar
            selectedYear={selectedYear}
            selectedDranef={selectedDranef}
            selectedDpanef={selectedDpanef}
            selectedCommune={selectedCommune}
            onYearChange={setSelectedYear}
            onDranefChange={setSelectedDranef}
            onDpanefChange={setSelectedDpanef}
            onCommuneChange={setSelectedCommune}
          />
        </div>

        {/* Admin Debug Toggle */}
        {isAdmin && (
          <div className="flex items-center gap-2 justify-end">
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
            <Label htmlFor="debug-mode" className="text-xs text-muted-foreground flex items-center gap-1">
              <Bug className="h-3 w-3" />
              Mode debug
            </Label>
          </div>
        )}

        {/* Interactive Breadcrumb for Drill-Down Navigation */}
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

        {/* Main Grid: KPIs + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {/* Left Column: KPI Cards */}
          <div className="lg:col-span-5 space-y-4">
            {/* KPI Grid - 3 rows - Synchronized with Map Filter */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard
                title="Total ADP"
                value={stats.totalAdp}
                icon={Users}
                trend="up"
                trendValue={`${stats.activeAdp} actif${stats.activeAdp > 1 ? 's' : ''}`}
                kpiId="adp"
                isActive={activeKpi === 'adp'}
                onClick={() => handleKpiClick('adp')}
                className="transition-all duration-300 ease-out"
              />
              <KPICard
                title="PDFCP"
                value={stats.totalPdfcp}
                icon={FileText}
                trend="up"
                trendValue={`${stats.pdfcpValides} validés`}
                kpiId="pdfcp"
                isActive={activeKpi === 'pdfcp'}
                onClick={() => handleKpiClick('pdfcp')}
                className="transition-all duration-300 ease-out"
              />
              <KPICard
                title="ODF Constitués"
                value={stats.totalOdf}
                icon={TreePine}
                trend="neutral"
                kpiId="odf"
                isActive={activeKpi === 'odf'}
                onClick={() => handleKpiClick('odf')}
                className="transition-all duration-300 ease-out"
              />
              <KPICard
                title="Oppositions"
                value={stats.totalOppositions}
                icon={AlertTriangle}
                trend={stats.totalOppositions > 0 ? "down" : "neutral"}
                trendValue={stats.oppositionsEnCours > 0 ? `${stats.oppositionsEnCours} en cours` : "aucune"}
                kpiId="oppositions"
                isActive={activeKpi === 'oppositions'}
                onClick={() => handleKpiClick('oppositions')}
                className="transition-all duration-300 ease-out"
              />
              <KPICard
                title="Conflits"
                value={stats.totalConflicts}
                icon={Gavel}
                trend={stats.totalConflicts > 0 ? "down" : "neutral"}
                trendValue={stats.conflictsEnCours > 0 ? `${stats.conflictsEnCours} en cours` : "aucun"}
                kpiId="conflits"
                isActive={activeKpi === 'conflits'}
                onClick={() => handleKpiClick('conflits')}
                className="transition-all duration-300 ease-out"
              />
              <KPICard
                title="Organisations"
                value={stats.organisationsTotal}
                icon={Building2}
                trend="neutral"
                trendValue={`${stats.organisationsOdf} ODF • ${stats.organisationsCooperatives} Coop`}
                kpiId="organisations"
                isActive={activeKpi === 'organisations'}
                onClick={() => handleKpiClick('organisations')}
                className="transition-all duration-300 ease-out"
              />
            </div>

            {/* Debug Panel - Only visible when debug mode is on */}
            {debugMode && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Bug className="h-4 w-4" />
                    Debug Info (Admin) - Source: DatabaseContext
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-xs font-mono text-amber-700 dark:text-amber-300">
                    <p>n_ADP_filtré: {stats.debugInfo.n_ADP_filtré}</p>
                    <p>n_PDFCP_filtré: {stats.debugInfo.n_PDFCP_filtré}</p>
                    <p>n_ODF_filtré: {stats.debugInfo.n_ODF_filtré}</p>
                    <p>n_opp_filtré: {stats.debugInfo.n_opp_filtré}</p>
                    <p>n_conflits_filtré: {stats.debugInfo.n_conflits_filtré}</p>
                    <p>n_activities_filtré: {stats.debugInfo.n_activities_filtré}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-amber-600 dark:text-amber-400">IDs (premiers 10)</summary>
                      <pre className="mt-1 text-[10px] overflow-x-auto">
                        ADP: {JSON.stringify(stats.debugInfo.ids_adp)}
                        {'\n'}PDFCP: {JSON.stringify(stats.debugInfo.ids_pdfcp)}
                        {'\n'}Oppositions: {JSON.stringify(stats.debugInfo.ids_oppositions)}
                        {'\n'}Conflits: {JSON.stringify(stats.debugInfo.ids_conflits)}
                      </pre>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Summary - Only visible on desktop to fill the column */}
            <Card className="hidden lg:block border-border/50 shadow-soft transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Map className="h-4 w-4 text-primary" />
                  {currentLevel === 'national' && 'Résumé par région'}
                  {currentLevel === 'region' && `DPANEF de ${dranefName || 'la région'}`}
                  {currentLevel === 'dpanef' && `Communes de ${dpanefName || 'la province'}`}
                  {currentLevel === 'commune' && `Détails de ${communeName || 'la commune'}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {/* National level: show regions */}
                  {currentLevel === 'national' && regionStats.filter(r => r.pdfcp > 0 || r.adp > 0).slice(0, 6).map((region) => (
                    <button 
                      key={region.regionId}
                      onClick={() => setSelectedDranef(region.regionId)}
                      className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-lg border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors duration-200 text-left"
                    >
                      <span className="text-muted-foreground truncate max-w-[60%]">{region.region}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-primary font-medium">{region.pdfcp} PDFCP</span>
                        <span className="text-muted-foreground">{region.adp} ADP</span>
                      </div>
                    </button>
                  ))}
                  {/* Region level: show DPANEFs */}
                  {currentLevel === 'region' && drillDownOptions.length > 0 && drillDownOptions.slice(0, 8).map((dpanef) => (
                    <button 
                      key={dpanef.id}
                      onClick={() => handleDrillDown('dpanef', dpanef.id)}
                      className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-lg border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors duration-200 text-left"
                    >
                      <span className="text-foreground truncate max-w-[80%]">{dpanef.name}</span>
                      <span className="text-xs text-primary">→</span>
                    </button>
                  ))}
                  {/* DPANEF level: show Communes */}
                  {currentLevel === 'dpanef' && drillDownOptions.length > 0 && drillDownOptions.slice(0, 8).map((commune) => (
                    <button 
                      key={commune.id}
                      onClick={() => handleDrillDown('commune', commune.id)}
                      className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-lg border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors duration-200 text-left"
                    >
                      <span className="text-foreground truncate max-w-[80%]">{commune.name}</span>
                      <span className="text-xs text-primary">→</span>
                    </button>
                  ))}
                  {/* Commune level: show stats */}
                  {currentLevel === 'commune' && (
                    <div className="text-sm text-muted-foreground py-2">
                      <p className="font-medium text-foreground mb-2">{communeName}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/30 rounded-lg p-2">
                          <span className="text-muted-foreground">ADP:</span>
                          <span className="ml-1 font-medium text-foreground">{stats.totalAdp}</span>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2">
                          <span className="text-muted-foreground">PDFCP:</span>
                          <span className="ml-1 font-medium text-foreground">{stats.totalPdfcp}</span>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2">
                          <span className="text-muted-foreground">Conflits:</span>
                          <span className="ml-1 font-medium text-foreground">{stats.totalConflicts}</span>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2">
                          <span className="text-muted-foreground">Activités:</span>
                          <span className="ml-1 font-medium text-foreground">{stats.totalActivities}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* No data message */}
                  {(currentLevel === 'region' || currentLevel === 'dpanef') && drillDownOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      Aucune donnée disponible à ce niveau
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Map Card */}
          <div className="lg:col-span-7">
            <Card className="border-border/50 shadow-sm overflow-hidden bg-white">
              <CardHeader className="pb-2 bg-white border-b border-border/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Map className="h-4 w-4 text-primary" />
                  Carte du Maroc
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Distribution par {getIndicatorLabel()}
                </p>
              </CardHeader>
              <CardContent className="pt-4 bg-white">
                {/* Indicator Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {indicators.map((ind) => (
                    <button
                      key={ind.id}
                      onClick={() => setSelectedIndicator(ind.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedIndicator === ind.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {ind.label}
                    </button>
                  ))}
                </div>

                {/* Map Container with Progressive Zoom */}
                <MoroccoMap
                  data={mapData}
                  indicator={getIndicatorLabel()}
                  selectedRegion={selectedRegionName || undefined}
                  onRegionClick={handleRegionClick}
                  onProvinceClick={handleProvinceClick}
                  onCommuneClick={handleCommuneClick}
                  communeList={communesForMap}
                  selectedProvinceName={selectedProvinceName}
                  highlightMode={activeKpi}
                  regionDataByKpi={regionDataByKpi}
                  drillLevel={currentLevel}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Table - Full Width Below */}
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <StatsTable />
        </div>
      </div>

      <DemoBadge />
      <BottomNav />
    </div>
  );
};

export default Dashboard;
