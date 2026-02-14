import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Activity, AlertTriangle, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useSync } from '@/contexts/SyncContext';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { cn } from '@/lib/utils';

type TabType = 'activities' | 'conflicts' | 'pending';

const MesSaisies: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getActivities, getConflicts, getCommuneName, getAdpName } = useDatabase();
  const { pendingEntries, getPendingCount } = useSync();
  const [activeTab, setActiveTab] = useState<TabType>('activities');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const activities = getActivities();
  const allConflicts = getConflicts();
  const pendingCount = getPendingCount();

  // Filtrer uniquement les oppositions (type === "Opposition")
  const oppositions = allConflicts.filter(c => c.type === "Opposition");

  // Filter to show only user's entries (in a real app, this would be by user ID)
  const userActivities = activities.slice().sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const userOppositions = oppositions.slice().sort((a, b) => 
    new Date(b.date_reported).getTime() - new Date(a.date_reported).getTime()
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'En cours':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">En cours</Badge>;
      case 'Résolu':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Résolu</Badge>;
      case 'Escaladé':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Escaladé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Élevée':
        return <Badge className="bg-red-500">Haute</Badge>;
      case 'Moyenne':
        return <Badge className="bg-amber-500">Moyenne</Badge>;
      case 'Faible':
        return <Badge className="bg-green-500">Basse</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader 
          title="Mes Saisies" 
          rightAction={
            <Button size="sm" onClick={() => navigate('/nouvelle-saisie')}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle
            </Button>
          }
        />
        <LoadingSkeleton variant="list" count={5} />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader 
        title="Mes Saisies" 
        rightAction={
          <Button size="sm" onClick={() => navigate('/nouvelle-saisie')}>
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle
          </Button>
        }
      />

      {/* Tabs */}
      <div className="px-4 py-3 sticky top-14 bg-background z-30 border-b border-border">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'activities' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('activities')}
            className="flex-1"
          >
            <Activity className="h-4 w-4 mr-1" />
            Activités ({userActivities.length})
          </Button>
          <Button
            variant={activeTab === 'conflicts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('conflicts')}
            className="flex-1"
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Oppositions ({userOppositions.length})
          </Button>
          {pendingCount > 0 && (
            <Button
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('pending')}
              className="relative"
            >
              <Clock className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                {pendingCount}
              </span>
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'activities' && (
          <>
            {userActivities.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Aucune activité"
                description="Vous n'avez pas encore enregistré d'activité terrain."
                actionLabel="Nouvelle activité"
                onAction={() => navigate('/nouvelle-saisie')}
              />
            ) : (
              <div className="space-y-3">
                {userActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-card rounded-xl p-4 border border-border/50 shadow-soft"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 rounded-lg p-1.5">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{activity.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {getCommuneName(activity.commune_id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(activity.date).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                    {activity.participants > 0 && (
                      <p className="text-xs text-primary mt-2">
                        {activity.participants} participant(s)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'conflicts' && (
          <>
            {userOppositions.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="Aucune opposition"
                description="Vous n'avez pas encore signalé d'opposition."
                actionLabel="Signaler une opposition"
                onAction={() => navigate('/nouvelle-saisie')}
              />
            ) : (
              <div className="space-y-3">
                {userOppositions.map((opposition) => (
                  <div
                    key={opposition.id}
                    className="bg-card rounded-xl p-4 border border-border/50 shadow-soft"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-destructive/10 rounded-lg p-1.5">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{opposition.nature}</p>
                          <p className="text-xs text-muted-foreground">
                            {getCommuneName(opposition.commune_id)}
                          </p>
                        </div>
                      </div>
                      {getSeverityBadge(opposition.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {opposition.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(opposition.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(opposition.date_reported).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            {pendingEntries.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Tout est synchronisé"
                description="Aucune saisie en attente de synchronisation."
              />
            ) : (
              <div className="space-y-3">
                {pendingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "bg-card rounded-xl p-4 border shadow-soft",
                      entry.status === 'error' ? 'border-destructive/50' : 'border-border/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {entry.type === 'activity' ? (
                          <Activity className="h-4 w-4 text-primary" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-medium text-sm capitalize">{entry.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSyncStatusIcon(entry.status)}
                        <span className="text-xs text-muted-foreground capitalize">
                          {entry.status === 'pending' ? 'En attente' : entry.status === 'synced' ? 'Synchronisé' : 'Erreur'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Créé le {entry.createdAt.toLocaleString('fr-FR')}
                    </p>
                    {entry.error && (
                      <p className="text-xs text-destructive mt-1">{entry.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MesSaisies;
