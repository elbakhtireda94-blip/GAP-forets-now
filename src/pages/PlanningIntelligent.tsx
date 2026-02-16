/**
 * Planning Intelligent – Cockpit DG
 * Page d'aide à la décision : KPIs, carte & priorités, planning, assistant, dossier DG.
 */

import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  MapPin,
  BarChart3,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Info,
  Target,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import type { Activity } from '@/contexts/DatabaseContext';
import type { PlanningItem } from '@/types/planning';
import { usePlanningDemoData } from '@/hooks/usePlanningDemoData';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import { useToast } from '@/hooks/use-toast';
import type { ImpactScoreDetail, RiskLevel } from '@/types/planning';
import type { DemoKpis, DossierDGSection } from '@/hooks/usePlanningDemoData';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function PlanningIntelligent() {
  const { user } = useAuth();
  const { getPlannings, getPlanningItems, getActivities, getDranefName, getDpanefName, getAdpName, getCommuneName } = useDatabase();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [showJustificationId, setShowJustificationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendrier' | 'liste'>('liste');

  const currentPlanning = useMemo(() => {
    const all = getPlannings();
    return all.find(p => p.month === selectedMonth && p.year === selectedYear) ?? null;
  }, [getPlannings, selectedMonth, selectedYear]);

  const isDemoMode = !currentPlanning;
  const demo = usePlanningDemoData(selectedMonth, selectedYear);

  // Agrégat planning + activités terrain pour le calendrier
  const { eventsByDate, calendarMonth } = useMemo(() => {
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);
    const byDate: Record<string, { planningItems: PlanningItem[]; activities: Activity[] }> = {};

    const add = (dateStr: string, type: 'planning' | 'activity', item: PlanningItem | Activity) => {
      const key = dateStr.substring(0, 10);
      if (!byDate[key]) byDate[key] = { planningItems: [], activities: [] };
      if (type === 'planning') (byDate[key].planningItems as PlanningItem[]).push(item as PlanningItem);
      else (byDate[key].activities as Activity[]).push(item as Activity);
    };

    // Éléments du planning (réel ou démo)
    const planningItems: PlanningItem[] = currentPlanning
      ? getPlanningItems(currentPlanning.id)
      : (() => {
          const y = selectedYear;
          const m = String(selectedMonth).padStart(2, '0');
          return [
            { id: 'd1', planning_id: '', date: `${y}-${m}-17`, title: 'Atelier ODF Azrou', type: 'atelier', commune_id: '' },
            { id: 'd2', planning_id: '', date: `${y}-${m}-20`, title: 'Médiation conflit pastoral', type: 'mediation', commune_id: '' },
            { id: 'd3', planning_id: '', date: `${y}-${m}-25`, title: 'Suivi reboisement PDFCP', type: 'suivi_pdfcp', commune_id: '' },
          ] as PlanningItem[];
        })();
    planningItems.forEach((item) => add(item.date, 'planning', item));

    // Activités terrain (saisies dans Activités)
    const activities = getActivities();
    activities.forEach((a) => {
      const d = (a.date || '').substring(0, 10);
      if (!d) return;
      const [y, m] = d.split('-').map(Number);
      if (y === selectedYear && m === selectedMonth) add(d, 'activity', a);
    });

    return {
      eventsByDate: byDate,
      calendarMonth: monthStart,
    };
  }, [selectedMonth, selectedYear, currentPlanning, getPlanningItems, getActivities]);

  const daysWithEvents = useMemo(() => {
    return Object.keys(eventsByDate).map((d) => {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    });
  }, [eventsByDate]);

  const impactScore: ImpactScoreDetail = isDemoMode ? demo.impactScore : computeImpactFromPlanning(currentPlanning!.id);
  const kpis: DemoKpis = isDemoMode ? demo.kpis : computeKpisFromPlanning(currentPlanning!.id);
  const operationalRisk: RiskLevel = isDemoMode ? demo.operationalRisk : 'Moyen';

  function computeImpactFromPlanning(planningId: string): ImpactScoreDetail {
    const items = getPlanningItems(planningId);
    const ateliers = items.filter(i => i.type === 'atelier' || i.type === 'reunion_odf').length;
    const pdfcp = items.filter(i => i.pdfcp_id).length;
    const mediation = items.filter(i => i.type === 'mediation').length;
    const total = items.length;
    const withDeliverables = items.filter(i => (i.expected_deliverables?.length ?? 0) > 0).length;
    const impact_participatif = total > 0 ? Math.min(100, Math.round((ateliers / Math.max(total, 1)) * 80 + 20)) : 50;
    const avancement_pdfcp = total > 0 ? Math.min(100, Math.round((pdfcp / Math.max(total, 1)) * 100)) : 50;
    const gestion_conflits = total > 0 ? Math.min(100, 40 + mediation * 20) : 50;
    const efficience_logistique = 70;
    const qualite_livrables = total > 0 ? Math.min(100, Math.round((withDeliverables / total) * 100)) : 50;
    const totalScore = Math.round(
      impact_participatif * 0.3 + avancement_pdfcp * 0.25 + gestion_conflits * 0.2 + efficience_logistique * 0.15 + qualite_livrables * 0.1
    );
    return {
      impact_participatif,
      avancement_pdfcp,
      gestion_conflits,
      efficience_logistique,
      qualite_livrables,
      total: Math.min(100, totalScore),
    };
  }

  function computeKpisFromPlanning(planningId: string): DemoKpis {
    const items = getPlanningItems(planningId);
    const communes = new Set(items.map(i => i.commune_id));
    const withPdfcp = items.filter(i => i.pdfcp_id).length;
    const ateliers = items.filter(i => i.type === 'atelier').length;
    const reunionsOdf = items.filter(i => i.type === 'reunion_odf').length;
    const mediation = items.filter(i => i.type === 'mediation').length;
    let km = 0, fuel = 0, budget = 0, vehicles = 0;
    items.forEach(i => {
      km += i.distance_km_est ?? 0;
      fuel += i.logistics?.fuel_liters ?? 0;
      budget += i.logistics?.budget_estimate ?? 0;
      if (i.logistics?.vehicle_needed) vehicles++;
    });
    return {
      communesCouvertes: communes.size,
      douarsUstTouches: items.filter(i => i.ust_id).length + communes.size * 2,
      pctZonesPrioritaires: communes.size > 0 ? Math.min(100, 60 + communes.size * 3) : 0,
      ateliersPrevus: ateliers,
      reunionsOdf,
      conflitsActifs: 0,
      interventionsMediationPrevues: mediation,
      actionsPlanifieesPdfcp: withPdfcp,
      pctJalonsMois: items.length > 0 ? Math.min(100, Math.round((withPdfcp / items.length) * 100)) : 0,
      vehiculesDemandes: vehicles,
      kmEstimes: km,
      carburantL: fuel,
      budgetEstime: budget,
      efficienceLabel: budget > 0 && impactScore.total > 0 ? `~${Math.round(budget / impactScore.total)} DH/impact` : '–',
    };
  }

  const handleCopyDossier = () => {
    const text = demo.dossierDG.map(s => `${s.title}\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copié', description: 'Dossier DG copié dans le presse-papier.' });
    });
  };

  const handleExportPrint = () => {
    window.print();
    toast({ title: 'Impression', description: 'Utilisez la boîte de dialogue d\'impression pour PDF ou impression.' });
  };

  const dranefLabel = currentPlanning ? getDranefName(currentPlanning.dranef_id) : 'DRANEF Kénitra';
  const dpanefLabel = currentPlanning ? getDpanefName(currentPlanning.dpanef_id) : 'DPANEF Kénitra';
  const adpLabel = currentPlanning ? getAdpName(currentPlanning.adp_id) : (user?.name ?? 'ADP');

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title="Planning Intelligent"
        subtitle="Cockpit DG – Aide à la décision"
        showBack
        backPath="/menu"
      />

      <TooltipProvider>
        <div className="px-4 py-4 space-y-6 max-w-6xl mx-auto">
          {/* 1) Header Cockpit DG */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={`${selectedMonth}`}
                    onValueChange={(v) => setSelectedMonth(Number(v))}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOIS.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={`${selectedYear}`}
                    onValueChange={(v) => setSelectedYear(Number(v))}
                  >
                    <SelectTrigger className="w-[90px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isDemoMode && (
                    <Badge className="bg-amber-500/90 text-white">Mode démo DG</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {dranefLabel} / {dpanefLabel}
                  </span>
                  <span className="text-sm font-medium">{adpLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-primary">Impact Planning</span>
                        <span className="text-lg font-bold">{impactScore.total}/100</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium mb-1">Détail du score</p>
                      <p>Participatif 30%: {impactScore.impact_participatif}</p>
                      <p>PDFCP 25%: {impactScore.avancement_pdfcp}</p>
                      <p>Conflits 20%: {impactScore.gestion_conflits}</p>
                      <p>Efficience 15%: {impactScore.efficience_logistique}</p>
                      <p>Livrables 10%: {impactScore.qualite_livrables}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Badge
                    variant={operationalRisk === 'Élevé' ? 'destructive' : operationalRisk === 'Moyen' ? 'secondary' : 'outline'}
                    className="capitalize"
                  >
                    Risque opérationnel : {operationalRisk}
                  </Badge>
                  <Button size="sm" variant="default" onClick={handleExportPrint} className="gap-1">
                    <FileText className="h-4 w-4" />
                    Générer note DG (PDF/Print)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2) 4 KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Couverture territoriale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{kpis.communesCouvertes}</p>
                <p className="text-xs text-muted-foreground">communes couvertes</p>
                <p className="text-lg font-semibold mt-1">{kpis.douarsUstTouches}</p>
                <p className="text-xs text-muted-foreground">douars/UST touchés</p>
                <p className="text-sm font-medium text-primary mt-1">{kpis.pctZonesPrioritaires} % zones prioritaires</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Animation & Médiation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{kpis.ateliersPrevus}</p>
                <p className="text-xs text-muted-foreground">ateliers prévus</p>
                <p className="text-lg font-semibold mt-1">{kpis.reunionsOdf}</p>
                <p className="text-xs text-muted-foreground">réunions ODF</p>
                <p className="text-sm mt-1">
                  <span className="font-medium">{kpis.conflitsActifs}</span> conflits actifs,{' '}
                  <span className="font-medium">{kpis.interventionsMediationPrevues}</span> interventions
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="h-4 w-4" />
                  PDFCP/PDFC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{kpis.actionsPlanifieesPdfcp}</p>
                <p className="text-xs text-muted-foreground">actions liées aux étapes</p>
                <p className="text-lg font-semibold mt-1 text-primary">{kpis.pctJalonsMois} %</p>
                <p className="text-xs text-muted-foreground">jalons du mois</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  Logistique & Coût
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{kpis.vehiculesDemandes}</p>
                <p className="text-xs text-muted-foreground">véhicules demandés</p>
                <p className="text-sm mt-1">{kpis.kmEstimes} km, {kpis.carburantL} L carburant</p>
                <p className="text-sm font-semibold mt-1">{kpis.budgetEstime.toLocaleString('fr-FR')} DH</p>
                <p className="text-xs text-primary font-medium mt-1">Efficience : {kpis.efficienceLabel}</p>
              </CardContent>
            </Card>
          </div>

          {/* 3) Carte + Top 5 Priorités */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Carte & Priorités terrain
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row gap-4">
              <div className="lg:w-1/2 min-h-[200px] rounded-xl bg-muted/50 border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                Vue carte (PDFCP, périmètres, communes, zones conflit) – données géolocalisées
              </div>
              <div className="lg:w-1/2 space-y-2">
                <p className="text-sm font-medium">Top 5 Priorités du mois</p>
                {demo.priorities.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{p.title}</span>
                      <Badge variant="outline" className="text-xs capitalize">{p.risk}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.objective}</p>
                    {showJustificationId === p.id ? (
                      <div className="text-xs bg-muted/50 p-2 rounded">
                        <p><strong>Justification :</strong> {p.justification}</p>
                        <p><strong>Impact attendu :</strong> {p.impactAttendu}</p>
                        <p><strong>Besoin logistique :</strong> {p.besoinLogistique}</p>
                        <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" onClick={() => setShowJustificationId(null)}>
                          Fermer
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => setShowJustificationId(p.id)}>
                        <Info className="h-3 w-3" />
                        Voir justification
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4) Planning mensuel – Calendrier / Liste */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Planning mensuel</CardTitle>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendrier' | 'liste')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="calendrier" className="text-xs">Calendrier</TabsTrigger>
                    <TabsTrigger value="liste" className="text-xs">Liste</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'liste' && (
                <div className="space-y-2">
                  {isDemoMode && (
                    <>
                      <div className="rounded-lg border p-3 flex flex-wrap gap-2">
                        <Badge>Atelier</Badge>
                        <span className="text-sm font-medium">Atelier ODF Azrou</span>
                        <span className="text-xs text-muted-foreground">17 mars – Commune Azrou – PDFCP lié</span>
                      </div>
                      <div className="rounded-lg border p-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">Médiation</Badge>
                        <span className="text-sm font-medium">Médiation conflit pastoral Sidi Yahia</span>
                        <span className="text-xs text-muted-foreground">20 mars – 1 véhicule, 80 km</span>
                      </div>
                      <div className="rounded-lg border p-3 flex flex-wrap gap-2">
                        <Badge variant="outline">Suivi PDFCP</Badge>
                        <span className="text-sm font-medium">Suivi reboisement Ain Leuh</span>
                        <span className="text-xs text-muted-foreground">25 mars – PV, fiche projet</span>
                      </div>
                    </>
                  )}
                  {!isDemoMode && getPlanningItems(currentPlanning!.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune activité planifiée. Ajoutez des activités depuis le formulaire.</p>
                  )}
                  {!isDemoMode && getPlanningItems(currentPlanning!.id).map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 flex flex-wrap gap-2 items-center">
                      <Badge>{item.type}</Badge>
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.date} – {getCommuneName(item.commune_id)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {viewMode === 'calendrier' && (
                <div className="space-y-4">
                  <Calendar
                    mode="single"
                    defaultMonth={calendarMonth}
                    month={calendarMonth}
                    onMonthChange={(date) => {
                      if (date) {
                        setSelectedMonth(date.getMonth() + 1);
                        setSelectedYear(date.getFullYear());
                      }
                    }}
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    modifiers={{ hasEvent: daysWithEvents }}
                    modifiersClassNames={{ hasEvent: 'bg-primary/15 text-primary font-medium ring-1 ring-primary/30' }}
                  />
                  {selectedDay && (() => {
                    const key = selectedDay.toISOString().substring(0, 10);
                    const dayEvents = eventsByDate[key];
                    if (!dayEvents || (dayEvents.planningItems.length === 0 && dayEvents.activities.length === 0)) {
                      return (
                        <p className="text-sm text-muted-foreground py-2">
                          Aucune activité ni action de planning pour le {selectedDay.toLocaleDateString('fr-FR')}.
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        {dayEvents.planningItems.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Planning</p>
                            {dayEvents.planningItems.map((item) => (
                              <div key={item.id} className="rounded-lg border p-2 flex flex-wrap gap-2 items-center bg-card">
                                <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                                <span className="text-sm font-medium">{item.title}</span>
                                {item.commune_id && (
                                  <span className="text-xs text-muted-foreground">{getCommuneName(item.commune_id)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {dayEvents.activities.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Activités terrain</p>
                            {dayEvents.activities.map((a) => (
                              <div key={a.id} className="rounded-lg border p-2 flex flex-wrap gap-2 items-center bg-card">
                                <Badge variant="outline" className="text-xs">{a.type}</Badge>
                                <span className="text-sm">{a.objet || a.description?.slice(0, 50) || 'Activité'}</span>
                                <span className="text-xs text-muted-foreground">{getCommuneName(a.commune_id)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5) Assistant Décisionnel */}
          <Card className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                Assistant Décisionnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Alertes</p>
                <div className="space-y-2">
                  {demo.alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border ${
                        a.severity === 'rouge' ? 'bg-red-50 border-red-200 dark:bg-red-950/30' :
                        a.severity === 'orange' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30' :
                        'bg-green-50 border-green-200 dark:bg-green-950/30'
                      }`}
                    >
                      {a.severity === 'rouge' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                      {a.severity === 'orange' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
                      {a.severity === 'vert' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                        {a.suggestion && <p className="text-xs text-primary mt-1">{a.suggestion}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Recommandations</p>
                <div className="space-y-3">
                  {demo.recommendations.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3 bg-card">
                      <p className="font-medium text-sm">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      {r.details && (
                        <ul className="text-xs list-disc list-inside mt-1 text-muted-foreground">
                          {r.details.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      )}
                      <p className="text-xs mt-2 flex gap-1">
                        <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
                        <strong>Pourquoi :</strong> {r.why}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6) Dossier DG */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dossier DG – Synthèse
              </CardTitle>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={handleCopyDossier} className="gap-1">
                  <Copy className="h-4 w-4" />
                  Copier en format note
                </Button>
                <Button size="sm" variant="default" onClick={handleExportPrint} className="gap-1">
                  <Download className="h-4 w-4" />
                  Exporter / Imprimer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demo.dossierDG.map((section: DossierDGSection) => (
                  <div key={section.title}>
                    <p className="font-semibold text-sm text-foreground">{section.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{section.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      <AppFooter />
      <BottomNav />
    </div>
  );
}
