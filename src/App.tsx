import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { ProtectedRoute, ScopedRoute, PublicRoute } from "@/components/RouteGuards";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Menu from "./pages/Menu";
import Dashboard from "./pages/Dashboard";
import NouvelleSaisie from "./pages/NouvelleSaisie";
import MesSaisies from "./pages/MesSaisies";
import Profil from "./pages/Profil";
import ADPManagement from "./pages/ADPManagement";
import PDFCManagement from "./pages/PDFCManagement";
import PDFCPDashboard from "./pages/PDFCPDashboard";
import PdfcpDetailPage from "./pages/PdfcpDetailPage";
import PdfcpPilotagePage from "./pages/PdfcpPilotagePage";
import ActivitiesManagement from "./pages/ActivitiesManagement";
import ActivitiesDashboard from "./pages/ActivitiesDashboard";
import ConflictsManagement from "./pages/ConflictsManagement";
import OppositionsForm from "./pages/OppositionsForm";
import OrganisationsStructurelles from "./pages/OrganisationsStructurelles";
import AccessDenied from "./pages/AccessDenied";
import DebugAccess from "./pages/DebugAccess";
import AdminUnlockRequests from "./pages/AdminUnlockRequests";
import SupabaseStatus from "./pages/SupabaseStatus";
import NotFound from "./pages/NotFound";
import CahierJournal from "./pages/CahierJournal";
import PlanningIntelligent from "./pages/PlanningIntelligent";
import UsersManagement from "./pages/UsersManagement";
import AdminRoles from "./pages/AdminRoles";
import AdminAccessCodes from "./pages/AdminAccessCodes";

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/nouvelle-saisie" element={<ProtectedRoute><NouvelleSaisie /></ProtectedRoute>} />
      <Route path="/mes-saisies" element={<ProtectedRoute><MesSaisies /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
      
      {/* ADP Management - ADMIN, NATIONAL, REGIONAL can manage; PROVINCIAL read-only */}
      <Route path="/adp" element={
        <ScopedRoute requiredScopes={['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL']}>
          <ADPManagement />
        </ScopedRoute>
      } />
      
      {/* PDFCP - All authenticated users */}
      <Route path="/pdfcp" element={<ProtectedRoute><PDFCManagement /></ProtectedRoute>} />
      <Route path="/pdfcp/dashboard" element={<ProtectedRoute><PDFCPDashboard /></ProtectedRoute>} />
      <Route path="/pdfcp/central" element={<Navigate to="/pdfcp?source=central" replace />} />
      <Route path="/pdfcp/pilotage" element={<ProtectedRoute><PdfcpPilotagePage /></ProtectedRoute>} />
      <Route path="/pdfcp/:pdfcpId" element={<ProtectedRoute><PdfcpDetailPage /></ProtectedRoute>} />
      
      {/* Activities - All authenticated users */}
      <Route path="/activites" element={<ProtectedRoute><ActivitiesManagement /></ProtectedRoute>} />
      <Route path="/activites/dashboard" element={<ProtectedRoute><ActivitiesDashboard /></ProtectedRoute>} />
      
      {/* Conflicts/Oppositions - All authenticated users */}
      <Route path="/oppositions" element={<ProtectedRoute><ConflictsManagement /></ProtectedRoute>} />
      <Route path="/nouvelle-opposition" element={<ProtectedRoute><OppositionsForm /></ProtectedRoute>} />
      
      {/* Organisations - All authenticated users */}
      <Route path="/organisations" element={<ProtectedRoute><OrganisationsStructurelles /></ProtectedRoute>} />
      
      {/* Cahier Journal - All authenticated users */}
      <Route path="/cahier-journal" element={<ProtectedRoute><CahierJournal /></ProtectedRoute>} />
      
      {/* Planning Intelligent - Cockpit DG (all authenticated) */}
      <Route path="/planning-intelligent" element={<ProtectedRoute><PlanningIntelligent /></ProtectedRoute>} />
      
      {/* Debug Access - ADMIN only */}
      <Route path="/debug-access" element={
        <ScopedRoute requiredScopes={['ADMIN']}>
          <DebugAccess />
        </ScopedRoute>
      } />
      
      {/* Admin Unlock Requests - ADMIN only */}
      <Route path="/admin/unlock-requests" element={
        <ScopedRoute requiredScopes={['ADMIN']}>
          <AdminUnlockRequests />
        </ScopedRoute>
      } />
      
      {/* Admin Users Management - ADMIN and NATIONAL */}
      <Route path="/admin/users" element={
        <ScopedRoute requiredScopes={['ADMIN', 'NATIONAL']}>
          <UsersManagement />
        </ScopedRoute>
      } />
      
      {/* Admin Roles Management - ADMIN only */}
      <Route path="/admin/roles" element={
        <ScopedRoute requiredScopes={['ADMIN']}>
          <AdminRoles />
        </ScopedRoute>
      } />
      
      {/* Admin Access Codes - ADMIN only */}
      <Route path="/admin/access-codes" element={
        <ScopedRoute requiredScopes={['ADMIN']}>
          <AdminAccessCodes />
        </ScopedRoute>
      } />
      
      {/* Admin Supabase Status - Any authenticated user (first-admin setup needs access) */}
      <Route path="/admin/supabase-status" element={
        <ProtectedRoute>
          <SupabaseStatus />
        </ProtectedRoute>
      } />
      
      {/* Access Denied page */}
      <Route path="/access-denied" element={<AccessDenied />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DatabaseProvider>
          <SyncProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </SyncProvider>
        </DatabaseProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
