/*
 * AppHeader — PicklePlay 상단 헤더 바
 * Design System v1.0: Ink 배경, Optic Yellow 액센트
 * - 좌측: P-Mark 로고 + PICKLEPLAY. 브랜드명 (Archivo Black Italic)
 * - 우측: 로그인/회원가입 버튼 또는 사용자 메뉴
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { LogIn, User, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/pickleplay-logo-v3-SMF7wNMcxKCcJyRoNPaahQ.webp";

export default function AppHeader() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-background sticky top-0 z-40 border-b border-line">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2"
      >
        <img
          src={LOGO_URL}
          alt="PicklePlay"
          className="w-8 h-8 rounded-full object-cover"
        />
        <span
          className="text-base text-foreground tracking-tight"
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontStyle: "italic",
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          PICKLEPLAY<span className="text-primary">.</span>
        </span>
      </button>
      <div className="flex items-center gap-1">
        {loading ? (
          <div className="w-16 h-7 bg-ink-3 rounded-full animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 bg-primary/15 text-foreground px-3 py-1.5 rounded-full hover:bg-primary/25 transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary-foreground">
                  {user.name?.[0] ?? "U"}
                </span>
              </div>
              <span className="text-[11px] font-bold max-w-[80px] truncate">
                {user.name ?? "사용자"}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-xl shadow-lg border border-line-strong py-1 z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/mypage");
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  마이페이지
                </button>
                <div className="border-t border-line my-0.5" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[11px] font-bold px-3.5 py-1.5 rounded-full hover:bg-optic-deep transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
