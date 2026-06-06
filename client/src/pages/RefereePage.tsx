import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

export default function RefereePage() {
  const [, params] = useRoute("/tournament/:id/referee");
  const [, navigate] = useLocation();
  const tournamentId = params?.id ? parseInt(params.id) : null;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const refereeAuthed = tournamentId ? sessionStorage.getItem(`referee_${tournamentId}`) : null;
  const pin = tournamentId ? (sessionStorage.getItem(`referee_pin_${tournamentId}`) ?? "") : "";

  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (authLoading || !tournamentId) return;
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(`/tournament/${tournamentId}/referee`)}`);
      return;
    }
    if (!refereeAuthed || !pin)
      navigate(`/tournament/${tournamentId}/referee/login`);
  }, [authLoading, isAuthenticated, navigate, pin, refereeAuthed, tournamentId]);

  const { data, isLoading, error, refetch } = trpc.bracket.getRefereeData.useQuery(
    { tournamentId: tournamentId!, pin },
    { enabled: !!tournamentId && isAuthenticated && !!refereeAuthed && !!pin }
  );

  useEffect(() => {
    if (!data) return;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setSelectedDate(data.dates.includes(todayStr) ? todayStr : (data.dates[0] ?? ""));
  }, [data]);

  const handleLogout = () => {
    sessionStorage.removeItem(`referee_${tournamentId}`);
    sessionStorage.removeItem(`referee_pin_${tournamentId}`);
    navigate(`/tournament/${tournamentId}`);
  };

  if (authLoading || isLoading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!isAuthenticated || !refereeAuthed || !pin) return null;

  if (error || !data) return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="text-sm font-bold text-foreground">{error?.message ?? "데이터 없음"}</p>
      <button onClick={() => navigate(`/tournament/${tournamentId}`)} className="text-sm text-primary font-bold mt-2">돌아가기</button>
    </div>
  );

  const { tournamentName, dates, matches } = data;
  const dateCourts = selectedDate
    ? [...new Set(matches.filter(m => m.date === selectedDate).map(m => m.courtNumber))].sort((a, b) => a - b)
    : [];

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-line-strong">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-line-strong shrink-0">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">심판 화면</p>
            <h1 className="text-base font-extrabold text-foreground leading-tight truncate">{tournamentName}</h1>
          </div>
          <button onClick={() => refetch()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink-3 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={handleLogout} className="text-xs text-muted-foreground font-bold px-2 py-1 rounded-lg hover:bg-ink-3">
            로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-6 pb-12 space-y-6">
        {/* 날짜 선택 */}
        {dates.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">날짜</p>
            <div className="flex gap-2 flex-wrap">
              {dates.map(d => (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                    selectedDate === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-line-strong text-foreground hover:border-primary"
                  }`}>
                  {d.slice(5).replace("-", "/")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 코트 선택 */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">코트 선택</p>
          {dateCourts.length === 0 ? (
            <p className="text-sm text-muted-foreground">해당 날짜에 배정된 경기 없음</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {dateCourts.map(court => {
                const courtMatches = matches.filter(m => m.courtNumber === court && m.date === selectedDate);
                const done = courtMatches.filter(m => m.status === "completed").length;
                const total = courtMatches.length;
                return (
                  <button
                    key={court}
                    onClick={() => navigate(`/tournament/${tournamentId}/referee/court/${court}?date=${selectedDate}`)}
                    className="flex flex-col items-center gap-2 py-8 rounded-2xl border-2 border-line-strong bg-card hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
                  >
                    <span className="text-4xl font-black text-foreground">{court}</span>
                    <span className="text-sm font-bold text-muted-foreground">코트</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${
                      done === total && total > 0 ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"
                    }`}>
                      {done}/{total} 완료
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
