import React, { useState } from 'react';
import { KeyRound, Plus, Copy, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Simple SHA-256 hash using Web Crypto API
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateCode(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

interface AccessCode {
  id: string;
  label: string;
  scope: string;
  dranef_id: string | null;
  dpanef_id: string | null;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
}

const AdminAccessCodes: React.FC = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState('LOCAL');
  const [dranefId, setDranefId] = useState('');
  const [dpanefId, setDpanefId] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['access-codes'],
    queryFn: async (): Promise<AccessCode[]> => {
      const { data, error } = await supabase
        .from('access_codes')
        .select('id, label, scope, dranef_id, dpanef_id, max_uses, uses, expires_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AccessCode[];
    },
  });

  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error('Le libellé est requis');
      return;
    }
    setSaving(true);
    try {
      const code = generateCode();
      const codeHash = await sha256(code);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { error } = await supabase.from('access_codes').insert({
        label: label.trim(),
        code_hash: codeHash,
        scope,
        dranef_id: dranefId || null,
        dpanef_id: dpanefId || null,
        max_uses: maxUses,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      setGeneratedCode(code);
      queryClient.invalidateQueries({ queryKey: ['access-codes'] });
      toast.success('Code créé avec succès');
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'Impossible de créer le code'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    const { error } = await supabase
      .from('access_codes')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Erreur lors de la désactivation');
    } else {
      toast.success('Code désactivé');
      queryClient.invalidateQueries({ queryKey: ['access-codes'] });
    }
  };

  const isExpired = (code: AccessCode) => {
    if (!code.expires_at) return false;
    return new Date(code.expires_at) <= new Date();
  };

  const resetForm = () => {
    setLabel('');
    setScope('LOCAL');
    setDranefId('');
    setDpanefId('');
    setMaxUses(1);
    setExpiresInDays(7);
    setGeneratedCode(null);
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-4">
        <PageHeader
          title="Codes d'accès"
          subtitle="Créer et gérer les codes d'inscription"
          icon={<KeyRound className="h-6 w-6" />}
        />

        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau code
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Libellé</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="hidden sm:table-cell">Utilisations</TableHead>
                  <TableHead className="hidden md:table-cell">Expire le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun code d'accès
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map(code => (
                    <TableRow key={code.id}>
                      <TableCell className="font-medium text-sm">{code.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{code.scope}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {code.uses} / {code.max_uses}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {code.expires_at ? format(new Date(code.expires_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                      </TableCell>
                      <TableCell>
                        {isExpired(code) || code.uses >= code.max_uses ? (
                          <Badge variant="secondary">Inactif</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isExpired(code) && code.uses < code.max_uses && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeactivate(code.id)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {generatedCode ? 'Code généré' : 'Nouveau code d\'accès'}
            </DialogTitle>
            <DialogDescription>
              {generatedCode
                ? 'Copiez ce code maintenant, il ne sera plus affiché.'
                : 'Remplissez les informations du code d\'accès.'}
            </DialogDescription>
          </DialogHeader>

          {generatedCode ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <code className="text-2xl font-mono font-bold tracking-widest">{generatedCode}</code>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  toast.success('Code copié !');
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier le code
              </Button>
              <Button variant="outline" className="w-full" onClick={resetForm}>
                Fermer
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Libellé</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Code ADP Région X" />
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="NATIONAL">National</SelectItem>
                      <SelectItem value="REGIONAL">Régional</SelectItem>
                      <SelectItem value="PROVINCIAL">Provincial</SelectItem>
                      <SelectItem value="LOCAL">Local (ADP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Utilisations max</Label>
                    <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expire dans (jours)</Label>
                    <Input type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Annuler</Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? 'Création...' : 'Créer le code'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default AdminAccessCodes;
