import { useEffect } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

export default function RefereeCourtPage() {
  const [, params] = useRoute("/tournament/:id/referee/court/:court");
  const [, navigate] = useLocation();
  const search = useSearch();
  const tournamentId = params?.id ? parseInt(params.id) : null;
  const courtNumber = params?.court ? parseInt(params.court) : null;
  const date = new URLSearchParams(search).get("date") ?? "";
  const { isAuthenticated, loading: authLoading } = useAuth();
  const refereeAuthed = tournamentId ? sessionStorage.getItem(`referee_${tournamentId}`) : null;
  const pin = tournamentId ? (sessionStorage.getItem(`referee_pin_${tournamentId}`) ?? "") : "";

  useEffect(() => {
    if (authLoading || !tournamentId) return;
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(`/tournament/${tournamentId}/referee/court/${courtNumber}?date=${date}`)}`);
      return;
    }
    if (!refereeAuthed || !pin)
      navigate(`/tournament/${tournamentId}/referee/login`);
  }, [authLoading, courtNumber, date, isAuthenticated, navigate, pin, refereeAuthed, tournamentId]);

  const { data, isLoading, refetch } = trpc.bracket.getRefereeData.useQuery(
    { tournamentId: tournamentId!, pin },
    { enabled: !!tournamentId && isAuthenticated && !!refereeAuthed && !!pin }
  );

  if (authLoading || isLoading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!isAuthenticated || !refereeAuthed || !pin) return null;

  if (!data) return null;

  const courtMatches = data.matches
    .filter(m => m.courtNumber === courtNumber && m.date === date)
    .sort((a, b) => a.courtGameNum - b.courtGameNum);

  const done = courtMatches.filter(m => m.status === "completed").length;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-line-strong">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/tournament/${tournamentId}/referee`)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-line-strong shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">{data.tournamentName}</p>
            <h1 className="text-base font-extrabold text-foreground leading-tight">{courtNumber}코트 경기 목록</h1>
          </div>
          <button onClick={() => refetch()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink-3 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            done === courtMatches.length && courtMatches.length > 0
              ? "bg-green-500/15 text-green-600"
              : "bg-primary/10 text-primary"
          }`}>
            {done}/{courtMatches.length}
          </span>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-12 space-y-3">
        {courtMatches.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">경기 없음</p>
        )}
        {courtMatches.map(m => {
          const isCompleted = m.status === "completed";
          return (
            <button
              key={m.id}
              onClick={() => navigate(`/tournament/${tournamentId}/referee/match/${m.id}?date=${date}`)}
              className={`w-full text-left bg-card rounded-2xl border-2 overflow-hidden transition-all active:scale-[0.98] ${
                isCompleted ? "border-line-strong opacity-70" : "border-primary/40 hover:border-primary"
              }`}
            >
              {/* 상단 */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-ink-3/50 border-b border-line-strong">
                <span className="text-sm font-black text-foreground">{m.courtGameNum}번게임</span>
                <span className="text-xs text-muted-foreground">{m.timeStr}</span>
                <span className="text-[10px] text-muted-foreground">{m.evLabel} · {m.phase === "qualifying" ? "예선" : "본선"}</span>
                <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  isCompleted ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"
                }`}>
                  {isCompleted ? "종료" : "경기 입력 →"}
                </span>
              </div>

              {/* 팀 대결 */}
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className={`text-sm font-bold ${m.team1Result === "승" ? "text-primary" : "text-foreground"}`}>{m.team1Name}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2 min-w-[60px] justify-center">
                  {isCompleted ? (
                    <>
                      <span className={`text-xl font-black ${(m.team1Score ?? 0) > (m.team2Score ?? 0) ? "text-primary" : "text-muted-foreground"}`}>{m.team1Score}</span>
                      <span className="text-muted-foreground text-sm">:</span>
                      <span className={`text-xl font-black ${(m.team2Score ?? 0) > (m.team1Score ?? 0) ? "text-primary" : "text-muted-foreground"}`}>{m.team2Score}</span>
                    </>
                  ) : (
                    <span className="text-lg font-black text-muted-foreground/30">vs</span>
                  )}
                </div>
                <div className="flex-1 text-right">
                  <p className={`text-sm font-bold ${m.team2Result === "승" ? "text-primary" : "text-foreground"}`}>{m.team2Name}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
