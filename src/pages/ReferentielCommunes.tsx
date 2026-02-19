/**
 * Page Référentiel communes — filtres en cascade DRANEF → DPANEF → ZDTF → Commune + recherche + table.
 * Schéma Supabase: referentiel. Pas d'ADP.
 */

import React, { useState } from 'react';
import { MapPin, Search, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import {
  useDranefList,
  useDpanefList,
  useZdtfList,
  useCommuneList,
  type CommuneWithHierarchy,
} from '@/hooks/useReferentielCommunes';

const PAGE_SIZE = 50;

const ReferentielCommunes: React.FC = () => {
  const [dranefId, setDranefId] = useState<string | null>(null);
  const [dpanefId, setDpanefId] = useState<string | null>(null);
  const [zdtfId, setZdtfId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: dranefList = [], isLoading: loadingDranef } = useDranefList();
  const { data: dpanefList = [], isLoading: loadingDpanef } = useDpanefList(dranefId);
  const { data: zdtfList = [], isLoading: loadingZdtf } = useZdtfList(dpanefId);
  const { data: communeData, isLoading: loadingCommunes } = useCommuneList({
    dranefId,
    dpanefId,
    zdtfId,
    search,
    page,
  });

  const handleReset = () => {
    setDranefId(null);
    setDpanefId(null);
    setZdtfId(null);
    setSearch('');
    setPage(1);
  };

  const total = communeData?.total ?? 0;
  const rows = communeData?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        title="Référentiel communes"
        description="DRANEF, DPANEF, ZDTF et communes — consultation et filtres"
        icon={<MapPin className="h-6 w-6" />}
      />

      <main className="flex-1 p-4 pb-24">
        {/* Filtres cascade + recherche */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">DRANEF</label>
            <Select value={dranefId ?? ''} onValueChange={(v) => { setDranefId(v || null); setDpanefId(null); setZdtfId(null); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                {dranefList.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingDranef && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
          </div>

          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">DPANEF</label>
            <Select value={dpanefId ?? ''} onValueChange={(v) => { setDpanefId(v || null); setZdtfId(null); setPage(1); }} disabled={!dranefId}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                {dpanefList.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingDpanef && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
          </div>

          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">ZDTF</label>
            <Select value={zdtfId ?? ''} onValueChange={(v) => { setZdtfId(v || null); setPage(1); }} disabled={!dpanefId}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                {zdtfList.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingZdtf && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
          </div>

          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Recherche Commune</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom commune..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>
          </div>

          <Button variant="outline" size="icon" onClick={handleReset} title="Réinitialiser les filtres">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-card">
          {loadingCommunes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucune commune trouvée. Ajustez les filtres ou exécutez l’import (voir docs).
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DRANEF</TableHead>
                    <TableHead>DPANEF</TableHead>
                    <TableHead>ZDTF</TableHead>
                    <TableHead>Commune</TableHead>
                    <TableHead className="w-[80px]">Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: CommuneWithHierarchy) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.dranef_name}</TableCell>
                      <TableCell>{row.dpanef_name}</TableCell>
                      <TableCell>{row.zdtf_name}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        {row.is_flagged ? (
                          <Badge variant="secondary" className="text-xs">Marqué</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination simple */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-muted-foreground">
                  <span>
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Précédent
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ReferentielCommunes;
