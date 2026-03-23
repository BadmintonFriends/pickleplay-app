import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import CourtsPage from "./pages/CourtsPage";
import MatchesPage from "./pages/MatchesPage";
import SocialPage from "./pages/SocialPage";
import ShopPage from "./pages/ShopPage";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/courts" component={CourtsPage} />
        <Route path="/matches" component={MatchesPage} />
        <Route path="/social" component={SocialPage} />
        <Route path="/shop" component={ShopPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
