import { useState, useEffect } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

export default function RefereeMatchPage() {
  const [, params] = useRoute("/tournament/:id/referee/match/:matchId");
  const [, navigate] = useLocation();
  const search = useSearch();
  const dateParam = new URLSearchParams(search).get("date") ?? "";
  const tournamentId = params?.id ? parseInt(params.id) : null;
  const matchId = params?.matchId ? parseInt(params.matchId) : null;

  const [score1, setScore1] = useState<string>("");
  const [score2, setScore2] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    if (!sessionStorage.getItem(`referee_${tournamentId}`))
      navigate(`/tournament/${tournamentId}/referee/login`);
  }, [tournamentId]);

  const pin = tournamentId ? (sessionStorage.getItem(`referee_pin_${tournamentId}`) ?? "") : "";

  const { data: match, isLoading, refetch } = trpc.bracket.getRefereeMatchDetail.useQuery(
    { matchId: matchId!, pin },
    { enabled: !!matchId && !!pin }
  );

  const updateResult = trpc.bracket.refereeUpdateMatchResult.useMutation({
    onSuccess: () => {
      toast.success("점수가 저장되었습니다");
      setEditing(false);
      setConfirming(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setConfirming(false);
    },
  });

  useEffect(() => {
    if (match && match.status === "completed") {
      setScore1(String(match.team1Score ?? ""));
      setScore2(String(match.team2Score ?? ""));
    }
  }, [match]);

  const handleSubmit = () => {
    if (!matchId) return;
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      toast.error("점수를 올바르게 입력해주세요");
      return;
    }
    if (s1 === s2) {
      toast.error("동점은 유효하지 않습니다");
      return;
    }
    if (match) {
      const { targetScore, deuceEnabled, maxScore } = match;
      if (!isValidScore(s1, s2, targetScore, deuceEnabled, maxScore)) {
        const phaseStr = match.phase === "qualifying" ? "예선" : "본선";
        const deuceStr = deuceEnabled ? ` (듀스 최대 ${maxScore}점)` : " (듀스 없음)";
        toast.error(`유효하지 않은 점수입니다. ${phaseStr} 목표점수는 ${targetScore}점${deuceStr}`);
        return;
      }
    }
    setConfirming(true);
  };

  const handleConfirm = () => {
    if (!matchId) return;
    updateResult.mutate({ matchId, pin, team1Score: parseInt(score1), team2Score: parseInt(score2) });
  };

  function isValidScore(s1: number, s2: number, targetScore: number, deuceEnabled: boolean, maxScore: number): boolean {
    const winner = Math.max(s1, s2);
    const loser = Math.min(s1, s2);
    if (winner === loser) return false;
    if (winner === targetScore && loser <= targetScore - 2) return true;
    if (!deuceEnabled) return winner === targetScore;
    if (loser < targetScore - 1) return winner === targetScore;
    return winner <= maxScore && winner - loser === 2;
  }

  const goBack = () => {
    if (match) navigate(`/tournament/${tournamentId}/referee/court/${match.courtNumber}?date=${dateParam}`);
    else navigate(`/tournament/${tournamentId}/referee`);
  };

  if (isLoading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!match) return null;

  const isCompleted = match.status === "completed";
  const canEdit = !!match.team1Id && !!match.team2Id;

  const team1Name = match.team1Players.map(p => p.name).join(" / ") || match.team1SourceLabel || "팀 1";
  const team2Name = match.team2Players.map(p => p.name).join(" / ") || match.team2SourceLabel || "팀 2";

  return (
    <div className="min-h-[100dvh] bg-background">

      {/* 점수 확인 모달 */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="bg-card rounded-2xl border border-line-strong w-full max-w-[360px] overflow-hidden shadow-xl">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <h2 className="text-base font-extrabold text-foreground text-center">점수 확인</h2>
              <p className="text-xs text-muted-foreground text-center">점수가 맞는지 확인 후 저장해주세요</p>

              {/* 팀1 */}
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${parseInt(score1) > parseInt(score2) ? "bg-primary/10 border border-primary" : "bg-ink-3 border border-line-strong"}`}>
                <span className="text-sm font-bold text-foreground flex-1 truncate pr-3">{team1Name}</span>
                <span className={`text-3xl font-black shrink-0 ${parseInt(score1) > parseInt(score2) ? "text-primary" : "text-muted-foreground"}`}>{score1}</span>
              </div>

              {/* vs */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-line-strong" />
                <span className="text-xs font-bold text-muted-foreground">VS</span>
                <div className="h-px flex-1 bg-line-strong" />
              </div>

              {/* 팀2 */}
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${parseInt(score2) > parseInt(score1) ? "bg-primary/10 border border-primary" : "bg-ink-3 border border-line-strong"}`}>
                <span className="text-sm font-bold text-foreground flex-1 truncate pr-3">{team2Name}</span>
                <span className={`text-3xl font-black shrink-0 ${parseInt(score2) > parseInt(score1) ? "text-primary" : "text-muted-foreground"}`}>{score2}</span>
              </div>

              {/* 승자 요약 */}
              <p className="text-xs text-center font-bold text-primary">
                {parseInt(score1) > parseInt(score2) ? team1Name : team2Name} 승리
              </p>
            </div>

            <div className="flex border-t border-line-strong">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-4 text-sm font-bold text-foreground border-r border-line-strong active:bg-ink-3"
              >
                다시 입력
              </button>
              <button
                onClick={handleConfirm}
                disabled={updateResult.isPending}
                className="flex-1 py-4 text-sm font-bold text-primary active:bg-primary/10 disabled:opacity-50"
              >
                {updateResult.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-line-strong">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-line-strong shrink-0">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">
              {match.courtNumber}코트 · {match.evLabel} · {match.phase === "qualifying" ? "예선" : "본선"}
            </p>
            <h1 className="text-base font-extrabold text-foreground leading-tight">
              {match.timeStr} 경기
            </h1>
          </div>
          <button onClick={() => refetch()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink-3 transition-colors shrink-0">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            isCompleted ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"
          }`}>
            {isCompleted ? "종료" : "예정"}
          </span>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-5 pb-12 space-y-4">

        {/* 팀 1 */}
        <TeamCard
          label={match.team1SourceLabel || "팀 1"}
          players={match.team1Players}
          result={match.team1Result}
          score={isCompleted ? match.team1Score : null}
          isWinner={match.team1Result === "승"}
        />

        {/* vs 구분선 */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line-strong" />
          <span className="text-xs font-bold text-muted-foreground">VS</span>
          <div className="h-px flex-1 bg-line-strong" />
        </div>

        {/* 팀 2 */}
        <TeamCard
          label={match.team2SourceLabel || "팀 2"}
          players={match.team2Players}
          result={match.team2Result}
          score={isCompleted ? match.team2Score : null}
          isWinner={match.team2Result === "승"}
        />

        {/* 점수 입력 */}
        {canEdit && (
          <div className="bg-card rounded-2xl border border-line-strong p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">경기 결과 입력</h3>
              {isCompleted && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-primary font-bold"
                >
                  수정
                </button>
              )}
            </div>

            {(!isCompleted || editing) ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-bold truncate">
                      {match.team1Players.map(p => p.name).join(" / ")}
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={score1}
                      onChange={e => setScore1(e.target.value)}
                      placeholder="0"
                      className="w-full text-center text-2xl font-black bg-ink-3 border border-line-strong rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                  </div>
                  <span className="text-2xl font-black text-muted-foreground/40 shrink-0">:</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-bold truncate text-right">
                      {match.team2Players.map(p => p.name).join(" / ")}
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={score2}
                      onChange={e => setScore2(e.target.value)}
                      placeholder="0"
                      className="w-full text-center text-2xl font-black bg-ink-3 border border-line-strong rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  목표 점수 {match.targetScore}점
                  {match.deuceEnabled ? ` · 듀스 (최대 ${match.maxScore}점)` : " · 듀스 없음"}
                </p>
                <div className="flex gap-2">
                  {editing && (
                    <button
                      onClick={() => { setEditing(false); setScore1(String(match.team1Score ?? "")); setScore2(String(match.team2Score ?? "")); }}
                      className="flex-1 py-3.5 rounded-xl border border-line-strong text-sm font-bold text-foreground"
                    >
                      취소
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!score1 || !score2 || updateResult.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all"
                  >
                    {updateResult.isPending ? "저장 중..." : "결과 저장"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-4 py-2">
                <span className={`text-3xl font-black ${match.team1Result === "승" ? "text-primary" : "text-muted-foreground"}`}>
                  {match.team1Score}
                </span>
                <span className="text-muted-foreground text-xl">:</span>
                <span className={`text-3xl font-black ${match.team2Result === "승" ? "text-primary" : "text-muted-foreground"}`}>
                  {match.team2Score}
                </span>
              </div>
            )}
          </div>
        )}

        {!canEdit && (
          <div className="bg-ink-3 rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">양 팀이 확정된 후 점수를 입력할 수 있습니다</p>
          </div>
        )}

        {/* 코트 목록으로 */}
        <button
          onClick={goBack}
          className="w-full py-3.5 rounded-2xl border border-line-strong bg-card text-sm font-bold text-foreground hover:border-primary transition-colors active:scale-[0.98]"
        >
          {match.courtNumber}코트 경기 목록으로
        </button>
      </div>
    </div>
  );
}

// ─── 팀 카드 ─────────────────────────────────────────────

type PlayerInfo = { name: string; affiliation: string; birthDate: string };

function TeamCard({
  label, players, result, score, isWinner,
}: {
  label: string;
  players: PlayerInfo[];
  result: string | null;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <div className={`bg-card rounded-2xl border-2 overflow-hidden transition-all ${
      isWinner ? "border-primary" : "border-line-strong"
    }`}>
      {/* 팀 헤더 */}
      <div className={`px-4 py-3 flex items-center justify-between ${isWinner ? "bg-primary/10" : "bg-ink-3/50"}`}>
        <div className="flex items-center gap-2">
          {result && (
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
              isWinner ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              {result}
            </span>
          )}
          <span className={`text-sm font-bold ${isWinner ? "text-primary" : "text-foreground"}`}>{label}</span>
        </div>
        {score !== null && (
          <span className={`text-2xl font-black ${isWinner ? "text-primary" : "text-muted-foreground"}`}>{score}</span>
        )}
      </div>

      {/* 선수 목록 */}
      <div className="divide-y divide-line-strong">
        {players.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">선수 정보 없음</p>
          </div>
        ) : (
          players.map((p, i) => (
            <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{calcAge(p.birthDate)}세</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.affiliation || "소속 없음"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground font-mono">{p.birthDate}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
