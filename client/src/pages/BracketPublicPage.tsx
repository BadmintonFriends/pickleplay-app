import { track } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";

type ActualBracketSettings = {
  matchDate: string | null;
  courtCount: number | null;
  courtNumbers: number[];
  qualifyingScore: number | null;
  mainScore: number | null;
  deuceEnabled: boolean | null;
  deuceMaxScore: number | null;
  advanceCount: number | null;
  teamCount: number | null;
  mainAdvanceTeamCount: number | null;
};

function formatCourtLabel(settings: ActualBracketSettings) {
  if (settings.courtCount == null) return "코트 미배정";
  if (settings.courtNumbers.length === 0) return `${settings.courtCount}코트`;
  return `${settings.courtCount}코트 (${settings.courtNumbers.join(", ")}번)`;
}

function formatDeuceLabel(settings: ActualBracketSettings) {
  if (settings.deuceEnabled == null) return "듀스 미설정";
  if (!settings.deuceEnabled) return "듀스 없음";
  return settings.deuceMaxScore != null
    ? `듀스 최대 ${settings.deuceMaxScore}점`
    : "듀스 있음";
}

function formatScoreLabel(settings: ActualBracketSettings) {
  const qualifying =
    settings.qualifyingScore != null
      ? `예선 ${settings.qualifyingScore}점`
      : null;
  const main =
    settings.mainScore != null ? `본선 ${settings.mainScore}점` : null;
  return [qualifying, main].filter(Boolean).join(" · ") || "점수 미설정";
}

function formatAdvanceRankLabel(settings: ActualBracketSettings) {
  return settings.advanceCount != null && settings.advanceCount > 0
    ? `본선 진출 ${settings.advanceCount}위까지`
    : null;
}

function formatEventLabel(event: {
  label: string;
  actualSettings?: ActualBracketSettings | null;
}) {
  const teamCount = event.actualSettings?.teamCount;
  return teamCount != null && teamCount > 0
    ? `${event.label} [${teamCount}팀]`
    : event.label;
}

