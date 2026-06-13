import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";

type MatchSearchResult = {
  id: number;
  eventId: number;
  groupId: number | null;
  eventLabel: string;
  phaseLabel: string;
  matchDate: string | null;
  timeStr: string | null;
  courtNumber: number;
  courtGameNum: number | null;
  courtCompletedThroughGameNum: number;
  courtCompletedCount: number;
  courtTotalCount: number;
  status: string;
  team1Name: string;
  team1Players: string;
  team2Name: string;
  team2Players: string;
  team1Score: number | null;
  team2Score: number | null;
  team1Result: string | null;
  team2Result: string | null;
  matchedPlayerNames: string[];
};

type MatchSearchCandidate = {
  id: string;
  playerId: number;
  registrationId: number;
  name: string;
  affiliation: string;
  ageLabel: string;
  skillLevel: string;
  eventType: string;
  eventLabel: string;
  teammateNames: string[];
  matchDates: string[];
  matchCount: number;
  matches: MatchSearchResult[];
};

function compactDate(date: string | null) {
  return date ? date.slice(5).replace("-", "/") : "-";
}

function getCourtCurrentLabel(match: MatchSearchResult) {
  if (match.courtTotalCount <= 0) {
    return `${match.courtNumber}코트 진행 정보를 확인할 수 없습니다`;
  }
  if (match.courtCompletedThroughGameNum >= match.courtTotalCount) {
    return `${match.courtNumber}코트는 모든 경기가 종료되었습니다`;
  }
  return `${match.courtNumber}코트는 ${match.courtCompletedThroughGameNum + 1}번 경기 진행중입니다`;
}

function buildMatchSearchUrl(
  tournamentId: number,
  query: string,
  candidateId?: string | null
) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (candidateId) params.set("candidate", candidateId);
  const search = params.toString();
  return `/tournament/${tournamentId}/matches/search${search ? `?${search}` : ""}`;
}

