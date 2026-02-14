import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TreePine, Sprout, Droplets, Route, Construction, Package, BarChart3, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import PDFCPInfoCard from '@/components/PDFCPInfoCard';
import PDFCPVoletTable from '@/components/PDFCPVoletTable';
import ComparatifTable from '@/components/ComparatifTable';
import AlertesPanel from '@/components/AlertesPanel';
import {
  PDFCP,
  PDFCPLigneProgramme,
  VoletType,
  mockPDFCPs,
  mockLignesProgramme,
  calculateTauxRealisation,
  voletsConfig,
} from '@/data/pdfcpTypes';

const voletIcons: Record<VoletType, React.ReactNode> = {
  'Parcours_Reboisement': <TreePine size={16} />,
  'Regeneration': <Sprout size={16} />,
  'Points_Eau': <Droplets size={16} />,
  'Pistes_Rehabilitation': <Route size={16} />,
  'Pistes_Ouverture': <Construction size={16} />,
  'Activites_Complementaires': <Package size={16} />,
};

const PDFCPForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [pdfcp] = useState<PDFCP>(mockPDFCPs[0]);
  const [lignes, setLignes] = useState<PDFCPLigneProgramme[]>(mockLignesProgramme);
  const [mainTab, setMainTab] = useState<string>('programme');
  
  const annees = [2024, 2025, 2026, 2027, 2028];
  const volets: VoletType[] = [
    'Parcours_Reboisement',
    'Regeneration',
    'Points_Eau',
    'Pistes_Rehabilitation',
    'Pistes_Ouverture',
    'Activites_Complementaires',
  ];

  const handleAddLigne = (newLigne: Omit<PDFCPLigneProgramme, 'id_ligne' | 'taux_realisation_quantite' | 'taux_realisation_budget'>) => {
    const ligne: PDFCPLigneProgramme = {
      ...newLigne,
      id_ligne: `l${Date.now()}`,
      taux_realisation_quantite: calculateTauxRealisation(newLigne.quantite_realisee, newLigne.quantite_prevue),
      taux_realisation_budget: calculateTauxRealisation(newLigne.montant_realise, newLigne.montant_prevu),
    };
    setLignes([...lignes, ligne]);
  };

  const handleUpdateLigne = (id: string, updates: Partial<PDFCPLigneProgramme>) => {
    setLignes(lignes.map(l => 
      l.id_ligne === id ? { ...l, ...updates } : l
    ));
  };

  const handleDeleteLigne = (id: string) => {
    setLignes(lignes.filter(l => l.id_ligne !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary pt-6 pb-4 px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">
              Programme Quinquennal
            </h1>
            <p className="text-primary-foreground/70 text-xs">PDFCP Finalisé</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* PDFCP Info Card */}
        <PDFCPInfoCard pdfcp={pdfcp} />

        {/* Main Navigation Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="programme" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <Package size={14} />
              Programme
            </TabsTrigger>
            <TabsTrigger value="comparatif" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <BarChart3 size={14} />
              État Comparatif
            </TabsTrigger>
            <TabsTrigger value="alertes" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <AlertTriangle size={14} />
              Alertes
            </TabsTrigger>
          </TabsList>

          {/* Programme Tab - Volets */}
          <TabsContent value="programme" className="mt-4">
            <Tabs defaultValue="Parcours_Reboisement" className="w-full">
              <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1.5 rounded-xl">
                {volets.map((volet) => (
                  <TabsTrigger
                    key={volet}
                    value={volet}
                    className="flex-1 min-w-[100px] gap-1.5 text-xs py-2 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
                  >
                    {voletIcons[volet]}
                    <span className="hidden sm:inline">{voletsConfig[volet].label}</span>
                    <span className="sm:hidden">{voletsConfig[volet].label.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {volets.map((volet) => (
                <TabsContent key={volet} value={volet} className="mt-4">
                  <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      {voletIcons[volet]}
                      {voletsConfig[volet].label}
                    </h3>
                    <PDFCPVoletTable
                      volet={volet}
                      lignes={lignes.filter(l => l.volet === volet)}
                      annees={annees}
                      onAddLigne={handleAddLigne}
                      onUpdateLigne={handleUpdateLigne}
                      onDeleteLigne={handleDeleteLigne}
                      idPdfcp={pdfcp.id}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* État Comparatif Tab */}
          <TabsContent value="comparatif" className="mt-4">
            <ComparatifTable 
              pdfcpId={pdfcp.id}
              communeCode={pdfcp.commune}
              yearStart={pdfcp.anneeDebut}
              yearEnd={pdfcp.anneeFin}
            />
          </TabsContent>

          {/* Alertes Tab */}
          <TabsContent value="alertes" className="mt-4">
            <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
              <AlertesPanel />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default PDFCPForm;
