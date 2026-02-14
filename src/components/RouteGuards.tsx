import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ScopeLevel } from '@/lib/rbac';
import AccessDenied from '@/pages/AccessDenied';

// Basic protected route - just checks authentication
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Scoped protected route - checks authentication AND scope
interface ScopedRouteProps {
  children: React.ReactNode;
  requiredScopes: ScopeLevel[];
}

export const ScopedRoute: React.FC<ScopedRouteProps> = ({ children, requiredScopes }) => {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (!auth.hasScope(requiredScopes)) {
    return <AccessDenied />;
  }
  
  return <>{children}</>;
};

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (auth.isAuthenticated) {
    return <Navigate to="/menu" replace />;
  }
  
  return <>{children}</>;
};
