import React, { useState, useMemo } from 'react';
import { Shield, Search, Edit, X } from 'lucide-react';
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
import { useUsersManagement, UserWithRole } from '@/hooks/useUsersManagement';
import { useDatabase } from '@/contexts/DatabaseContext';
import { ScopeLevel } from '@/lib/rbac';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const SCOPE_COLORS: Record<ScopeLevel, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  NATIONAL: 'bg-purple-100 text-purple-800 border-purple-200',
  REGIONAL: 'bg-blue-100 text-blue-800 border-blue-200',
  PROVINCIAL: 'bg-green-100 text-green-800 border-green-200',
  LOCAL: 'bg-amber-100 text-amber-800 border-amber-200',
};

const SCOPE_OPTIONS: { value: ScopeLevel; label: string }[] = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'REGIONAL', label: 'Régional (DRANEF)' },
  { value: 'PROVINCIAL', label: 'Provincial (DPANEF)' },
  { value: 'LOCAL', label: 'Local (ADP)' },
];

const AdminRoles: React.FC = () => {
  const { data: users = [], isLoading, error } = useUsersManagement();
  const { getRegions } = useDatabase();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editScope, setEditScope] = useState<ScopeLevel>('LOCAL');
  const [editDranef, setEditDranef] = useState<string>('');
  const [editDpanef, setEditDpanef] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const { dranefs, dpanefs } = useMemo(() => {
    const regions = getRegions();
    const dranefList: { id: string; name: string }[] = [];
    const dpanefList: { id: string; name: string; dranef_id: string }[] = [];
    regions.forEach(region => {
      region.dranef.forEach(dranef => {
        dranefList.push({ id: dranef.id, name: dranef.name });
        dranef.dpanef.forEach(dpanef => {
          dpanefList.push({ id: dpanef.id, name: dpanef.name, dranef_id: dranef.id });
        });
      });
    });
    return { dranefs: dranefList, dpanefs: dpanefList };
  }, [getRegions]);

  const filteredDpanefs = useMemo(() => {
    if (!editDranef) return dpanefs;
    return dpanefs.filter(d => d.dranef_id === editDranef);
  }, [dpanefs, editDranef]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const openEdit = (user: UserWithRole) => {
    setEditUser(user);
    setEditScope(user.scope_level);
    setEditDranef(user.dranef_id || '');
    setEditDpanef(user.dpanef_id || '');
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      // Upsert user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: editUser.user_id, role: editScope },
          { onConflict: 'user_id,role' }
        );
      if (roleError) {
        // If upsert fails, try delete + insert
        await supabase.from('user_roles').delete().eq('user_id', editUser.user_id);
        const { error: insertErr } = await supabase
          .from('user_roles')
          .insert({ user_id: editUser.user_id, role: editScope });
        if (insertErr) throw insertErr;
      }

      // Update profile role_label + territorial assignment
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role_label: editScope,
          dranef_id: ['REGIONAL', 'PROVINCIAL', 'LOCAL'].includes(editScope) ? editDranef || null : null,
          dpanef_id: ['PROVINCIAL', 'LOCAL'].includes(editScope) ? editDpanef || null : null,
        })
        .eq('user_id', editUser.user_id);
      if (profileError) throw profileError;

      toast.success('Rôle mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      setEditUser(null);
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'Impossible de modifier le rôle'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Erreur lors du chargement des utilisateurs
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-4">
        <PageHeader
          title="Gestion des rôles"
          subtitle="Attribuer et modifier les rôles utilisateurs"
          icon={<Shield className="h-6 w-6" />}
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="text-sm text-muted-foreground">{filteredUsers.length} utilisateur(s)</div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Label UI</TableHead>
                <TableHead>Scope réel</TableHead>
                <TableHead className="hidden md:table-cell">DRANEF</TableHead>
                <TableHead className="hidden lg:table-cell">DPANEF</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-sm">{user.full_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.role_label || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SCOPE_COLORS[user.scope_level]}>
                        {user.scope_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{user.dranef_name || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{user.dpanef_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              {editUser?.full_name} — {editUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Scope (niveau d'accès)</Label>
              <Select value={editScope} onValueChange={(v) => {
                setEditScope(v as ScopeLevel);
                if (!['REGIONAL', 'PROVINCIAL', 'LOCAL'].includes(v)) {
                  setEditDranef('');
                  setEditDpanef('');
                }
                if (!['PROVINCIAL', 'LOCAL'].includes(v)) {
                  setEditDpanef('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['REGIONAL', 'PROVINCIAL', 'LOCAL'].includes(editScope) && (
              <div className="space-y-2">
                <Label>DRANEF</Label>
                <Select value={editDranef} onValueChange={(v) => { setEditDranef(v); setEditDpanef(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une DRANEF" />
                  </SelectTrigger>
                  <SelectContent>
                    {dranefs.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {['PROVINCIAL', 'LOCAL'].includes(editScope) && (
              <div className="space-y-2">
                <Label>DPANEF</Label>
                <Select value={editDpanef} onValueChange={setEditDpanef}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une DPANEF" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDpanefs.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default AdminRoles;
