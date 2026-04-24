/*
 * AppHeader — PicklePlay 상단 헤더 바
 * - 좌측: 로고 + 브랜드명
 * - 우측: 로그인/회원가입 버튼 또는 사용자 메뉴
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LogIn, User, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";

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
    <header className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/pickleplay-logo-v3-SMF7wNMcxKCcJyRoNPaahQ.webp"
          alt="PicklePlay"
          className="w-9 h-9 rounded-full object-cover"
        />
        <span className="text-lg font-bold text-[#1a1a2e] tracking-tight">
          PicklePlay
        </span>
      </div>
      <div className="flex items-center gap-1">
        {loading ? (
          <div className="w-16 h-7 bg-gray-100 rounded-full animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 bg-[#C8E632]/15 text-[#1a1a2e] px-3 py-1.5 rounded-full hover:bg-[#C8E632]/25 transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-[#C8E632] flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#1a1a2e]">
                  {user.name?.[0] ?? "U"}
                </span>
              </div>
              <span className="text-[11px] font-bold max-w-[80px] truncate">
                {user.name ?? "사용자"}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { setMenuOpen(false); navigate("/mypage"); }}
                  className="w-full text-left px-3 py-2 text-xs text-[#1a1a2e] hover:bg-gray-50 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  마이페이지
                </button>
                <div className="border-t border-gray-100 my-0.5" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
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
            className="flex items-center gap-1.5 bg-[#1a1a2e] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full hover:bg-[#2a2a3e] transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            로그인 / 회원가입
          </button>
        )}
      </div>
    </header>
  );
}
