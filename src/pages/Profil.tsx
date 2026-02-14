import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Wifi,
  WifiOff,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useSync } from '@/contexts/SyncContext';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';

const Profil: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getDranefName, getDpanefName, getCommuneName, getAdps } = useDatabase();
  const { 
    pendingEntries, 
    isOnline, 
    isSyncing, 
    syncNow, 
    getPendingCount,
    getSyncHistory,
    lastSyncTime 
  } = useSync();

  const adps = getAdps();
  const userAdp = adps.find(a => a.email.toLowerCase() === user?.email.toLowerCase());

  const pendingCount = getPendingCount();
  const syncHistory = getSyncHistory();

  const handleSync = async () => {
    await syncNow();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Jamais';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Mon Profil" />

      <div className="px-4 py-4 space-y-4">
        {/* User info card */}
        <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary rounded-full p-4">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{user?.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{user?.email}</span>
            </div>
            {userAdp?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{userAdp.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Location info */}
        <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Affectation</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">DRANEF</span>
              <span className="font-medium">{getDranefName(user?.dranef || '')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DPANEF</span>
              <span className="font-medium">{getDpanefName(user?.dpanef || '')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commune</span>
              <span className="font-medium">{getCommuneName(user?.commune || '')}</span>
            </div>
          </div>
        </div>

        {/* Sync section */}
        <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-500" />
              )}
              <h3 className="font-semibold text-foreground">Synchronisation</h3>
            </div>
            <span className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>

          {/* Pending count */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Saisies en attente</span>
            </div>
            <span className={`font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {pendingCount}
            </span>
          </div>

          {/* Last sync */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Dernière sync</span>
            <span className="text-sm font-medium">{formatDate(lastSyncTime)}</span>
          </div>

          {/* Sync button */}
          <Button
            className="w-full mt-4"
            onClick={handleSync}
            disabled={!isOnline || isSyncing || pendingCount === 0}
          >
            {isSyncing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Synchronisation...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Synchroniser maintenant
              </div>
            )}
          </Button>

          {!isOnline && (
            <p className="text-xs text-amber-600 text-center mt-2">
              Connexion requise pour synchroniser
            </p>
          )}
        </div>

        {/* Sync history */}
        {syncHistory.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-soft">
            <h3 className="font-semibold text-foreground mb-3">Historique des syncs</h3>
            <div className="space-y-2">
              {syncHistory.slice(0, 5).map((entry, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {entry.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm">{entry.count} élément(s)</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate('/pdfcp')}
          >
            <span>Gérer les PDFCP</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate('/adp')}
          >
            <span>Gestion ADP</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          ADP Territoire Connect v1.0.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profil;
