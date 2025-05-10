import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LeadFinder from "@/pages/lead-finder";
import MyLeads from "@/pages/my-leads";
import SearchHistory from "@/pages/search-history";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LeadFinder} />
      <Route path="/my-leads" component={MyLeads} />
      <Route path="/search-history" component={SearchHistory} />
      
      {/* These routes are placeholders for future implementation */}
      <Route path="/analytics">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="mt-2 text-gray-600">This feature is coming soon.</p>
          </div>
        </div>
      </Route>
      <Route path="/settings">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="mt-2 text-gray-600">This feature is coming soon.</p>
          </div>
        </div>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
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
