import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

type ScheduleMatch = {
  id: number;
  eventId: number;
  courtNumber: number;
  courtGameNum: number;
  team1Name: string;
  team1Players: string;
  team2Name: string;
  team2Players: string;
  team1Score: number | null;
  team2Score: number | null;
  team1Result: string | null;
  team2Result: string | null;
  status: string;
  phaseLabel: string;
  evLabel: string;
  matchDate: string;
  timeStr: string | null;
};

export default function SchedulePublicPage() {
  const [, params] = useRoute("/tournament/:id/schedule");
  const [, navigate] = useLocation();
  const tournamentId = params?.id ? parseInt(params.id) : null;

  const [viewMode, setViewMode] = useState<"court" | "game">("court");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedGameNum, setSelectedGameNum] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // 코트/게임번호 선택 시 화면 상단으로 스크롤
  useEffect(() => {
    if (selectedCourt != null || selectedGameNum != null) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedCourt, selectedGameNum]);

  const { data, isLoading, error, refetch } =
    trpc.bracket.getPublicBracket.useQuery(
      { tournamentId: tournamentId! },
      { enabled: !!tournamentId }
    );

  const handleBack = () => {
    if (tournamentId) navigate(`/tournament/${tournamentId}`);
    else navigate("/tournament");
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm font-bold text-foreground">
          경기 일정을 불러올 수 없습니다
        </p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <button
          onClick={handleBack}
          className="text-sm text-primary font-bold mt-2 py-2 px-4"
        >
          돌아가기
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { dates, events, groups, mainByEvent, tournamentName } = data;

  // eventId → { label, matchDate }
  const eventInfoMap = new Map(
    events.map((e: any) => [
      e.id,
      { label: e.label as string, matchDate: e.matchDate as string },
    ])
  );

  // 모든 경기를 flat하게 수집
  const allMatches: ScheduleMatch[] = [];
  for (const g of groups) {
    const evInfo = eventInfoMap.get(g.tournamentEventId);
    for (const m of g.matches) {
      if (m.courtNumber != null && m.courtGameNum != null) {
        allMatches.push({
          id: m.id,
          eventId: g.tournamentEventId,
          courtNumber: m.courtNumber,
          courtGameNum: m.courtGameNum,
          team1Name: m.team1Name,
          team1Players: m.team1Players,
          team2Name: m.team2Name,
          team2Players: m.team2Players,
          team1Score: m.team1Score,
          team2Score: m.team2Score,
          team1Result: m.team1Result,
          team2Result: m.team2Result,
          status: m.status,
          phaseLabel: "예선",
          evLabel: evInfo?.label ?? "종목",
          matchDate: evInfo?.matchDate ?? "",
          timeStr: m.timeStr,
        });
      }
    }
  }
  for (const ev of mainByEvent) {
    const evInfo = eventInfoMap.get(ev.eventId);
    for (const m of ev.matches) {
      if (!m.isBye && m.courtNumber != null && m.courtGameNum != null) {
        allMatches.push({
          id: m.id,
          eventId: ev.eventId,
          courtNumber: m.courtNumber,
          courtGameNum: m.courtGameNum,
          team1Name: m.team1Label,
          team1Players: m.team1Players,
          team2Name: m.team2Label,
          team2Players: m.team2Players,
          team1Score: m.team1Score,
          team2Score: m.team2Score,
          team1Result: m.team1Result,
          team2Result: m.team2Result,
          status: m.status,
          phaseLabel: m.roundName,
          evLabel: evInfo?.label ?? "종목",
          matchDate: evInfo?.matchDate ?? "",
          timeStr: m.timeStr,
        });
      }
    }
  }

  const activeDate = selectedDate || dates[0] || "";
  const dateFiltered = allMatches.filter(m => m.matchDate === activeDate);
  const pool = showCompleted
    ? dateFiltered
    : dateFiltered.filter(m => m.status !== "completed");

  const totalCount = dateFiltered.length;
  const completedCount = dateFiltered.filter(m => m.status === "completed").length;

  // 코트 목록
  const courts = Array.from(new Set(pool.map(m => m.courtNumber))).sort(
    (a, b) => a - b
  );
  // 게임번호 목록
  const gameNums = Array.from(new Set(pool.map(m => m.courtGameNum))).sort(
    (a, b) => a - b
  );

  // 코트별: 선택된 코트의 경기 (게임번호 순)
  const courtMatches =
    selectedCourt != null
      ? pool
          .filter(m => m.courtNumber === selectedCourt)
          .sort((a, b) => a.courtGameNum - b.courtGameNum)
      : [];

  // 게임번호별: 선택된 번호의 경기 (코트 순)
  const gameMatches =
    selectedGameNum != null
      ? pool
          .filter(m => m.courtGameNum === selectedGameNum)
          .sort((a, b) => a.courtNumber - b.courtNumber)
      : [];

  function handleDateChange(d: string) {
    setSelectedDate(d);
    setSelectedCourt(null);
    setSelectedGameNum(null);
  }

  function handleViewModeChange(mode: "court" | "game") {
    setViewMode(mode);
    setSelectedCourt(null);
    setSelectedGameNum(null);
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-line-strong">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-line-strong shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">경기 일정</p>
            <h1 className="text-base font-extrabold text-foreground leading-tight truncate">
              {tournamentName}
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink-3 transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* 뷰 모드 탭 */}
        <div className="max-w-[480px] mx-auto px-4 pb-2 flex gap-1">
          {(["court", "game"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-ink-3 text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "court" ? "코트별" : "게임번호별"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-12 space-y-4">
        {/* 날짜 선택 */}
        {dates.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {dates.map((d: string) => (
              <button
                key={d}
                onClick={() => handleDateChange(d)}
                className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
                  activeDate === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-line-strong text-foreground hover:border-primary"
                }`}
              >
                {d.slice(5).replace("-", "/")}
              </button>
            ))}
          </div>
        )}

        {/* 진행 현황 + 완료 경기 토글 */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              전체 {totalCount}경기 중{" "}
              <span className="font-bold text-green-600">
                {completedCount}경기 완료
              </span>
            </p>
            <button
              onClick={() => setShowCompleted(v => !v)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                showCompleted
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-line-strong text-muted-foreground"
              }`}
            >
              {showCompleted ? "완료 경기 숨기기" : "완료 경기 보기"}
            </button>
          </div>
        )}

        {pool.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            {totalCount === 0 ? "배정된 경기가 없습니다" : "미완료 경기가 없습니다"}
          </p>
        ) : viewMode === "court" ? (
          <>
            {/* 코트 선택 */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                코트 선택
              </p>
              <div className="flex gap-2 flex-wrap">
                {courts.map(court => (
                  <button
                    key={court}
                    onClick={() =>
                      setSelectedCourt(court === selectedCourt ? null : court)
                    }
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                      selectedCourt === court
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-line-strong text-foreground hover:border-primary"
                    }`}
                  >
                    {court}코트
                  </button>
                ))}
              </div>
            </div>

            {/* 선택된 코트의 경기 목록 */}
            {selectedCourt != null &&
              (courtMatches.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {selectedCourt}코트 경기 없음
                </p>
              ) : (
                <div className="bg-card rounded-2xl border border-line-strong overflow-hidden">
                  <div className="px-4 py-2.5 bg-ink-3 border-b border-line-strong flex items-center justify-between">
                    <span className="text-sm font-extrabold text-foreground">
                      {selectedCourt}코트
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {courtMatches.filter(m => m.status !== "completed").length}경기 남음
                    </span>
                  </div>
                  <div className="divide-y divide-line-strong">
                    {courtMatches.map(m => (
                      <GameCard
                        key={m.id}
                        match={m}
                        showCourt={false}
                        showGameNum
                        onBracketClick={() =>
                          navigate(`/tournaments/${tournamentId}/bracket?eventId=${m.eventId}`)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
          </>
        ) : (
          <>
            {/* 게임번호 선택 */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                게임 번호 선택
              </p>
              <div className="flex gap-2 flex-wrap">
                {gameNums.map(num => (
                  <button
                    key={num}
                    onClick={() =>
                      setSelectedGameNum(num === selectedGameNum ? null : num)
                    }
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                      selectedGameNum === num
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-line-strong text-foreground hover:border-primary"
                    }`}
                  >
                    {num}번
                  </button>
                ))}
              </div>
            </div>

            {/* 선택된 게임번호의 경기 목록 */}
            {selectedGameNum != null &&
              (gameMatches.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {selectedGameNum}번 경기 없음
                </p>
              ) : (
                <div className="space-y-2">
                  {gameMatches.map(m => (
                    <GameCard
                      key={m.id}
                      match={m}
                      showCourt
                      showGameNum={false}
                      onBracketClick={() =>
                        navigate(`/tournaments/${tournamentId}/bracket?eventId=${m.eventId}`)
                      }
                    />
                  ))}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── 경기 카드 ────────────────────────────────────────────

function GameCard({
  match: m,
  showCourt,
  showGameNum = true,
  onBracketClick,
}: {
  match: ScheduleMatch;
  showCourt: boolean;
  showGameNum?: boolean;
  onBracketClick?: () => void;
}) {
  const isCompleted = m.status === "completed";

  return (
    <div
      className={`${showCourt ? "bg-card rounded-2xl border border-line-strong overflow-hidden" : ""} ${isCompleted ? "opacity-60" : ""}`}
    >
      {/* 경기 메타 */}
      <div
        className={`flex items-center gap-2 px-4 py-2 ${showCourt ? "bg-ink-3/50 border-b border-line-strong" : "pt-3"}`}
      >
        {showGameNum && (
          <span className="text-xs font-black text-muted-foreground">
            {m.courtGameNum}번게임
          </span>
        )}
        {showCourt && (
          <span className="text-xs font-bold text-muted-foreground">
            {m.courtNumber}코트
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          {m.evLabel} · {m.phaseLabel}
        </span>
        {m.timeStr && (
          <span className="text-[10px] text-muted-foreground">{m.timeStr}</span>
        )}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isCompleted
                ? "bg-green-500/15 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isCompleted ? "종료" : "예정"}
          </span>
          {onBracketClick && (
            <button
              onClick={onBracketClick}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              대진표
            </button>
          )}
        </div>
      </div>

      {/* 팀 vs 팀 */}
      <div className="px-4 py-3 flex items-center gap-3">
        <TeamBlock
          name={m.team1Name}
          players={m.team1Players}
          result={m.team1Result}
          score={m.team1Score}
          isCompleted={isCompleted}
          align="left"
        />

        <div className="shrink-0 flex flex-col items-center justify-center min-w-[56px]">
          {isCompleted ? (
            <span className="text-xl font-black text-muted-foreground">
              {m.team1Score} : {m.team2Score}
            </span>
          ) : (
            <span className="text-lg font-black text-muted-foreground/30">
              vs
            </span>
          )}
        </div>

        <TeamBlock
          name={m.team2Name}
          players={m.team2Players}
          result={m.team2Result}
          score={m.team2Score}
          isCompleted={isCompleted}
          align="right"
        />
      </div>
    </div>
  );
}

function TeamBlock({
  name,
  players,
  result,
  isCompleted,
  align,
}: {
  name: string;
  players: string;
  result: string | null;
  score: number | null;
  isCompleted: boolean;
  align: "left" | "right";
}) {
  const isWinner = result === "승";
  const textAlign = align === "left" ? "text-left" : "text-right";
  const itemsAlign = align === "left" ? "items-start" : "items-end";

  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-0.5 ${itemsAlign}`}>
      <p
        className={`text-sm font-bold leading-tight truncate w-full ${textAlign} ${
          isWinner ? "text-primary" : "text-foreground"
        }`}
      >
        {name}
      </p>
      {players && (
        <p
          className={`text-[10px] text-muted-foreground leading-tight truncate w-full ${textAlign}`}
        >
          {players}
        </p>
      )}
      {isCompleted && result && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
            isWinner
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {result}
        </span>
      )}
    </div>
  );
}
