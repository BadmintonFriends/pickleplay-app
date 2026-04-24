import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import TournamentPage from "./pages/TournamentPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import RegistrationPage from "./pages/RegistrationPage";
import MyRegistrationsPage from "./pages/MyRegistrationsPage";
import CourtsPage from "./pages/CourtsPage";
import ShopPage from "./pages/ShopPage";
import SocialPage from "./pages/SocialPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function Router() {
  return (
    <Switch>
      {/* Auth routes - no AppLayout */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Admin route - no AppLayout */}
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin/:rest*" component={AdminPage} />

      {/* App routes with bottom tab layout */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/tournament" component={TournamentPage} />
            <Route path="/tournament/:id" component={TournamentDetailPage} />
            <Route path="/tournament/:id/register" component={RegistrationPage} />
            <Route path="/my-registrations" component={MyRegistrationsPage} />
            <Route path="/courts" component={CourtsPage} />
            <Route path="/shop" component={ShopPage} />
            <Route path="/social" component={SocialPage} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
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
