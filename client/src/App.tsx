import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LeadFinder from "@/pages/lead-finder";
import MyLeads from "@/pages/my-leads";
import SearchHistory from "@/pages/search-history";
import SettingsPage from "@/pages/settings";
import BulkLeads from "./pages/BulkLeads";
import B2CLeads from "./pages/B2CLeads";
import ConsumerBulkLeads from "./pages/ConsumerBulkLeads";
import Layout from "@/components/layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={LeadFinder} />
        <Route path="/my-leads" component={MyLeads} />
        <Route path="/search-history" component={SearchHistory} />
        <Route path="/bulk-leads" component={BulkLeads} />
        <Route path="/b2c-leads" component={B2CLeads} />
        <Route path="/consumer-bulk-leads" component={ConsumerBulkLeads} />
        
        {/* These routes are placeholders for future implementation */}
        <Route path="/analytics">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="mt-2 text-gray-600">This feature is coming soon.</p>
            </div>
          </div>
        </Route>
        <Route path="/settings" component={SettingsPage} />
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
