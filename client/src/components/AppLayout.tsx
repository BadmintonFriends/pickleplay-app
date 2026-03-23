/*
 * AppLayout — PicklePlay "Clean Sport Utility" Design
 * - 모바일 퍼스트 카드 기반 레이아웃
 * - 하단 탭 네비게이션 (홈, 코트, 매치, 소셜, 샵)
 * - 차트러스 라임(#C8E632) 액센트 활성 탭
 * - DM Sans 타이포그래피
 */
import { useLocation } from "wouter";
import { Home, MapPin, Trophy, Users, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", label: "홈", icon: Home },
  { path: "/courts", label: "코트", icon: MapPin },
  { path: "/matches", label: "매치", icon: Trophy },
  { path: "/social", label: "소셜", icon: Users },
  { path: "/shop", label: "샵", icon: ShoppingBag },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-[480px] mx-auto bg-background relative lg:shadow-2xl lg:my-0 lg:rounded-none">
      {/* Main scrollable content area */}
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 z-50">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive =
              tab.path === "/"
                ? location === "/"
                : location.startsWith(tab.path);
            const Icon = tab.icon;

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all duration-200",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                    isActive && "bg-[#C8E632]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all",
                      isActive ? "text-[#1a1a2e]" : "text-gray-400"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] tracking-wide transition-all",
                    isActive ? "font-bold text-[#1a1a2e]" : "font-medium text-gray-400"
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
