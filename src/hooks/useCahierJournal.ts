import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMySQLBackend, mysqlApi } from '@/integrations/mysql-api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { CahierJournalEntry, JournalAttachment, JournalCategory, ValidationStatus, Priority, OrganisationType } from '@/data/cahierJournalTypes';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Helper to safely parse attachments from JSON
function parseAttachments(data: Json | undefined | null): JournalAttachment[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as JournalAttachment[];
}

// Helper to safely parse organisations array
function parseOrganisations(data: string[] | null | undefined): OrganisationType[] {
  if (!data || !Array.isArray(data)) return [];
  return data as OrganisationType[];
}

// Map database row to CahierJournalEntry
function mapRowToEntry(entry: Record<string, unknown>): CahierJournalEntry {
  return {
    id: entry.id as string,
    entry_date: entry.entry_date as string,
    title: entry.title as string,
    description: entry.description as string,
    category: entry.category as JournalCategory | null,
    location_text: entry.location_text as string | null,
    latitude: entry.latitude as number | null,
    longitude: entry.longitude as number | null,
    pdfcp_id: entry.pdfcp_id as string | null,
    perimetre_label: entry.perimetre_label as string | null,
    site_label: entry.site_label as string | null,
    dranef_id: entry.dranef_id as string,
    dpanef_id: entry.dpanef_id as string,
    commune_id: entry.commune_id as string | null,
    adp_user_id: entry.adp_user_id as string,
    participants_count: entry.participants_count as number | null,
    organisations_concernees: parseOrganisations(entry.organisations_concernees as string[] | null),
    temps_passe_min: entry.temps_passe_min as number | null,
    priorite: (entry.priorite as Priority) || 'Moyenne',
    statut_validation: (entry.statut_validation as ValidationStatus) || 'Brouillon',
    resultats_obtenus: entry.resultats_obtenus as string | null,
    decisions_prises: entry.decisions_prises as string | null,
    prochaines_etapes: entry.prochaines_etapes as string | null,
    contraintes_rencontrees: entry.contraintes_rencontrees as string | null,
    besoin_appui_hierarchique: entry.besoin_appui_hierarchique as boolean || false,
    justification_appui: entry.justification_appui as string | null,
    attachments: parseAttachments(entry.attachments as Json),
    created_at: entry.created_at as string,
    updated_at: entry.updated_at as string,
  };
}

export type JournalFormData = Omit<CahierJournalEntry, 'id' | 'created_at' | 'updated_at' | 'dranef_id' | 'dpanef_id' | 'adp_user_id'>;

