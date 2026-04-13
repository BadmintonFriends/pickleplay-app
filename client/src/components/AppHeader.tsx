/*
 * AppHeader — PicklePlay 상단 헤더 바
 * - 좌측: 로고 + 브랜드명
 * - 우측: 선택적 아이콘
 */

export default function AppHeader() {
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
        <span className="text-[10px] font-bold bg-[#C8E632] text-[#1a1a2e] px-2.5 py-1 rounded-full uppercase tracking-wider">
          Coming Soon
        </span>
      </div>
    </header>
  );
}