export default function BracketPublicPage() {
  const [, params] = useRoute("/tournaments/:id/bracket");
  const [, navigate] = useLocation();
  const search = useSearch();
  const tournamentId = params?.id ? parseInt(params.id) : null;

  const searchParams = new URLSearchParams(search);
  const initEventId = searchParams.get("eventId");
  const initView = searchParams.get("view"); // groupId(숫자) 또는 "main"

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedView, setSelectedView] = useState<number | "main" | null>(
    null
  ); // groupId or "main"

  const { data, isLoading, error, refetch } =
    trpc.bracket.getPublicBracket.useQuery(
      { tournamentId: tournamentId! },
      { enabled: !!tournamentId }
    );

  useEffect(() => {
    if (data) {
      track("Bracket - View", {
        tournament_id: tournamentId,
        tournament_name: data.tournamentName,
      });
    }
    // eventId / view query param으로 자동 선택
    if (data && initEventId) {
      const targetId = parseInt(initEventId);
      const event = data.events.find((e: any) => e.id === targetId);
      if (event?.matchDate) {
        setSelectedDate(event.matchDate);
        setSelectedEventId(targetId);
        if (initView === "main") {
          setSelectedView("main");
        } else if (initView && !isNaN(parseInt(initView))) {
          setSelectedView(parseInt(initView)); // groupId
        }
      }
    }
  }, [data?.tournamentName]);

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
          대진표를 불러올 수 없습니다
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

  const dateEvents = events.filter(e => e.matchDate === selectedDate);
  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;
  const eventGroups = groups
    .filter(g => g.tournamentEventId === selectedEventId)
    .sort((a, b) => a.groupNumber - b.groupNumber);
  const eventMain = mainByEvent.find(m => m.eventId === selectedEventId);
  const hasMain = (eventMain?.matches?.length ?? 0) > 0;

  const selectedGroup =
    typeof selectedView === "number"
      ? (eventGroups.find(g => g.id === selectedView) ?? null)
      : null;

  type MainEventMatches = (typeof mainByEvent)[number]["matches"];

  // 라운드별로 묶기
  const mainRounds: { roundName: string; matches: MainEventMatches }[] = [];
  if (eventMain && selectedView === "main") {
    const seen = new Map<string, MainEventMatches>();
    for (const m of eventMain.matches) {
      if (!seen.has(m.roundName)) seen.set(m.roundName, []);
      seen.get(m.roundName)!.push(m);
    }
    for (const [roundName, matches] of seen.entries()) {
      mainRounds.push({ roundName, matches });
    }
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
            <p className="text-[10px] text-muted-foreground">대진표</p>
            <h1 className="text-base font-extrabold text-foreground leading-tight truncate">
              {tournamentName}
            </h1>
          </div>
          <button
            onClick={() =>
              tournamentId && navigate(`/tournament/${tournamentId}/schedule`)
            }
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink-3 transition-colors shrink-0"
            title="경기 일정"
          >
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => refetch()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink-3 transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-5 pb-12 space-y-5">
        {/* 날짜 선택 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            날짜 선택
          </p>
          <div className="flex gap-2 flex-wrap">
            {dates.map(d => (
              <button
                key={d}
                onClick={() => {
                  setSelectedDate(d);
                  setSelectedEventId(null);
                  setSelectedView(null);
                }}
                className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                  selectedDate === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-line-strong text-foreground hover:border-primary"
                }`}
              >
                {d.slice(5).replace("-", "/")}
              </button>
            ))}
          </div>
        </div>

        {/* 종목 선택 */}
        {selectedDate && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              종목 선택
            </p>
            {dateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                해당 날짜에 종목 없음
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {dateEvents.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSelectedEventId(e.id);
                      setSelectedView(null);
                    }}
                    className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                      selectedEventId === e.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-line-strong text-foreground hover:border-primary"
                    }`}
                  >
                    {formatEventLabel(e)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 조 / 본선 선택 */}
        {selectedEventId && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              조 / 본선 선택
            </p>
            {eventGroups.length === 0 && !hasMain ? (
              <p className="text-sm text-muted-foreground">대진 데이터 없음</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {eventGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedView(g.id)}
                    className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                      selectedView === g.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-line-strong text-foreground hover:border-primary"
                    }`}
                  >
                    {eventGroups.length === 1 ? "풀리그" : `${g.groupNumber}조`}
                  </button>
                ))}
                {hasMain && (
                  <button
                    onClick={() => setSelectedView("main")}
                    className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                      selectedView === "main"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-line-strong text-foreground hover:border-primary"
                    }`}
                  >
                    본선
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {selectedEvent?.actualSettings && (
          <div className="bg-card rounded-2xl border border-line-strong px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-muted-foreground">
                경기 방식
              </p>
              {selectedEvent.actualSettings.matchDate && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {selectedEvent.actualSettings.matchDate
                    .slice(5)
                    .replace("-", "/")}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                {formatCourtLabel(selectedEvent.actualSettings)}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                {formatScoreLabel(selectedEvent.actualSettings)}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                {formatDeuceLabel(selectedEvent.actualSettings)}
              </span>
              {selectedEvent.actualSettings.teamCount != null &&
                selectedEvent.actualSettings.teamCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                    {selectedEvent.actualSettings.teamCount}팀
                  </span>
                )}
              {selectedEvent.actualSettings.mainAdvanceTeamCount != null &&
                selectedEvent.actualSettings.mainAdvanceTeamCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                    본선 {selectedEvent.actualSettings.mainAdvanceTeamCount}팀
                  </span>
                )}
              {formatAdvanceRankLabel(selectedEvent.actualSettings) && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                  {formatAdvanceRankLabel(selectedEvent.actualSettings)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 선택된 조 — 조별리그 표 */}
        {selectedGroup && (
          <GroupTable
            group={selectedGroup}
            isSingleGroup={eventGroups.length === 1}
          />
        )}

        {/* 본선 대진표 */}
        {selectedView === "main" && (
          <div className="space-y-5">
            {mainRounds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                본선 경기 없음
              </p>
            ) : (
              mainRounds.map(({ roundName, matches }) => (
                <div key={roundName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-line-strong" />
                    <span className="text-sm font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                      {roundName}
                    </span>
                    <div className="h-px flex-1 bg-line-strong" />
                  </div>
                  {matches.map(m => (
                    <MainMatchCard key={m.id} match={m} />
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">날짜를 선택해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 조별리그 표 ─────────────────────────────────────────

type GroupData = {
  id: number;
  groupNumber: number;
  teams: {
    registrationId: number;
    teamName: string;
    playerNames: string;
    wins: number;
    losses: number;
    ptsFor: number;
    ptsAgainst: number;
    finalRank: number | null;
  }[];
  matches: {
    id: number;
    courtNumber: number | null;
    courtGameNum: number | null;
    timeStr: string | null;
    team1Name: string;
    team1Players: string;
    team2Name: string;
    team2Players: string;
    team1Score: number | null;
    team2Score: number | null;
    team1Result: string | null;
    team2Result: string | null;
    status: string;
  }[];
  pairGrid: Record<string, { s1: number; s2: number } | null>;
};

function GroupTable({
  group,
  isSingleGroup,
}: {
  group: GroupData;
  isSingleGroup?: boolean;
}) {
  const teams = group.teams;

  return (
    <div className="bg-card rounded-2xl border border-line-strong overflow-hidden">
      {/* 조 헤더 */}
      <div className="px-4 py-3 bg-ink-3 border-b border-line-strong flex items-center justify-between">
        <span className="text-base font-bold text-foreground">
          {isSingleGroup ? "풀리그" : `${group.groupNumber}조`}
        </span>
        <span className="text-xs text-muted-foreground">{teams.length}팀</span>
      </div>

      {/* 라운드 로빈 표 */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse min-w-max">
          <thead>
            <tr className="bg-ink-3/40">
              <th className="text-left px-3 py-2.5 font-bold text-muted-foreground border-r border-line-strong sticky left-0 bg-ink-3/80 min-w-[72px]">
                팀
              </th>
              {teams.map(t => (
                <th
                  key={t.registrationId}
                  className="px-2 py-2.5 font-bold text-muted-foreground border-r border-line-strong text-center min-w-[64px]"
                >
                  <span className="truncate block max-w-[64px] mx-auto">
                    {t.teamName}
                  </span>
                  {t.playerNames && (
                    <span className="truncate block max-w-[64px] mx-auto text-[9px] font-normal">
                      {t.playerNames}
                    </span>
                  )}
                </th>
              ))}
              <th className="px-3 py-2.5 font-bold text-muted-foreground border-r border-line-strong text-center whitespace-nowrap">
                경기 승패
              </th>
              <th className="px-3 py-2.5 font-bold text-muted-foreground border-r border-line-strong text-center whitespace-nowrap">
                득실
              </th>
              <th className="px-3 py-2.5 font-bold text-muted-foreground text-center">
                순위
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.map((row, ri) => {
              const ptsNet = row.ptsFor - row.ptsAgainst;
              return (
                <tr
                  key={row.registrationId}
                  className={`border-t border-line-strong ${ri % 2 === 1 ? "bg-ink-3/20" : ""}`}
                >
                  <td className="px-3 py-2.5 font-bold text-foreground border-r border-line-strong sticky left-0 bg-background max-w-[90px]">
                    <div className="truncate">{row.teamName}</div>
                    {row.playerNames && (
                      <div className="truncate text-[9px] font-normal text-muted-foreground">
                        {row.playerNames}
                      </div>
                    )}
                  </td>
                  {teams.map(col => {
                    const isSelf = row.registrationId === col.registrationId;
                    if (isSelf) {
                      return (
                        <td
                          key={col.registrationId}
                          className="px-2 py-2.5 border-r border-line-strong text-center bg-ink-3/40"
                        >
                          <span className="text-muted-foreground font-bold">
                            X
                          </span>
                        </td>
                      );
                    }
                    const key = `${row.registrationId}_${col.registrationId}`;
                    const cell = group.pairGrid[key];
                    if (!cell) {
                      return (
                        <td
                          key={col.registrationId}
                          className="px-2 py-2.5 border-r border-line-strong text-center text-muted-foreground"
                        >
                          -
                        </td>
                      );
                    }
                    const rowWon = cell.s1 > cell.s2;
                    return (
                      <td
                        key={col.registrationId}
                        className="px-2 py-2.5 border-r border-line-strong text-center font-mono"
                      >
                        <span
                          className={`font-bold ${rowWon ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {cell.s1}
                        </span>
                        <span className="text-muted-foreground">:</span>
                        <span
                          className={`font-bold ${!rowWon ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {cell.s2}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 border-r border-line-strong text-center font-bold text-foreground whitespace-nowrap">
                    {row.wins}승 {row.losses}패
                  </td>
                  <td className="px-3 py-2.5 border-r border-line-strong text-center whitespace-nowrap">
                    <span
                      className={`font-bold text-xs ${ptsNet > 0 ? "text-primary" : ptsNet < 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {ptsNet > 0 ? `+${ptsNet}` : ptsNet === 0 ? "0" : ptsNet}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold">
                    {row.finalRank ? (
                      <span
                        className={
                          row.finalRank === 1
                            ? "text-yellow-500"
                            : row.finalRank === 2
                              ? "text-gray-400"
                              : "text-foreground"
                        }
                      >
                        {row.finalRank}위
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 경기 목록 */}
      {group.matches.length > 0 && (
        <div className="border-t border-line-strong px-4 py-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground">경기 결과</p>
          {group.matches.map(m => {
            const isCompleted = m.status === "completed";
            return (
              <div key={m.id} className="bg-ink-3 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="font-bold">
                    {m.courtNumber != null ? `${m.courtNumber}코트` : "-"}
                    {m.courtGameNum != null ? ` ${m.courtGameNum}번게임` : ""}
                  </span>
                  <span>{m.timeStr ?? "-"}</span>
                  {isCompleted && (
                    <span className="ml-auto font-mono font-bold text-foreground text-sm">
                      {m.team1Score} : {m.team2Score}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-bold truncate ${m.team1Result === "승" ? "text-primary" : ""}`}
                    >
                      {m.team1Name}
                    </div>
                    {m.team1Players && (
                      <div className="text-xs truncate">{m.team1Players}</div>
                    )}
                  </div>
                  {m.team1Result && (
                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${m.team1Result === "승" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {m.team1Result}
                    </span>
                  )}
                  <span className="text-muted-foreground shrink-0 text-xs">
                    vs
                  </span>
                  {m.team2Result && (
                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${m.team2Result === "승" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {m.team2Result}
                    </span>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <div
                      className={`text-sm font-bold truncate ${m.team2Result === "승" ? "text-primary" : ""}`}
                    >
                      {m.team2Name}
                    </div>
                    {m.team2Players && (
                      <div className="text-xs truncate">{m.team2Players}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 본선 경기 카드 ─────────────────────────────────────

type MainMatch = {
  id: number;
  roundName: string;
  matchNumber: number;
  isBye: boolean;
  courtNumber: number | null;
  courtGameNum: number | null;
  timeStr: string | null;
  team1Label: string;
  team1Players: string;
  team2Label: string;
  team2Players: string;
  team1Score: number | null;
  team2Score: number | null;
  team1Result: string | null;
  team2Result: string | null;
  status: string;
};

function MainMatchCard({ match: m }: { match: MainMatch }) {
  const isCompleted = m.status === "completed";

  // 부전승
  if (m.isBye) {
    const advancingLabel =
      m.team1Label !== "부전승" ? m.team1Label : m.team2Label;
    return (
      <div className="bg-card rounded-2xl border border-dashed border-line-strong overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
              자동 진출
            </span>
            <span className="text-sm font-bold text-foreground">
              {advancingLabel}
            </span>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
            부전승
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-line-strong overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-ink-3/50 border-b border-line-strong">
        <span className="text-xs font-bold text-muted-foreground">
          {m.courtNumber != null ? `${m.courtNumber}코트` : "-"}
          {m.courtGameNum != null ? ` ${m.courtGameNum}번게임` : ""}
        </span>
        {m.timeStr && (
          <span className="text-xs text-muted-foreground">{m.timeStr}</span>
        )}
        <span
          className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${
            isCompleted
              ? "bg-green-500/15 text-green-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isCompleted ? "종료" : "예정"}
        </span>
      </div>

      <div className="px-4 py-4 flex items-center gap-3">
        <div className="flex-1 flex flex-col items-center gap-1">
          <p
            className={`text-sm font-bold text-center leading-tight ${m.team1Result === "승" ? "text-primary" : "text-foreground"}`}
          >
            {m.team1Label}
          </p>
          {m.team1Players && (
            <p className="text-xs text-center leading-tight text-foreground">
              {m.team1Players}
            </p>
          )}
          {m.team1Result && (
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                m.team1Result === "승"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m.team1Result}
            </span>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-center gap-2 min-w-[72px]">
          {isCompleted ? (
            <>
              <span
                className={`text-2xl font-black ${(m.team1Score ?? 0) > (m.team2Score ?? 0) ? "text-primary" : "text-muted-foreground"}`}
              >
                {m.team1Score}
              </span>
              <span className="text-muted-foreground">:</span>
              <span
                className={`text-2xl font-black ${(m.team2Score ?? 0) > (m.team1Score ?? 0) ? "text-primary" : "text-muted-foreground"}`}
              >
                {m.team2Score}
              </span>
            </>
          ) : (
            <span className="text-xl font-black text-muted-foreground/30">
              vs
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <p
            className={`text-sm font-bold text-center leading-tight ${m.team2Result === "승" ? "text-primary" : "text-foreground"}`}
          >
            {m.team2Label}
          </p>
          {m.team2Players && (
            <p className="text-xs text-center leading-tight text-foreground">
              {m.team2Players}
            </p>
          )}
          {m.team2Result && (
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                m.team2Result === "승"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m.team2Result}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
