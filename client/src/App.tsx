import { Route, Switch, useLocation } from "wouter";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import Layout from "./components/layout";
import LoginPage from "./pages/login";
import BulkLeadGenerator from "./components/BulkLeadGenerator";
import { Toaster } from "./components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LeadFinder from "@/pages/lead-finder";
import MyLeads from "@/pages/my-leads";
import SearchHistory from "@/pages/search-history";
import SettingsPage from "@/pages/settings";
import BulkLeads from "@/pages/BulkLeads";
import B2CLeads from "@/pages/B2CLeads";
import ConsumerBulkLeads from "@/pages/ConsumerBulkLeads";

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/home">
        <Layout>
          <Home />
        </Layout>
      </Route>
      <Route path="/">
        <Layout>
          <Home />
        </Layout>
      </Route>

      {/* Protected routes */}
      <Route path="/lead-finder">
        <ProtectedRoute>
          <Layout>
            <LeadFinder />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/my-leads">
        <ProtectedRoute>
          <Layout>
            <MyLeads />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/search-history">
        <ProtectedRoute>
          <Layout>
            <SearchHistory />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/bulk-leads">
        <ProtectedRoute>
          <Layout>
            <BulkLeads />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/b2c-leads">
        <ProtectedRoute>
          <Layout>
            <B2CLeads />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/consumer-leads">
        <ProtectedRoute>
          <Layout>
            <ConsumerBulkLeads />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
