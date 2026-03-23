/*
 * AppHeader — PicklePlay 상단 헤더 바
 * - 좌측: 로고 + 브랜드명
 * - 우측: 검색, 장바구니 아이콘
 */
import { ShoppingCart, Search } from "lucide-react";

interface AppHeaderProps {
  showSearch?: boolean;
  showCart?: boolean;
}

export default function AppHeader({ showSearch = false, showCart = true }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[#C8E632]/20 flex items-center justify-center border-2 border-[#C8E632]/40">
          <span className="text-lg">🏓</span>
        </div>
        <span className="text-lg font-bold text-[#1a1a2e] tracking-tight">
          PicklePlay
        </span>
      </div>
      <div className="flex items-center gap-1">
        {showSearch && (
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Search className="w-5 h-5 text-[#1a1a2e]" />
          </button>
        )}
        {showCart && (
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
            <ShoppingCart className="w-5 h-5 text-[#1a1a2e]" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C8E632] rounded-full text-[9px] font-bold flex items-center justify-center text-[#1a1a2e]">
              2
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
