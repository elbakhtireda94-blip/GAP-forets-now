import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bug, Shield, Users, FileText, Activity, AlertTriangle, 
  Building2, Eye, EyeOff, ExternalLink, ToggleLeft, ToggleRight,
  BarChart3, Settings, Folder, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, User } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { 
  getScopeLevelLabel, 
  ScopeLevel, 
  MenuKey, 
  MENU_ACCESS,
  applyScopeFilter as rbacApplyScopeFilter,
  FilterableEntity,
  EntityType
} from '@/lib/rbac';
import BottomNav from '@/components/BottomNav';

// Simulation users for RBAC debug testing (ADMIN-only page)
const SIMULATION_USERS: Record<ScopeLevel, User> = {
  ADMIN: {
    id: 'SIM_ADMIN', name: 'Simulation Admin', email: 'sim-admin@debug',
    role: 'admin', scope_level: 'ADMIN', role_label: 'Administrateur (SIM)',
    dranef_id: null, dpanef_id: null, commune_ids: [],
  },
  NATIONAL: {
    id: 'SIM_NATIONAL', name: 'Simulation National', email: 'sim-national@debug',
    role: 'admin', scope_level: 'NATIONAL', role_label: 'Directeur Central (SIM)',
    dranef_id: null, dpanef_id: null, commune_ids: [],
  },
  REGIONAL: {
    id: 'SIM_REGIONAL', name: 'Simulation Régional', email: 'sim-regional@debug',
    role: 'admin', scope_level: 'REGIONAL', role_label: 'DRANEF (SIM)',
    dranef_id: 'DR02', dpanef_id: null, commune_ids: [],
  },
  PROVINCIAL: {
    id: 'SIM_PROVINCIAL', name: 'Simulation Provincial', email: 'sim-provincial@debug',
    role: 'admin', scope_level: 'PROVINCIAL', role_label: 'DPANEF (SIM)',
    dranef_id: 'DR02', dpanef_id: 'DP03', commune_ids: [],
  },
  LOCAL: {
    id: 'SIM_LOCAL', name: 'Simulation ADP', email: 'sim-adp@debug',
    role: 'adp', scope_level: 'LOCAL', role_label: 'ADP (SIM)',
    dranef_id: 'DR02', dpanef_id: 'DP03', commune_ids: ['C05', 'C06'],
  },
};

// Menu items configuration for testing
const menuItems: { key: MenuKey; label: string; icon: React.ElementType; path: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: BarChart3, path: '/dashboard' },
  { key: 'gestion_adp', label: 'Gestion des ADP', icon: Users, path: '/adp' },
  { key: 'pdfcp', label: 'Programmes PDFCP', icon: FileText, path: '/pdfcp' },
  { key: 'organisations', label: 'Organisations', icon: Building2, path: '/organisations' },
  { key: 'activites', label: 'Activités', icon: Activity, path: '/activites' },
  { key: 'conflits', label: 'Conflits', icon: AlertTriangle, path: '/oppositions' },
  { key: 'rapports', label: 'Rapports', icon: Folder, path: '/rapports' },
  { key: 'admin_settings', label: 'Paramètres Admin', icon: Settings, path: '/admin' },
];

