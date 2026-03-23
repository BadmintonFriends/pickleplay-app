import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#C8E632]/20 flex items-center justify-center mb-4">
        <span className="text-4xl">🏓</span>
      </div>
      <h1 className="text-5xl font-black text-[#1a1a2e]">404</h1>
      <p className="text-sm text-gray-500 mt-2">페이지를 찾을 수 없습니다</p>
      <button
        onClick={() => navigate("/")}
        className="mt-6 flex items-center gap-2 bg-[#1a1a2e] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#2a2a3e] transition-colors"
      >
        <Home className="w-4 h-4" />
        홈으로 돌아가기
      </button>
    </div>
  );
}