function getInitialSearchParam(key: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

function formatCandidateDetail(candidate: MatchSearchCandidate) {
  const details = [
    candidate.affiliation,
    candidate.teammateNames.length > 0
      ? `파트너 ${candidate.teammateNames.join(", ")}`
      : "",
  ].filter(Boolean);
  return details.join(" · ") || "상세 정보 없음";
}

function formatCandidateDates(candidate: MatchSearchCandidate) {
  if (candidate.matchDates.length === 0) return "일정 미정";
  return candidate.matchDates.map(compactDate).join(", ");
}

export default function MatchSearchPage() {
  const [, params] = useRoute("/tournament/:id/matches/search");
  const [, navigate] = useLocation();
  const search = useSearch();
  const tournamentId = params?.id ? Number(params.id) : null;

  const [query, setQuery] = useState(() => getInitialSearchParam("q"));
  const [debouncedQuery, setDebouncedQuery] = useState(() =>
    getInitialSearchParam("q").trim()
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    () => getInitialSearchParam("candidate") || null
  );
  const didMountUrlSyncRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const nextQuery = searchParams.get("q") ?? "";
    const nextCandidateId = searchParams.get("candidate");
    setQuery(nextQuery);
    setDebouncedQuery(nextQuery.trim());
    setSelectedCandidateId(nextCandidateId);
  }, [search]);

  useEffect(() => {
    if (!tournamentId) return;
    if (!didMountUrlSyncRef.current) {
      didMountUrlSyncRef.current = true;
      return;
    }

    const nextUrl = buildMatchSearchUrl(tournamentId, debouncedQuery);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
    setSelectedCandidateId(null);
  }, [debouncedQuery, tournamentId]);

  const isSearchReady = debouncedQuery.length > 0;
  const { data, isLoading, isFetching, error, refetch } =
    trpc.bracket.searchMatchesByPlayerName.useQuery(
      { tournamentId: tournamentId!, query: debouncedQuery },
      { enabled: !!tournamentId && isSearchReady }
    );

  const candidates = (data?.candidates ?? []) as MatchSearchCandidate[];
  const selectedCandidate =
    candidates.find(candidate => candidate.id === selectedCandidateId) ?? null;
  const matches = selectedCandidate?.matches ?? [];
  const isDebouncing = query.trim() !== debouncedQuery;

  const handleBack = () => {
    if (tournamentId && selectedCandidateId) {
      navigate(buildMatchSearchUrl(tournamentId, debouncedQuery));
      return;
    }
    if (tournamentId) navigate(`/tournament/${tournamentId}`);
    else navigate("/tournament");
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-line-strong">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-line-strong shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">경기 찾기</p>
            <h1 className="text-base font-extrabold text-foreground leading-tight truncate">
              {data?.tournamentName ?? "선수 이름 검색"}
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            disabled={!isSearchReady}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink-3 transition-colors shrink-0 disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="max-w-[480px] mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedCandidateId(null);
              }}
              placeholder="선수 이름 검색"
              className="h-12 rounded-2xl bg-card border-line-strong pl-10 pr-10 text-sm font-bold"
            />
            {(isFetching || isDebouncing) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-12 space-y-3">
        {!isSearchReady ? (
          <div className="text-center py-16">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">
              선수 이름을 검색하세요
            </p>
          </div>
        ) : error ? (
          <div className="bg-card rounded-2xl border border-line-strong px-4 py-8 text-center">
            <p className="text-sm font-bold text-foreground">
              경기 정보를 불러올 수 없습니다
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line-strong px-4 py-8 text-center">
            <p className="text-sm font-bold text-foreground">
              검색 결과가 없습니다
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              이름 철자나 공백을 확인해주세요
            </p>
          </div>
        ) : !selectedCandidate ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                후보{" "}
                <span className="font-bold text-foreground">{data?.total}</span>
                명
              </p>
              {data && data.total > candidates.length && (
                <p className="text-[10px] text-muted-foreground">
                  상위 {candidates.length}명 표시
                </p>
              )}
            </div>
            <div className="space-y-2">
              {candidates.map(candidate => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onClick={() => {
                    setSelectedCandidateId(candidate.id);
                    if (tournamentId) {
                      navigate(
                        buildMatchSearchUrl(
                          tournamentId,
                          debouncedQuery,
                          candidate.id
                        )
                      );
                    }
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="bg-card rounded-2xl border border-line-strong px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">
                    {selectedCandidate.eventType || "종목 미정"} ·{" "}
                    {selectedCandidate.skillLevel}
                  </p>
                  <p className="text-sm font-extrabold text-foreground truncate mt-0.5">
                    {selectedCandidate.name}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {selectedCandidate.eventLabel || "종목 미정"} ·{" "}
                {formatCandidateDates(selectedCandidate)} · 총 {matches.length}
                경기
              </p>
            </div>
            {matches.map(match => (
              <MatchResultCard
                key={match.id}
                match={match}
                onBracketClick={() =>
                  tournamentId &&
                  navigate(
                    `/tournaments/${tournamentId}/bracket?eventId=${match.eventId}&view=${match.groupId ?? "main"}`
                  )
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  onClick,
}: {
  candidate: MatchSearchCandidate;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-2xl border border-line-strong px-4 py-3 text-left hover:border-primary transition-colors active:scale-[0.99]"
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <p className="text-[9px] text-muted-foreground">종목</p>
          <p className="text-xs font-bold text-foreground truncate mt-0.5">
            {candidate.eventType || "종목 미정"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] text-muted-foreground">급수</p>
          <p className="text-xs font-bold text-foreground truncate mt-0.5">
            {candidate.skillLevel}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] text-muted-foreground">이름</p>
          <p className="text-xs font-bold text-primary truncate mt-0.5">
            {candidate.name}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3 text-[10px] text-muted-foreground">
        <span className="truncate">{formatCandidateDetail(candidate)}</span>
        <span className="shrink-0 font-bold text-foreground">
          {candidate.matchCount}경기
        </span>
      </div>
      <p className="mt-1.5 text-[10px] font-bold text-primary">
        일정 {formatCandidateDates(candidate)}
      </p>
    </button>
  );
}

function MatchResultCard({
  match,
  onBracketClick,
}: {
  match: MatchSearchResult;
  onBracketClick: () => void;
}) {
  const isCompleted = match.status === "completed";

  return (
    <div className="bg-card rounded-2xl border border-line-strong overflow-hidden">
      <div className="px-4 py-3 bg-ink-3/50 border-b border-line-strong space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-foreground">
            {match.courtNumber}코트{" "}
            {match.courtGameNum != null ? `${match.courtGameNum}번게임` : ""}
          </span>
          <span
            className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              isCompleted
                ? "bg-green-500/15 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <CircleDashed className="w-3 h-3" />
            )}
            {isCompleted ? "종료" : "예정"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{compactDate(match.matchDate)}</span>
          {match.timeStr && <span>{match.timeStr}</span>}
          <span className="truncate">
            {match.eventLabel} · {match.phaseLabel}
          </span>
        </div>
        <div className="rounded-xl bg-background/60 px-3 py-2">
          <p className="text-[9px] text-muted-foreground">코트 진행</p>
          <p className="text-xs font-bold text-foreground mt-0.5">
            {getCourtCurrentLabel(match)}
          </p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {match.matchedPlayerNames.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {match.matchedPlayerNames.map(name => (
              <span
                key={name}
                className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/15 text-primary"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <TeamBlock
            name={match.team1Name}
            players={match.team1Players}
            result={match.team1Result}
            align="left"
          />
          <div className="shrink-0 min-w-[64px] text-center">
            {isCompleted ? (
              <p className="text-xl font-black text-foreground">
                {match.team1Score} : {match.team2Score}
              </p>
            ) : (
              <p className="text-lg font-black text-muted-foreground/40">vs</p>
            )}
          </div>
          <TeamBlock
            name={match.team2Name}
            players={match.team2Players}
            result={match.team2Result}
            align="right"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[10px] text-muted-foreground">
            종료 {match.courtCompletedCount}/{match.courtTotalCount}경기 기준
          </p>
          <button
            onClick={onBracketClick}
            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            대진표
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamBlock({
  name,
  players,
  result,
  align,
}: {
  name: string;
  players: string;
  result: string | null;
  align: "left" | "right";
}) {
  const isWinner = result === "승";
  const textAlign = align === "left" ? "text-left" : "text-right";
  const itemsAlign = align === "left" ? "items-start" : "items-end";

  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-1 ${itemsAlign}`}>
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
      {result && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
