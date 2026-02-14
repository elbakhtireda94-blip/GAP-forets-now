import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Layers, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import PdfcpGeoActionsModule from '@/components/pdfcp/PdfcpGeoActionsModule';
import PdfcpConcerteForm from '@/components/pdfcp/PdfcpConcerteForm';
import PdfcpCpForm from '@/components/pdfcp/PdfcpCpForm';
import PdfcpExecuteForm from '@/components/pdfcp/PdfcpExecuteForm';
import PdfcpValidationSection from '@/components/pdfcp/PdfcpValidationSection';
import BottomNav from '@/components/BottomNav';
import { usePdfcpSupabase } from '@/hooks/usePdfcpSupabase';
import { VALIDATION_STATUS_CONFIG } from '@/data/pdfcpValidationWorkflow';
import type { PdfcpValidationStatus } from '@/data/pdfcpValidationWorkflow';
import type { ScopeLevel } from '@/lib/rbac';

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/** Message "Action requise" ou "Prochaines étapes" selon statut et rôle */
function getActionRequiredMessage(status: string, scope: ScopeLevel): string | null {
  const st = status || 'BROUILLON';
  if (st === 'BROUILLON' && scope === 'LOCAL') return 'Complétez le Plan concerté et les données, puis soumettez pour validation.';
  if (st === 'CONCERTE_ADP' && scope === 'PROVINCIAL') return 'Validez le CP (Contrat-Programme) et envoyez au DRANEF.';
  if (st === 'VALIDE_DPANEF' && (scope === 'REGIONAL' || scope === 'NATIONAL')) return 'Le programme a été validé par le DPANEF. Donnez le visa DRANEF (validation central).';
  if (st === 'VERROUILLE' && scope === 'ADMIN') return 'Programme verrouillé. Vous pouvez le déverrouiller si nécessaire.';
  return null;
}

/** Indique si la section validation doit être mise en avant (au-dessus de la carto) pour ce rôle */
function shouldHighlightValidation(status: string, scope: ScopeLevel): boolean {
  const st = status || 'BROUILLON';
  if (scope === 'PROVINCIAL' && st === 'CONCERTE_ADP') return true;
  if ((scope === 'REGIONAL' || scope === 'NATIONAL') && st === 'VALIDE_DPANEF') return true;
  if (scope === 'ADMIN' && st === 'VERROUILLE') return true;
  return false;
}

const PdfcpDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { pdfcpId } = useParams<{ pdfcpId: string }>();
  const { getCommuneName } = useDatabase();
  const { user } = useAuth();
  const scopeLevel = user?.scope_level || 'LOCAL';

  const { program: supabaseProgram, isLoading: isSupabaseProgramLoading } = usePdfcpSupabase(pdfcpId);

  // Onglet par défaut selon rôle : ADP → Plan concerté, DPANEF/DRANEF → CP (ou validation visible au-dessus)
  const defaultTab = useMemo(() => {
    if (scopeLevel === 'PROVINCIAL' || scopeLevel === 'REGIONAL') return 'cp';
    return 'plan';
  }, [scopeLevel]);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [lastAddedActionId, setLastAddedActionId] = useState<string | null>(null);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Un seul type de PDFCP : base centrale MySQL (UUID). Si pas d'UUID ou programme introuvable → message.
  const isMySQLUuid = !!pdfcpId && isValidUUID(pdfcpId);
  if (!pdfcpId || !isMySQLUuid) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="bg-primary pt-6 pb-4 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/pdfcp')} className="p-2 rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-primary-foreground">PDFCP</h1>
          </div>
        </header>
        <div className="px-4 py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Programme introuvable. Les PDFCP sont gérés en base centrale.</p>
          <Button onClick={() => navigate('/pdfcp')} variant="outline" className="mt-4">Retour à la liste</Button>
        </div>
        <BottomNav />
      </div>
    );
  }
  if (isSupabaseProgramLoading || !supabaseProgram) {
    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Chargement du programme...</div>
        <BottomNav />
      </div>
    );
  }

  // Affichage unique : détail depuis la base centrale
  const prog = supabaseProgram;
  const yearStart = prog.start_year;
  const yearEnd = prog.end_year;
  const communeName = getCommuneName(prog.commune_id || '');
  const validationStatus = (prog.validation_status || 'BROUILLON') as PdfcpValidationStatus;
  const statusConfig = VALIDATION_STATUS_CONFIG[validationStatus] ?? VALIDATION_STATUS_CONFIG.BROUILLON;
  const actionRequiredMsg = getActionRequiredMessage(validationStatus, scopeLevel as ScopeLevel);
  const showValidationFirst = shouldHighlightValidation(validationStatus, scopeLevel as ScopeLevel);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary pt-6 pb-4 px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pdfcp')} className="p-2 rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-primary-foreground truncate">{prog.title}</h1>
            <p className="text-primary-foreground/70 text-xs">{yearStart} – {yearEnd} • {communeName}</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/40">
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      </header>
      <div className="px-4 py-5 space-y-5">
        {/* Carte "Action requise" pour ADP (brouillon) ou validateurs */}
        {actionRequiredMsg && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{actionRequiredMsg}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="plan" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">Plan concerté</TabsTrigger>
            <TabsTrigger value="cp" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">CP</TabsTrigger>
            <TabsTrigger value="execution" className="text-xs data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-lg">Exécution</TabsTrigger>
          </TabsList>
          <TabsContent value="plan" className="mt-4">
            <PdfcpConcerteForm
              pdfcpId={pdfcpId!}
              communeId={prog.commune_id}
              communeName={communeName}
              yearStart={yearStart}
              yearEnd={yearEnd}
              onActionAdded={(id) => setLastAddedActionId(id)}
            />
          </TabsContent>
          <TabsContent value="cp" className="mt-4">
            <PdfcpCpForm
              pdfcpId={pdfcpId!}
              communeName={communeName}
              yearStart={yearStart}
              yearEnd={yearEnd}
              readOnly={scopeLevel !== 'PROVINCIAL'}
            />
          </TabsContent>
          <TabsContent value="execution" className="mt-4">
            <PdfcpExecuteForm
              pdfcpId={pdfcpId!}
              communeName={communeName}
              yearStart={yearStart}
              yearEnd={yearEnd}
            />
          </TabsContent>
        </Tabs>

        {/* Pour DPANEF/DRANEF quand un programme attend validation : bloc validation en premier */}
        {showValidationFirst && (
          <PdfcpValidationSection pdfcpId={pdfcpId!} communeName={communeName} />
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2 py-6 border-dashed border-primary/40 text-primary hover:bg-primary/5"
          onClick={() => {
            const el = document.getElementById('section-actions-cartographiques');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
              setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
            }
          }}
        >
          <Layers className="h-5 w-5" />
          Saisir les données cartographiques (localisation des actions)
          <ChevronDown className="h-4 w-4" />
        </Button>

        <div id="section-actions-cartographiques" className="scroll-mt-24 rounded-lg">
          <PdfcpGeoActionsModule
            pdfcpId={pdfcpId!}
            openFormWithPlannedId={lastAddedActionId}
            onFormOpened={() => setLastAddedActionId(null)}
          />
        </div>

        {!showValidationFirst && (
          <PdfcpValidationSection pdfcpId={pdfcpId!} communeName={communeName} />
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default PdfcpDetailPage;
