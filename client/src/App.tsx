import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import { useEffect, useRef } from "react";
import { useAuth } from "./_core/hooks/useAuth";
import { track, identify, reset, getPageName } from "./lib/mixpanel";
import HomePage from "./pages/HomePage";
import TournamentPage from "./pages/TournamentPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import RegistrationPage from "./pages/RegistrationPage";
import MyRegistrationsPage from "./pages/MyRegistrationsPage";
import CourtsPage from "./pages/CourtsPage";
import ShopPage from "./pages/ShopPage";
import SocialPage from "./pages/SocialPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostWritePage from "./pages/PostWritePage";
import NotificationsPage from "./pages/NotificationsPage";
import AdminPage from "./pages/AdminPage";
import TournamentManagePage from "./pages/TournamentManagePage";
import BracketPublicPage from "./pages/BracketPublicPage";
import TournamentWinnersPage from "./pages/TournamentWinnersPage";
import SchedulePublicPage from "./pages/SchedulePublicPage";
import RefereeLoginPage from "./pages/RefereeLoginPage";
import RefereePage from "./pages/RefereePage";
import RefereeCourtPage from "./pages/RefereeCourtPage";
import RefereeMatchPage from "./pages/RefereeMatchPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyPage from "./pages/MyPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import RegistrationCompletePage from "./pages/RegistrationCompletePage";

function PageTracker() {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    track("Page Viewed", { page: getPageName(location), path: location });
  }, [location]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      identify(user.id, { name: user.name, phone: user.phone, role: user.role });
    } else if (prevUserIdRef.current != null) {
      // 로그인 상태에서 비로그인으로 전환된 경우(로그아웃)에만 reset
      reset();
    }
    prevUserIdRef.current = user?.id ?? null;
  }, [user?.id, loading]);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Auth routes - no AppLayout */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Standalone pages - no AppLayout */}
      <Route path="/mypage" component={MyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/tournament/:id/register/complete" component={RegistrationCompletePage} />
      <Route path="/tournament/:id/manage" component={TournamentManagePage} />
      <Route path="/tournaments/:id/bracket" component={BracketPublicPage} />
      <Route path="/tournament/:id/winners" component={TournamentWinnersPage} />
      <Route path="/tournament/:id/schedule" component={SchedulePublicPage} />
      <Route path="/tournament/:id/referee/login" component={RefereeLoginPage} />
      <Route path="/tournament/:id/referee/match/:matchId" component={RefereeMatchPage} />
      <Route path="/tournament/:id/referee/court/:court" component={RefereeCourtPage} />
      <Route path="/tournament/:id/referee" component={RefereePage} />

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
            <Route path="/social/write" component={PostWritePage} />
            <Route path="/social/notifications" component={NotificationsPage} />
            <Route path="/social/post/:id" component={PostDetailPage} />
            <Route path="/social/post/:id/edit" component={PostWritePage} />
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
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <PageTracker />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
