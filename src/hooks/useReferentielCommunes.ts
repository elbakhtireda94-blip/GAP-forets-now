/**
 * Hook pour le référentiel communes (schéma referentiel: dranef, dpanef, zdtf, commune).
 * Requêtes efficaces en cascade. Pas d'ADP.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SCHEMA = 'referentiel';

function ref(table: string) {
  return (supabase as any).schema(SCHEMA).from(table);
}

export interface DranefRow {
  id: string;
  name: string;
}

export interface DpanefRow {
  id: string;
  dranef_id: string;
  name: string;
}

export interface ZdtfRow {
  id: string;
  dpanef_id: string;
  name: string;
}

export interface CommuneRow {
  id: string;
  zdtf_id: string;
  name: string;
  is_flagged: boolean;
  note: string | null;
}

export interface CommuneWithHierarchy extends CommuneRow {
  dranef_name: string;
  dpanef_name: string;
  zdtf_name: string;
}

export function useDranefList() {
  return useQuery({
    queryKey: [SCHEMA, 'dranef'],
    queryFn: async (): Promise<DranefRow[]> => {
      const { data, error } = await ref('dranef').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDpanefList(dranefId: string | null) {
  return useQuery({
    queryKey: [SCHEMA, 'dpanef', dranefId],
    queryFn: async (): Promise<DpanefRow[]> => {
      if (!dranefId) return [];
      const { data, error } = await ref('dpanef').select('id, dranef_id, name').eq('dranef_id', dranefId).order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dranefId,
  });
}

export function useZdtfList(dpanefId: string | null) {
  return useQuery({
    queryKey: [SCHEMA, 'zdtf', dpanefId],
    queryFn: async (): Promise<ZdtfRow[]> => {
      if (!dpanefId) return [];
      const { data, error } = await ref('zdtf').select('id, dpanef_id, name').eq('dpanef_id', dpanefId).order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dpanefId,
  });
}

const PAGE_SIZE = 50;

export function useCommuneList(options: {
  dranefId: string | null;
  dpanefId: string | null;
  zdtfId: string | null;
  search: string;
  page: number;
}) {
  const { dranefId, dpanefId, zdtfId, search, page } = options;

  return useQuery({
    queryKey: [SCHEMA, 'commune', dranefId, dpanefId, zdtfId, search, page],
    queryFn: async (): Promise<{ rows: CommuneWithHierarchy[]; total: number }> => {
      let query = ref('commune').select('id, zdtf_id, name, is_flagged, note', { count: 'exact' });

      if (zdtfId) {
        query = query.eq('zdtf_id', zdtfId);
      } else if (dpanefId) {
        const { data: zdtfIds } = await ref('zdtf').select('id').eq('dpanef_id', dpanefId);
        const ids = (zdtfIds ?? []).map((z: { id: string }) => z.id);
        if (ids.length) query = query.in('zdtf_id', ids);
        else return { rows: [], total: 0 };
      } else if (dranefId) {
        const { data: dpanefRows } = await ref('dpanef').select('id').eq('dranef_id', dranefId);
        const dpanefIds = (dpanefRows ?? []).map((d: { id: string }) => d.id);
        if (dpanefIds.length) {
          const { data: zdtfRows } = await ref('zdtf').select('id').in('dpanef_id', dpanefIds);
          const ids = (zdtfRows ?? []).map((z: { id: string }) => z.id);
          if (ids.length) query = query.in('zdtf_id', ids);
          else return { rows: [], total: 0 };
        } else return { rows: [], total: 0 };
      }

      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const { data: communes, error, count } = await query.range(from, from + PAGE_SIZE - 1).order('name');

      if (error) throw error;

      const rows = (communes ?? []) as CommuneRow[];
      if (rows.length === 0) {
        return { rows: [], total: count ?? 0 };
      }

      const zdtfIds = [...new Set(rows.map((r) => r.zdtf_id))];
      const { data: zdtfData } = await ref('zdtf').select('id, dpanef_id, name').in('id', zdtfIds);
      const zdtfMap = new Map((zdtfData ?? []).map((z: ZdtfRow) => [z.id, z]));

      const dpanefIds = [...new Set((zdtfData ?? []).map((z: ZdtfRow) => z.dpanef_id))];
      const { data: dpanefData } = await ref('dpanef').select('id, dranef_id, name').in('id', dpanefIds);
      const dpanefMap = new Map((dpanefData ?? []).map((d: DpanefRow) => [d.id, d]));

      const dranefIds = [...new Set((dpanefData ?? []).map((d: DpanefRow) => d.dranef_id))];
      const { data: dranefData } = await ref('dranef').select('id, name').in('id', dranefIds);
      const dranefMap = new Map((dranefData ?? []).map((d: DranefRow) => [d.id, d]));

      const withHierarchy: CommuneWithHierarchy[] = rows.map((c) => {
        const z = zdtfMap.get(c.zdtf_id);
        const p = z ? dpanefMap.get(z.dpanef_id) : undefined;
        const r = p ? dranefMap.get(p.dranef_id) : undefined;
        return {
          ...c,
          zdtf_name: z?.name ?? '—',
          dpanef_name: p?.name ?? '—',
          dranef_name: r?.name ?? '—',
        };
      });

      return { rows: withHierarchy, total: count ?? 0 };
    },
  });
}
