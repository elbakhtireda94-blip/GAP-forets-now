import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Calendar, MapPin, BarChart3, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePdfcpSupabase } from '@/hooks/usePdfcpSupabase';
import { formatDh } from '@/lib/formatters';
import CascadingDropdowns from '@/components/CascadingDropdowns';
import BottomNav from '@/components/BottomNav';
import { VALIDATION_STATUS_CONFIG, type PdfcpValidationStatus } from '@/data/pdfcpValidationWorkflow';
import type { ScopeLevel } from '@/lib/rbac';
import type { PdfcpProgram } from '@/hooks/usePdfcpSupabase';

// Sous-titre selon le rôle (hiérarchie ADP → DPANEF → DRANEF)
const ROLE_SUBTITLES: Record<ScopeLevel, string> = {
  LOCAL: 'Créez et suivez vos programmes — soumettez pour validation',
  PROVINCIAL: 'Validez les programmes de votre province (DPANEF)',
  REGIONAL: 'Pilotage et validation régionale (DRANEF)',
  NATIONAL: 'Vue nationale et indicateurs',
  ADMIN: 'Gestion et validation des PDFCP',
};

// Pour un statut donné, indique si le rôle courant peut faire une action (validation)
function isAwaitingMyAction(status: string, scope: ScopeLevel): boolean {
  if (scope === 'LOCAL' && status === 'BROUILLON') return true; // ADP peut soumettre
  if (scope === 'PROVINCIAL' && status === 'CONCERTE_ADP') return true;
  if ((scope === 'REGIONAL' || scope === 'NATIONAL') && status === 'VALIDE_DPANEF') return true;
  if (scope === 'ADMIN' && status === 'VERROUILLE') return true;
  return false;
}

function getNextStepLabel(status: string, scope: ScopeLevel): string | null {
  if (status === 'BROUILLON' && scope === 'LOCAL') return 'Complétez puis soumettez';
  if (status === 'CONCERTE_ADP' && scope === 'PROVINCIAL') return 'À valider (CP) et envoyer au DRANEF';
  if (status === 'VALIDE_DPANEF' && (scope === 'REGIONAL' || scope === 'NATIONAL')) return 'À valider (Visa DRANEF)';
  if (status === 'VERROUILLE' && scope === 'ADMIN') return 'Déverrouiller si besoin';
  return null;
}

const PDFCManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, applyScopeFilter } = useAuth();
  const scopeLevel: ScopeLevel = user?.scope_level || 'LOCAL';
  const { programs: centralPrograms, isProgramsLoading, createProgram, isCreatingProgram } = usePdfcpSupabase();
  const { getCommuneName } = useDatabase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'brouillon' | 'awaiting' | 'validated'>('all');
  const [formData, setFormData] = useState({
    title: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 4,
    regionId: '',
    dranefId: '',
    dpanefId: '',
    commune_id: '',
  });

  // Liste avec filtre RBAC
  const pdfcpList = useMemo(() => {
    return applyScopeFilter(centralPrograms, 'pdfcp');
  }, [centralPrograms, applyScopeFilter]);

  // Filtrage par statut + ordre : "à traiter" en premier, puis brouillons, puis par date
  const filteredAndOrdered = useMemo(() => {
    const list = [...pdfcpList];
    const status = (s: string) => s || 'BROUILLON';

    const filtered =
      filterStatus === 'all'
        ? list
        : filterStatus === 'brouillon'
        ? list.filter(p => status(p.validation_status) === 'BROUILLON')
        : filterStatus === 'awaiting'
        ? list.filter(p => isAwaitingMyAction(status(p.validation_status), scopeLevel))
        : list.filter(p => !['BROUILLON', 'CONCERTE_ADP'].includes(status(p.validation_status)));

    const awaiting = (p: PdfcpProgram) => isAwaitingMyAction(status(p.validation_status), scopeLevel);
    const isBrouillon = (p: PdfcpProgram) => status(p.validation_status) === 'BROUILLON';
    filtered.sort((a, b) => {
      if (awaiting(a) && !awaiting(b)) return -1;
      if (!awaiting(a) && awaiting(b)) return 1;
      if (isBrouillon(a) && !isBrouillon(b)) return -1;
      if (!isBrouillon(a) && isBrouillon(b)) return 1;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    return filtered;
  }, [pdfcpList, filterStatus, scopeLevel]);

  const handleAdd = () => {
    setFormData({
      title: '',
      start_year: new Date().getFullYear(),
      end_year: new Date().getFullYear() + 4,
      regionId: '',
      dranefId: '',
      dpanefId: '',
      commune_id: '',
    });
    setDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Titre requis', variant: 'destructive' });
      return;
    }
    if (!formData.dranefId || !formData.dpanefId) {
      toast({ title: 'Veuillez sélectionner DRANEF et DPANEF', variant: 'destructive' });
      return;
    }
    try {
      const newId = await createProgram({
        title: formData.title.trim(),
        start_year: formData.start_year,
        end_year: formData.end_year,
        dranef_id: formData.dranefId,
        dpanef_id: formData.dpanefId,
        commune_id: formData.commune_id || undefined,
      });
      setDialogOpen(false);
      navigate(`/pdfcp/${newId}`);
    } catch {
      // toast already in mutation
    }
  };

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
            <h1 className="text-xl font-bold">Programmes PDFCP</h1>
            <p className="text-primary-foreground/80 text-sm">{ROLE_SUBTITLES[scopeLevel]}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-4 flex flex-wrap gap-3">
        <Button onClick={handleAdd} className="flex-1 min-w-[140px] gap-2" variant="anef">
          <Plus className="h-4 w-4" />
          Ajouter un PDFCP
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-primary text-primary hover:bg-primary/10"
          onClick={() => navigate('/pdfcp/dashboard')}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Tableau de bord</span>
        </Button>
      </div>

      {/* Filtres par statut (hiérarchie) */}
      <div className="px-4 flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {(
          [
            { key: 'all' as const, label: 'Tous' },
            { key: 'brouillon' as const, label: 'Brouillons' },
            { key: 'awaiting' as const, label: 'À valider' },
            { key: 'validated' as const, label: 'Validés' },
          ] as const
        ).map(({ key, label }) => (
          <Button
            key={key}
            variant={filterStatus === key ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => setFilterStatus(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Liste des PDFCP (ordonnée : à traiter → brouillons → reste) */}
      <div className="px-4 py-3 space-y-3">
        {isProgramsLoading && pdfcpList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 opacity-50" />
              <p>Chargement des programmes...</p>
            </div>
          </div>
        ) : pdfcpList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun PDFCP. Cliquez sur « Ajouter un PDFCP » pour en créer un.</p>
          </div>
        ) : filteredAndOrdered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun programme dans ce filtre.
          </div>
        ) : (
          filteredAndOrdered.map(p => {
            const st = (p.validation_status || 'BROUILLON') as PdfcpValidationStatus;
            const statusConfig = VALIDATION_STATUS_CONFIG[st] ?? VALIDATION_STATUS_CONFIG.BROUILLON;
            const nextStep = getNextStepLabel(st, scopeLevel);
            return (
              <div
                key={p.id}
                className="bg-card rounded-xl p-4 border border-border/50 shadow-soft cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => navigate(`/pdfcp/${p.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{p.title}</h3>
                      <Badge className={`${statusConfig.color} border shrink-0`}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {nextStep && (
                      <p className="text-xs text-primary font-medium mb-1.5">{nextStep}</p>
                    )}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{getCommuneName(p.commune_id || '')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{p.start_year} – {p.end_year}</span>
                        {p.total_budget_dh != null && p.total_budget_dh > 0 && (
                          <span className="ml-2">• {formatDh(p.total_budget_dh)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialog : Nouveau PDFCP (base centrale) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle>Nouveau PDFCP (base centrale)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre du programme *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: PDFCP Sidi Allal Bahraoui 2024-2028"
              />
            </div>
            <CascadingDropdowns
              regionId={formData.regionId}
              dranefId={formData.dranefId}
              dpanefId={formData.dpanefId}
              communeId={formData.commune_id}
              onRegionChange={v => setFormData(f => ({ ...f, regionId: v, dranefId: '', dpanefId: '', commune_id: '' }))}
              onDranefChange={v => setFormData(f => ({ ...f, dranefId: v, dpanefId: '', commune_id: '' }))}
              onDpanefChange={v => setFormData(f => ({ ...f, dpanefId: v, commune_id: '' }))}
              onCommuneChange={v => setFormData(f => ({ ...f, commune_id: v }))}
              compact
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Année début</Label>
                <Input
                  type="number"
                  value={formData.start_year}
                  onChange={e => setFormData(f => ({ ...f, start_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Année fin</Label>
                <Input
                  type="number"
                  value={formData.end_year}
                  onChange={e => setFormData(f => ({ ...f, end_year: parseInt(e.target.value) || new Date().getFullYear() + 4 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateSubmit} disabled={isCreatingProgram} variant="anef">
              {isCreatingProgram ? 'Création...' : 'Créer et ouvrir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PDFCManagement;
