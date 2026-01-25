import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import EventosPage from "@/pages/EventosPage";
import LoginPage from "@/pages/LoginPage";
import CadastroPage from "@/pages/CadastroPage";
import EventoDetailPage from "@/pages/EventoDetailPage";
import MinhasInscricoesPage from "@/pages/MinhasInscricoesPage";
import MinhaContaPage from "@/pages/MinhaContaPage";
import ParticipantesPage from "@/pages/ParticipantesPage";
import InscricaoParticipantePage from "@/pages/InscricaoParticipantePage";
import InscricaoModalidadePage from "@/pages/InscricaoModalidadePage";
import InscricaoResumoPage from "@/pages/InscricaoResumoPage";
import InscricaoPagamentoPage from "@/pages/InscricaoPagamentoPage";
import InscricaoDetailPage from "@/pages/InscricaoDetailPage";
import PedidoDetailPage from "@/pages/PedidoDetailPage";
import EventoResultadosPage from "@/pages/EventoResultadosPage";

import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminOrganizersPage from "@/pages/admin/AdminOrganizersPage";
import AdminEventsPage from "@/pages/admin/AdminEventsPage";
import CreateEventPage from "@/pages/admin/events/CreateEventPage";
import EditEventPage from "@/pages/admin/events/EditEventPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminAthletesPage from "@/pages/admin/AdminAthletesPage";
import AdminNotFound from "@/pages/admin/AdminNotFound";
import AdminEventManagePage from "@/pages/admin/AdminEventManagePage";
import AdminEventInscritosPage from "@/pages/admin/AdminEventInscritosPage";
import AdminEventVouchersPage from "@/pages/admin/AdminEventVouchersPage";
import ProtectedAdminRoute from "@/pages/admin/ProtectedAdminRoute";

import { OrganizerAuthProvider } from "@/contexts/OrganizerAuthContext";
import { AthleteAuthProvider } from "@/contexts/AthleteAuthContext";
import OrganizerLoginPage from "@/pages/organizador/OrganizerLoginPage";
import OrganizerDashboardPage from "@/pages/organizador/OrganizerDashboardPage";
import OrganizerInscritosPage from "@/pages/organizador/OrganizerInscritosPage";
import OrganizerRelatoriosPage from "@/pages/organizador/OrganizerRelatoriosPage";
import OrganizerNotFound from "@/pages/organizador/OrganizerNotFound";
import ProtectedOrganizerRoute from "@/pages/organizador/ProtectedOrganizerRoute";

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={EventosPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/cadastro" component={CadastroPage} />
      <Route path="/evento/:slug" component={EventoDetailPage} />
      <Route path="/evento/:slug/inscricao/participante" component={InscricaoParticipantePage} />
      <Route path="/evento/:slug/inscricao/modalidade" component={InscricaoModalidadePage} />
      <Route path="/evento/:slug/inscricao/resumo" component={InscricaoResumoPage} />
      <Route path="/evento/:slug/inscricao/pagamento" component={InscricaoPagamentoPage} />
      <Route path="/evento/:slug/resultados" component={EventoResultadosPage} />
      <Route path="/minhas-inscricoes" component={MinhasInscricoesPage} />
      <Route path="/pedido/:id" component={PedidoDetailPage} />
      <Route path="/inscricao/:id" component={InscricaoDetailPage} />
      <Route path="/minha-conta" component={MinhaContaPage} />
      <Route path="/participantes" component={ParticipantesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Switch>
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/admin/organizadores">
          <ProtectedAdminRoute>
            <AdminOrganizersPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/eventos/novo">
          <ProtectedAdminRoute>
            <CreateEventPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/eventos/:id/gerenciar">
          <ProtectedAdminRoute>
            <AdminEventManagePage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/eventos/:id/inscritos">
          <ProtectedAdminRoute>
            <AdminEventInscritosPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/eventos/:id/vouchers">
          <ProtectedAdminRoute>
            <AdminEventVouchersPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/eventos/:id">
          <ProtectedAdminRoute>
            <EditEventPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/eventos">
          <ProtectedAdminRoute>
            <AdminEventsPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/usuarios">
          <ProtectedAdminRoute>
            <AdminUsersPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin/atletas">
          <ProtectedAdminRoute>
            <AdminAthletesPage />
          </ProtectedAdminRoute>
        </Route>
        <Route path="/admin">
          <ProtectedAdminRoute>
            <AdminDashboardPage />
          </ProtectedAdminRoute>
        </Route>
        <Route>
          <ProtectedAdminRoute>
            <AdminNotFound />
          </ProtectedAdminRoute>
        </Route>
      </Switch>
    </AdminAuthProvider>
  );
}

function OrganizerRoutes() {
  return (
    <OrganizerAuthProvider>
      <Switch>
        <Route path="/organizadores/login" component={OrganizerLoginPage} />
        <Route path="/organizadores/inscritos">
          <ProtectedOrganizerRoute>
            <OrganizerInscritosPage />
          </ProtectedOrganizerRoute>
        </Route>
        <Route path="/organizadores/relatorios">
          <ProtectedOrganizerRoute>
            <OrganizerRelatoriosPage />
          </ProtectedOrganizerRoute>
        </Route>
        <Route path="/organizadores">
          <ProtectedOrganizerRoute>
            <OrganizerDashboardPage />
          </ProtectedOrganizerRoute>
        </Route>
        <Route>
          <ProtectedOrganizerRoute>
            <OrganizerNotFound />
          </ProtectedOrganizerRoute>
        </Route>
      </Switch>
    </OrganizerAuthProvider>
  );
}

function AppRouter() {
  const [location] = useLocation();
  
  if (location.startsWith("/admin")) {
    return <AdminRoutes />;
  }
  
  if (location.startsWith("/organizadores")) {
    return <OrganizerRoutes />;
  }
  
  return (
    <AthleteAuthProvider>
      <PublicRouter />
    </AthleteAuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