const DebugAccess: React.FC = () => {
  const navigate = useNavigate();
  const { user: realUser } = useAuth();
  const { getAdps, getPdfcs, getActivities, getConflicts, getOrganisations, getRegions } = useDatabase();

  // Simulation mode state
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [simulatedScope, setSimulatedScope] = useState<ScopeLevel>('ADMIN');

  // Get simulated or real user
  const currentUser: User | null = useMemo(() => {
    if (simulationEnabled) {
      return SIMULATION_USERS[simulatedScope];
    }
    return realUser;
  }, [simulationEnabled, simulatedScope, realUser]);

  // Build region lookup for filtering
  const regionLookup = useMemo(() => {
    const regions = getRegions();
    const communeToDpanef: Record<string, string> = {};
    const communeToDranef: Record<string, string> = {};
    const dpanefToDranef: Record<string, string> = {};

    regions.forEach((region) => {
      region.dranef.forEach((dranef) => {
        dranef.dpanef.forEach((dpanef) => {
          dpanefToDranef[dpanef.id] = dranef.id;
          dpanef.communes.forEach((commune) => {
            communeToDpanef[commune.id] = dpanef.id;
            communeToDranef[commune.id] = dranef.id;
          });
        });
      });
    });

    return {
      getCommuneDpanefId: (communeId: string) => communeToDpanef[communeId],
      getCommuneDranefId: (communeId: string) => communeToDranef[communeId],
      getDpanefDranefId: (dpanefId: string) => dpanefToDranef[dpanefId],
    };
  }, [getRegions]);

  // Local applyScopeFilter using simulated user
  const applyScopeFilterLocal = <T extends FilterableEntity>(items: T[], entityType: EntityType): T[] => {
    if (!currentUser) return [];
    const rbacUser = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      scope_level: currentUser.scope_level,
      role_label: currentUser.role_label,
      dranef_id: currentUser.dranef_id,
      dpanef_id: currentUser.dpanef_id,
      commune_ids: currentUser.commune_ids,
    };
    return rbacApplyScopeFilter(items, entityType, rbacUser, regionLookup);
  };

  // Get raw data
  const rawData = useMemo(() => ({
    adp: getAdps(),
    pdfcp: getPdfcs(),
    activities: getActivities(),
    conflicts: getConflicts(),
    organisations: getOrganisations(),
  }), [getAdps, getPdfcs, getActivities, getConflicts, getOrganisations]);

  // Get filtered data using simulated user
  const filteredData = useMemo(() => ({
    adp: applyScopeFilterLocal(rawData.adp, 'adp'),
    pdfcp: applyScopeFilterLocal(rawData.pdfcp, 'pdfcp'),
    activities: applyScopeFilterLocal(rawData.activities, 'activity'),
    conflicts: applyScopeFilterLocal(rawData.conflicts, 'conflict'),
    organisations: applyScopeFilterLocal(rawData.organisations, 'organisation'),
  }), [rawData, currentUser, regionLookup]);

  // Check menu access for current/simulated user
  const checkMenuAccess = (menuKey: MenuKey): boolean => {
    if (!currentUser) return false;
    const allowedScopes = MENU_ACCESS[menuKey];
    return allowedScopes ? allowedScopes.includes(currentUser.scope_level) : false;
  };

  // Handle route test navigation
  const handleRouteTest = (path: string, menuKey: MenuKey) => {
    if (!checkMenuAccess(menuKey)) {
      navigate('/access-denied');
    } else {
      navigate(path);
    }
  };

  const entities = [
    { key: 'adp', label: 'ADP', icon: Users, color: 'bg-blue-500', data: rawData.adp, filtered: filteredData.adp },
    { key: 'pdfcp', label: 'PDFCP', icon: FileText, color: 'bg-green-500', data: rawData.pdfcp, filtered: filteredData.pdfcp },
    { key: 'activities', label: 'Activités', icon: Activity, color: 'bg-purple-500', data: rawData.activities, filtered: filteredData.activities },
    { key: 'conflicts', label: 'Conflits/Oppositions', icon: AlertTriangle, color: 'bg-orange-500', data: rawData.conflicts, filtered: filteredData.conflicts },
    { key: 'organisations', label: 'Organisations', icon: Building2, color: 'bg-teal-500', data: rawData.organisations, filtered: filteredData.organisations },
  ];

  if (!realUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-amber-600 pt-8 pb-6 px-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate('/menu')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-xl font-bold text-primary-foreground">
              Debug Access
            </h1>
          </div>
          {simulationEnabled && (
            <Badge className="bg-red-500 text-white ml-auto">MODE SIMULATION</Badge>
          )}
        </div>
        <p className="text-primary-foreground/70 text-sm text-center">
          Panneau de débogage RBAC (Admin uniquement)
        </p>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Simulation Mode Toggle */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {simulationEnabled ? <ToggleRight className="h-4 w-4 text-red-600" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
              Mode Simulation (DEV ONLY)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="simulation-mode" className="text-sm">
                Simuler un utilisateur
              </Label>
              <Switch
                id="simulation-mode"
                checked={simulationEnabled}
                onCheckedChange={setSimulationEnabled}
              />
            </div>
            
            {simulationEnabled && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs text-muted-foreground">Sélectionner un scope</Label>
                <Select value={simulatedScope} onValueChange={(v) => setSimulatedScope(v as ScopeLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN - Accès total</SelectItem>
                    <SelectItem value="NATIONAL">NATIONAL - Niveau central</SelectItem>
                    <SelectItem value="REGIONAL">REGIONAL - DRANEF</SelectItem>
                    <SelectItem value="PROVINCIAL">PROVINCIAL - DPANEF</SelectItem>
                    <SelectItem value="LOCAL">LOCAL - ADP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              Utilisateur {simulationEnabled ? 'simulé' : 'courant'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <span className="ml-2 font-mono text-xs">{currentUser?.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Scope:</span>
                <Badge className="ml-2 bg-amber-600">{currentUser?.scope_level}</Badge>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">DRANEF ID:</span>
                <span className="ml-2 font-mono">{currentUser?.dranef_id || '(null)'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">DPANEF ID:</span>
                <span className="ml-2 font-mono">{currentUser?.dpanef_id || '(null)'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Commune IDs:</span>
                <span className="ml-2 font-mono">
                  {currentUser?.commune_ids && currentUser.commune_ids.length > 0 
                    ? currentUser.commune_ids.join(', ') 
                    : '(vide)'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="entities" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entities">Entités</TabsTrigger>
            <TabsTrigger value="menus">Menus</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
          </TabsList>

          {/* Entities Tab */}
          <TabsContent value="entities" className="space-y-4">
            {entities.map((entity) => {
              const raw = entity.data.length;
              const filtered = entity.filtered.length;
              const percentage = raw > 0 ? Math.round((filtered / raw) * 100) : 100;

              return (
                <Card key={entity.key}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className={`${entity.color} rounded p-1`}>
                          <entity.icon className="h-4 w-4 text-white" />
                        </div>
                        {entity.label}
                      </CardTitle>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Avant: </span>
                        <span className="font-mono">{raw}</span>
                        <span className="mx-2">→</span>
                        <span className="text-muted-foreground">Après: </span>
                        <span className="font-mono font-medium">{filtered}</span>
                        <Badge variant="outline" className="ml-2">{percentage}%</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full ${entity.color} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    
                    {/* Mini table - first 5 rows */}
                    {entity.filtered.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-xs py-2">ID</TableHead>
                              <TableHead className="text-xs py-2">Nom/Titre</TableHead>
                              <TableHead className="text-xs py-2">DRANEF</TableHead>
                              <TableHead className="text-xs py-2">DPANEF</TableHead>
                              <TableHead className="text-xs py-2">Commune</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entity.filtered.slice(0, 5).map((item: any, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-xs py-1 font-mono">{item.id}</TableCell>
                                <TableCell className="text-xs py-1 truncate max-w-[100px]">
                                  {item.full_name || item.title || item.nom || item.type || item.nature || '-'}
                                </TableCell>
                                <TableCell className="text-xs py-1 font-mono">{item.dranef_id || '-'}</TableCell>
                                <TableCell className="text-xs py-1 font-mono">{item.dpanef_id || '-'}</TableCell>
                                <TableCell className="text-xs py-1 font-mono">{item.commune_id || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {entity.filtered.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune donnée après filtrage
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Menus Tab */}
          <TabsContent value="menus" className="space-y-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Visibilité des menus pour {currentUser?.scope_level}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {menuItems.map((menu) => {
                    const hasAccess = checkMenuAccess(menu.key);
                    return (
                      <div 
                        key={menu.key}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          hasAccess ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : 'bg-red-50 border-red-200 dark:bg-red-950/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <menu.icon className={`h-4 w-4 ${hasAccess ? 'text-green-600' : 'text-red-600'}`} />
                          <div>
                            <p className="text-sm font-medium">{menu.label}</p>
                            <p className="text-xs text-muted-foreground font-mono">{menu.key}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasAccess ? (
                            <>
                              <Eye className="h-4 w-4 text-green-600" />
                              <Badge className="bg-green-600">Visible</Badge>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 text-red-600" />
                              <Badge variant="destructive">Hidden</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes" className="space-y-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Test des routes (navigation avec scope simulé)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {menuItems.map((menu) => {
                    const hasAccess = checkMenuAccess(menu.key);
                    return (
                      <Button
                        key={menu.key}
                        variant={hasAccess ? 'outline' : 'ghost'}
                        size="sm"
                        className={`justify-start ${!hasAccess ? 'opacity-50' : ''}`}
                        onClick={() => handleRouteTest(menu.path, menu.key)}
                      >
                        {hasAccess ? (
                          <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-2 text-red-600" />
                        )}
                        <span className="truncate">{menu.label}</span>
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Les routes sans accès redirigeront vers /access-denied
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Scope Rules Reference */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Règles de filtrage par scope
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p><strong>ADMIN:</strong> Accès total, aucune restriction</p>
            <p><strong>NATIONAL:</strong> Accès total aux données, pas de paramètres admin</p>
            <p><strong>REGIONAL:</strong> Données filtrées par dranef_id</p>
            <p><strong>PROVINCIAL:</strong> Données filtrées par dpanef_id</p>
            <p><strong>LOCAL:</strong> Données filtrées par adp_id ou commune_ids</p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default DebugAccess;
