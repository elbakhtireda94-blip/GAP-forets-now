import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, PenSquare, ClipboardList, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';

const navItems = [
  { path: '/menu', icon: Home, label: 'Accueil' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/profil', icon: User, label: 'Profil' },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { getPendingCount, isOnline } = useSync();
  
  const pendingCount = getPendingCount();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      {/* Online status indicator */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center text-xs py-1 font-medium">
          Mode hors ligne
        </div>
      )}
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.path === '/mes-saisies' && pendingCount > 0;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Sortir</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
