import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, FileText, Activity, AlertTriangle, User, Building2, Settings, Bug, Unlock, BookOpen, UserCog, Server, Shield, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MenuKey } from '@/lib/rbac';
import BottomNav from '@/components/BottomNav';
import DemoBadge from '@/components/DemoBadge';
import adpCommunity from '@/assets/adp-community.jpg';

interface MenuItem {
  id: string;
  menuKey: MenuKey;
  title: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

const allMenuItems: MenuItem[] = [
  {
    id: 'adp',
    menuKey: 'gestion_adp',
    title: 'Gestion des ADP',
    icon: Users,
    path: '/adp',
    description: 'Agents de Développement de Partenariat',
  },
  {
    id: 'dashboard',
    menuKey: 'dashboard',
    title: 'Tableau de bord',
    icon: BarChart3,
    path: '/dashboard',
    description: 'Vue d\'ensemble et statistiques',
  },
  {
    id: 'pdfc',
    menuKey: 'pdfcp',
    title: 'Programmes PDFCP',
    icon: FileText,
    path: '/pdfcp',
    description: 'Plans de Développement Forestier',
  },
  {
    id: 'activites',
    menuKey: 'activites',
    title: 'Activités Terrain',
    icon: Activity,
    path: '/activites',
    description: 'Enregistrer les activités ADP',
  },
  {
    id: 'conflits',
    menuKey: 'conflits',
    title: 'Conflits & Oppositions',
    icon: AlertTriangle,
    path: '/oppositions',
    description: 'Signaler et suivre les conflits',
  },
  {
    id: 'organisations',
    menuKey: 'organisations',
    title: 'Organisations structurelles',
    icon: Building2,
    path: '/organisations',
    description: 'ODF, Coopératives, Associations, AGS',
  },
  {
    id: 'cahier_journal',
    menuKey: 'cahier_journal',
    title: 'Cahier Journal',
    icon: BookOpen,
    path: '/cahier-journal',
    description: 'Journal quotidien des activités terrain',
  },
  {
    id: 'admin_unlock_requests',
    menuKey: 'admin_unlock_requests',
    title: 'Demandes de déverrouillage',
    icon: Unlock,
    path: '/admin/unlock-requests',
    description: 'Gérer les demandes de déverrouillage PDFCP',
  },
  {
    id: 'admin_users',
    menuKey: 'admin_users',
    title: 'Utilisateurs',
    icon: UserCog,
    path: '/admin/users',
    description: 'Gestion des comptes utilisateurs',
  },
  {
    id: 'admin_roles',
    menuKey: 'admin_roles',
    title: 'Gestion des rôles',
    icon: Shield,
    path: '/admin/roles',
    description: 'Modifier les rôles et affectations',
  },
  {
    id: 'admin_access_codes',
    menuKey: 'admin_access_codes',
    title: "Codes d'accès",
    icon: KeyRound,
    path: '/admin/access-codes',
    description: "Créer et gérer les codes d'inscription",
  },
  {
    id: 'admin_supabase_status',
    menuKey: 'admin_supabase_status',
    title: 'Statut Backend',
    icon: Server,
    path: '/admin/supabase-status',
    description: 'Diagnostics de connexion backend',
  },
  {
    id: 'debug_access',
    menuKey: 'debug_access',
    title: 'Debug Access',
    icon: Bug,
    path: '/debug-access',
    description: 'Panneau de débogage RBAC',
  },
];

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const { user, canAccess } = useAuth();

  // Filter menu items based on user's scope level
  const visibleMenuItems = useMemo(() => {
    return allMenuItems.filter(item => canAccess(item.menuKey));
  }, [canAccess]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[280px]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${adpCommunity})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/60 to-primary/90" />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="pt-6 px-6">
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-full p-2">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-primary-foreground/80 text-xs">Bienvenue,</p>
                <p className="text-primary-foreground font-semibold text-sm">{user?.name}</p>
                {user?.role_label && (
                  <p className="text-primary-foreground/60 text-xs">{user.role_label}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex items-end pb-6 px-6">
            <div className="w-full animate-slide-up">
              <div className="bg-primary/60 backdrop-blur-md rounded-2xl px-6 py-4 border border-primary-foreground/20">
              <h1 className="text-2xl font-bold text-primary-foreground text-center text-shadow-sm">
                  GAP Forêts
                </h1>
                <p className="text-primary-foreground/80 text-sm text-center mt-1">
                  Gestion de l'approche participative
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Buttons */}
      <div className="px-4 -mt-6 relative z-20">
        <div className="space-y-3">
          {visibleMenuItems.map((item, index) => (
            <Button
              key={item.id}
              variant="menu"
              size="menu"
              onClick={() => navigate(item.path)}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="bg-primary-foreground/20 rounded-xl p-2.5 mr-3">
                <item.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-primary-foreground">{item.title}</p>
                <p className="text-xs text-primary-foreground/70 mt-0.5">{item.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <DemoBadge />
      <BottomNav />
    </div>
  );
};

export default Menu;
