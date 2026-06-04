import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Delete } from "lucide-react";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "DEL"],
];

export default function RefereeLoginPage() {
  const [, params] = useRoute("/tournament/:id/referee/login");
  const [, navigate] = useLocation();
  const tournamentId = params?.id ? parseInt(params.id) : null;

  const [pin, setPin] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const checkPin = trpc.bracket.checkRefereePin.useMutation({
    onSuccess: () => {
      sessionStorage.setItem(`referee_${tournamentId}`, "1");
      sessionStorage.setItem(`referee_pin_${tournamentId}`, pin);
      navigate(`/tournament/${tournamentId}/referee`);
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    },
  });

  const handleKey = (key: string) => {
    if (key === "DEL") {
      setPin(p => p.slice(0, -1));
      setErrorMsg("");
      return;
    }
    if (pin.length >= 6) return;
    const next = pin + key;
    setPin(next);
    setErrorMsg("");
    if (next.length >= 4) {
      // 4자리 이상 되면 자동 제출 대기 (최대 6자리까지 입력 가능, 확인 버튼으로 제출)
    }
  };

  const handleSubmit = () => {
    if (!pin || !tournamentId) return;
    checkPin.mutate({ tournamentId, pin });
  };

  const handleBack = () => {
    if (tournamentId) navigate(`/tournament/${tournamentId}`);
    else navigate("/tournament");
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-line-strong">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-line-strong shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">심판 전용</p>
            <h1 className="text-base font-extrabold text-foreground leading-tight">심판 로그인</h1>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-[480px] mx-auto w-full px-8 gap-8">
        {/* 안내 */}
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-foreground">심판 PIN을 입력해주세요</p>
          <p className="text-xs text-muted-foreground">대회 운영자에게 PIN을 문의하세요</p>
        </div>

        {/* PIN 표시 */}
        <div
          className={`flex items-center justify-center gap-3 transition-all ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
          style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}
        >
          {Array.from({ length: pin.length }).map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-primary border-2 border-primary scale-110 transition-all duration-100" />
          ))}
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <p className="text-sm text-destructive font-bold text-center -mt-4">{errorMsg}</p>
        )}

        {/* 키패드 */}
        <div className="w-full max-w-[280px] space-y-3">
          {KEYPAD.map((row, ri) => (
            <div key={ri} className="flex gap-3 justify-center">
              {row.map((key, ki) => {
                if (!key) return <div key={ki} className="w-[76px] h-[76px]" />;
                const isDel = key === "DEL";
                return (
                  <button
                    key={ki}
                    onClick={() => handleKey(key)}
                    disabled={checkPin.isPending}
                    className={`w-[76px] h-[76px] rounded-2xl flex items-center justify-center transition-all active:scale-95 select-none ${
                      isDel
                        ? "bg-ink-3 hover:bg-ink-3/80"
                        : "bg-card border border-line-strong hover:border-primary hover:bg-primary/5 active:bg-primary/10"
                    }`}
                  >
                    {isDel ? (
                      <Delete className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <span className="text-2xl font-bold text-foreground">{key}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || checkPin.isPending}
          className={`w-full max-w-[280px] py-4 rounded-2xl text-base font-bold transition-all ${
            pin.length >= 4 && !checkPin.isPending
              ? "bg-primary text-primary-foreground active:scale-[0.98]"
              : "bg-ink-3 text-muted-foreground cursor-not-allowed"
          }`}
        >
          {checkPin.isPending ? "확인 중..." : "확인"}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