export function useCahierJournal() {
  const [entries, setEntries] = useState<CahierJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isDemoReadonly } = useDemo();
  const { toast } = useToast();

  // Fetch all entries with RBAC filtering
  const fetchEntries = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (useMySQLBackend()) {
        const params: Record<string, string> = {};
        if (user.scope_level === 'LOCAL') params.adp_user_id = user.id;
        else if (user.scope_level === 'PROVINCIAL' && user.dpanef_id) params.dpanef_id = user.dpanef_id;
        else if (user.scope_level === 'REGIONAL' && user.dranef_id) params.dranef_id = user.dranef_id;
        const { data, error: fetchError } = await mysqlApi.getCahierJournalEntries(params);
        if (fetchError) throw new Error(fetchError.message);
        const list = Array.isArray(data) ? data : [];
        const mappedEntries = list.map((entry: Record<string, unknown>) => mapRowToEntry(entry));
        setEntries(mappedEntries);
        return;
      }
      let query = supabase
        .from('cahier_journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });

      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      } else if (user.scope_level === 'PROVINCIAL' && user.dpanef_id) {
        query = query.eq('dpanef_id', user.dpanef_id);
      } else if (user.scope_level === 'REGIONAL' && user.dranef_id) {
        query = query.eq('dranef_id', user.dranef_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedEntries = (data || []).map(entry => mapRowToEntry(entry as Record<string, unknown>));
      setEntries(mappedEntries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('Error fetching journal entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Create new entry
  const createEntry = useCallback(async (data: JournalFormData): Promise<CahierJournalEntry | null> => {
    if (isDemoReadonly) {
      toast({ title: 'Mode démonstration', description: 'Modification impossible en mode démo.', variant: 'destructive' });
      return null;
    }
    if (!user || user.scope_level !== 'LOCAL') {
      toast({
        title: 'Accès refusé',
        description: 'Seuls les ADP peuvent créer des entrées.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const insertData = {
        entry_date: data.entry_date,
        title: data.title,
        description: data.description,
        category: data.category,
        location_text: data.location_text,
        latitude: data.latitude,
        longitude: data.longitude,
        pdfcp_id: data.pdfcp_id,
        perimetre_label: data.perimetre_label,
        site_label: data.site_label,
        commune_id: data.commune_id,
        dranef_id: user.dranef_id || '',
        dpanef_id: user.dpanef_id || '',
        adp_user_id: user.id,
        participants_count: data.participants_count,
        organisations_concernees: data.organisations_concernees,
        temps_passe_min: data.temps_passe_min,
        priorite: data.priorite,
        statut_validation: data.statut_validation,
        resultats_obtenus: data.resultats_obtenus,
        decisions_prises: data.decisions_prises,
        prochaines_etapes: data.prochaines_etapes,
        contraintes_rencontrees: data.contraintes_rencontrees,
        besoin_appui_hierarchique: data.besoin_appui_hierarchique,
        justification_appui: data.justification_appui,
        attachments: JSON.parse(JSON.stringify(data.attachments || [])),
      };

      let newEntry: Record<string, unknown> | null = null;
      if (useMySQLBackend()) {
        const { data: res, error: insertError } = await mysqlApi.postCahierJournalEntry(insertData);
        if (insertError) throw new Error(insertError.message);
        newEntry = res as Record<string, unknown>;
      } else {
        const { data: supabaseEntry, error: insertError } = await supabase
          .from('cahier_journal_entries')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        newEntry = supabaseEntry as Record<string, unknown>;
      }
      const mappedEntry = mapRowToEntry(newEntry!);
      setEntries(prev => [mappedEntry, ...prev]);
      toast({
        title: 'Entrée créée',
        description: 'Votre entrée a été enregistrée.',
      });
      return mappedEntry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
      console.error('Error creating journal entry:', err);
      return null;
    }
  }, [user, toast]);

  // Update entry
  const updateEntry = useCallback(async (
    id: string,
    data: Partial<JournalFormData>
  ): Promise<boolean> => {
    if (isDemoReadonly) {
      toast({ title: 'Mode démonstration', description: 'Modification impossible en mode démo.', variant: 'destructive' });
      return false;
    }
    if (!user || user.scope_level !== 'LOCAL') {
      toast({
        title: 'Accès refusé',
        description: 'Seuls les ADP peuvent modifier leurs entrées.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const updateData: Record<string, unknown> = { ...data };
      if (data.attachments) {
        updateData.attachments = JSON.parse(JSON.stringify(data.attachments));
      }

      let updatedEntry: Record<string, unknown> | null = null;
      if (useMySQLBackend()) {
        const { data: res, error: updateError } = await mysqlApi.patchCahierJournalEntry(id, updateData);
        if (updateError) throw new Error(updateError.message);
        updatedEntry = res as Record<string, unknown>;
      } else {
        const { data: supabaseEntry, error: updateError } = await supabase
          .from('cahier_journal_entries')
          .update(updateData)
          .eq('id', id)
          .eq('adp_user_id', user.id)
          .select()
          .single();
        if (updateError) throw updateError;
        updatedEntry = supabaseEntry as Record<string, unknown>;
      }
      const mappedEntry = mapRowToEntry(updatedEntry!);
      setEntries(prev => prev.map(e => e.id === id ? mappedEntry : e));
      toast({
        title: 'Entrée modifiée',
        description: 'Les modifications ont été enregistrées.',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la modification';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
      console.error('Error updating journal entry:', err);
      return false;
    }
  }, [user, toast]);

  // Delete entry
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    if (isDemoReadonly) {
      toast({ title: 'Mode démonstration', description: 'Suppression impossible en mode démo.', variant: 'destructive' });
      return false;
    }
    if (!user) {
      toast({
        title: 'Accès refusé',
        description: 'Vous devez être connecté.',
        variant: 'destructive',
      });
      return false;
    }

    const canDelete = user.scope_level === 'LOCAL' || user.scope_level === 'ADMIN';
    if (!canDelete) {
      toast({
        title: 'Accès refusé',
        description: 'Vous n\'avez pas les droits pour supprimer.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      if (useMySQLBackend()) {
        const { error: deleteError } = await mysqlApi.deleteCahierJournalEntry(id);
        if (deleteError) throw new Error(deleteError.message);
      } else {
        let query = supabase
          .from('cahier_journal_entries')
          .delete()
          .eq('id', id);
        if (user.scope_level === 'LOCAL') {
          query = query.eq('adp_user_id', user.id);
        }
        const { error: deleteError } = await query;
        if (deleteError) throw deleteError;
      }

      setEntries(prev => prev.filter(e => e.id !== id));
      toast({
        title: 'Entrée supprimée',
        description: 'L\'entrée a été supprimée.',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
      console.error('Error deleting journal entry:', err);
      return false;
    }
  }, [user, toast]);

  // Duplicate entry
  const duplicateEntry = useCallback(async (id: string): Promise<CahierJournalEntry | null> => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return null;

    const duplicateData: JournalFormData = {
      entry_date: new Date().toISOString().split('T')[0],
      title: `${entry.title} (copie)`,
      description: entry.description,
      category: entry.category,
      location_text: entry.location_text,
      latitude: entry.latitude,
      longitude: entry.longitude,
      pdfcp_id: entry.pdfcp_id,
      perimetre_label: entry.perimetre_label,
      site_label: entry.site_label,
      commune_id: entry.commune_id,
      participants_count: entry.participants_count,
      organisations_concernees: [...entry.organisations_concernees],
      temps_passe_min: entry.temps_passe_min,
      priorite: entry.priorite,
      statut_validation: 'Brouillon',
      resultats_obtenus: null,
      decisions_prises: null,
      prochaines_etapes: null,
      contraintes_rencontrees: null,
      besoin_appui_hierarchique: false,
      justification_appui: null,
      attachments: [],
    };

    return createEntry(duplicateData);
  }, [entries, createEntry]);

  // Get single entry by ID
  const getEntry = useCallback((id: string): CahierJournalEntry | undefined => {
    return entries.find(e => e.id === id);
  }, [entries]);

  // Check if user can edit (only ADP owner)
  const canEdit = useCallback((entry: CahierJournalEntry): boolean => {
    if (!user || isDemoReadonly) return false;
    return user.scope_level === 'LOCAL' && entry.adp_user_id === user.id;
  }, [user, isDemoReadonly]);

  // Check if user can delete (ADP owner or ADMIN)
  const canDelete = useCallback((entry: CahierJournalEntry): boolean => {
    if (!user || isDemoReadonly) return false;
    if (user.scope_level === 'ADMIN') return true;
    return user.scope_level === 'LOCAL' && entry.adp_user_id === user.id;
  }, [user, isDemoReadonly]);

  // Check if user can create (only ADP)
  const canCreate = useMemo(() => {
    if (isDemoReadonly) return false;
    return user?.scope_level === 'LOCAL';
  }, [user, isDemoReadonly]);

  return {
    entries,
    loading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    duplicateEntry,
    getEntry,
    canEdit,
    canDelete,
    canCreate,
  };
}
