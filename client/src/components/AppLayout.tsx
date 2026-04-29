/*
 * AppLayout — PicklePlay Design System v1.0
 * - 모바일 퍼스트 다크 테마 레이아웃
 * - 하단 탭 네비게이션: 홈, 대회, 코트예약, 샵, 프로필
 * - Optic Yellow (#D4FF3D) 액센트 활성 탭
 * - Lucide icons, stroke 2.2px
 */
import { useLocation } from "wouter";
import { Home, Trophy, MapPin, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", label: "홈", icon: Home },
  { path: "/tournament", label: "대회", icon: Trophy },
  { path: "/courts", label: "코트예약", icon: MapPin },
  { path: "/social", label: "소셜", icon: Users },
  { path: "/mypage", label: "프로필", icon: User },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-[480px] mx-auto bg-background relative lg:shadow-2xl lg:my-0 lg:rounded-none">
      {/* Main scrollable content area */}
      <main className="flex-1 overflow-y-auto pb-22 no-scrollbar">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-background border-t border-line z-50">
        <div className="flex items-center justify-around h-16 px-1">
          {tabs.map((tab) => {
            const isActive =
              tab.path === "/"
                ? location === "/"
                : tab.path === "/mypage"
                  ? location === "/mypage"
                  : location.startsWith(tab.path);
            const Icon = tab.icon;

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
                    isActive && "bg-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] transition-all",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                    strokeWidth={2.2}
                  />
                </div>
                <span
                  className={cn(
                    "text-[9px] tracking-wide transition-all",
                    isActive
                      ? "font-bold text-primary"
                      : "font-medium text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
