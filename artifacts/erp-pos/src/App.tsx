import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl("http://127.0.0.1:8080");
import { AppLayout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Pos from "@/pages/pos";
import Products from "@/pages/products";
import Inventory from "@/pages/inventory";
import Categories from "@/pages/categories";
import Sales from "@/pages/sales";
import Expenses from "@/pages/expenses";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

/** Auth completely removed – render the component directly inside AppLayout */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <Redirect to="/" />} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/pos" component={() => <ProtectedRoute component={Pos} />} />
      <Route path="/products" component={() => <ProtectedRoute component={Products} />} />
      <Route path="/inventory" component={() => <ProtectedRoute component={Inventory} />} />
      <Route path="/categories" component={() => <ProtectedRoute component={Categories} />} />
      <Route path="/sales" component={() => <ProtectedRoute component={Sales} />} />
      <Route path="/expenses" component={() => <ProtectedRoute component={Expenses} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

