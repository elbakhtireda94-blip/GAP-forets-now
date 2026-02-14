// User Management Page
import React, { useState, useMemo } from 'react';
import { Users, Search, Filter, Copy, Check, Eye, Shield, MapPin, Building2, Mail, Phone, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import { useUsersManagement, UserWithRole } from '@/hooks/useUsersManagement';
import { useDatabase } from '@/contexts/DatabaseContext';
import { getScopeLevelLabel, ScopeLevel } from '@/lib/rbac';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SCOPE_COLORS: Record<ScopeLevel, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  NATIONAL: 'bg-purple-100 text-purple-800 border-purple-200',
  REGIONAL: 'bg-blue-100 text-blue-800 border-blue-200',
  PROVINCIAL: 'bg-green-100 text-green-800 border-green-200',
  LOCAL: 'bg-amber-100 text-amber-800 border-amber-200',
};

const UsersManagement: React.FC = () => {
  const { data: users = [], isLoading, error } = useUsersManagement();
  const { getRegions } = useDatabase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [dranefFilter, setDranefFilter] = useState<string>('all');
  const [dpanefFilter, setDpanefFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  

  // Extract DRANEF and DPANEF from regions hierarchy
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

  // Filter DPANEFs based on selected DRANEF
  const filteredDpanefs = useMemo(() => {
    if (dranefFilter === 'all') return dpanefs;
    return dpanefs.filter(d => d.dranef_id === dranefFilter);
  }, [dpanefs, dranefFilter]);

  // Apply filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          user.full_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Scope filter
      if (scopeFilter !== 'all' && user.scope_level !== scopeFilter) {
        return false;
      }

      // DRANEF filter
      if (dranefFilter !== 'all' && user.dranef_id !== dranefFilter) {
        return false;
      }

      // DPANEF filter
      if (dpanefFilter !== 'all' && user.dpanef_id !== dpanefFilter) {
        return false;
      }

      return true;
    });
  }, [users, searchQuery, scopeFilter, dranefFilter, dpanefFilter]);


  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy à HH:mm', { locale: fr });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
      <div className="p-4 space-y-6">
        <PageHeader
          title="Gestion des utilisateurs"
          subtitle="Vue des comptes utilisateurs du système"
          icon={<Users className="h-6 w-6" />}
        />

        {/* Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-2">
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les scopes</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="NATIONAL">National</SelectItem>
                <SelectItem value="REGIONAL">Régional</SelectItem>
                <SelectItem value="PROVINCIAL">Provincial</SelectItem>
                <SelectItem value="LOCAL">Local</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dranefFilter} onValueChange={(val) => {
              setDranefFilter(val);
              setDpanefFilter('all');
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="DRANEF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes DRANEF</SelectItem>
                {dranefs.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dpanefFilter} onValueChange={setDpanefFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="DPANEF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes DPANEF</SelectItem>
                {filteredDpanefs.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filteredUsers.length} utilisateur(s) trouvé(s)</span>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Utilisateur</TableHead>
                <TableHead className="hidden sm:table-cell">Scope</TableHead>
                <TableHead className="hidden md:table-cell">DRANEF</TableHead>
                <TableHead className="hidden lg:table-cell">DPANEF</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(user)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={SCOPE_COLORS[user.scope_level]}>
                        {user.scope_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {user.dranef_name || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {user.dpanef_name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* User Details Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedUser.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div>{selectedUser.full_name}</div>
                    <Badge variant="outline" className={SCOPE_COLORS[selectedUser.scope_level]}>
                      {getScopeLevelLabel(selectedUser.scope_level)}
                    </Badge>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  Détails du compte utilisateur
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedUser.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Role Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Rôle & Permissions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Scope</span>
                      <Badge variant="outline" className={SCOPE_COLORS[selectedUser.scope_level]}>
                        {selectedUser.scope_level}
                      </Badge>
                    </div>
                    {selectedUser.role_label && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Fonction</span>
                        <span>{selectedUser.role_label}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Territorial Assignment */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Affectation territoriale</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">DRANEF:</span>
                      <span>{selectedUser.dranef_name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">DPANEF:</span>
                      <span>{selectedUser.dpanef_name || '-'}</span>
                    </div>
                    {selectedUser.commune_ids.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">Communes:</span>
                        <span>{selectedUser.commune_ids.length} commune(s)</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Audit Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Audit</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Créé le:</span>
                      <span>{formatDate(selectedUser.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Modifié le:</span>
                      <span>{formatDate(selectedUser.updated_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Copy button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const text = `Nom: ${selectedUser.full_name}\nEmail: ${selectedUser.email}\nRôle: ${selectedUser.scope_level}`;
                    navigator.clipboard.writeText(text);
                    toast.success('Informations copiées !');
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier les informations
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
};

export default UsersManagement;
