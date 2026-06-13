import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";

type TeamInfo = { teamName: string; playerNames: string } | null;

type EventPodium =
  | { eventId: number; eventName: string; matchDate: string | null; complete: false }
  | {
      eventId: number;
      eventName: string;
      matchDate: string | null;
      complete: true;
      first: TeamInfo;
      second: TeamInfo;
      third: TeamInfo;
      fourth: TeamInfo;
    };

function PlaceRow({
  medal,
  label,
  team,
  labelColor,
}: {
  medal: string;
  label: string;
  team: TeamInfo;
  labelColor: string;
}) {
  if (!team) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-line-strong last:border-0">
      <span className="text-base w-6 text-center shrink-0">{medal}</span>
      <span className={`text-xs font-bold w-6 shrink-0 ${labelColor}`}>{label}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground truncate">{team.teamName}</p>
        {team.playerNames && team.teamName !== team.playerNames && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{team.playerNames}</p>
        )}
      </div>
    </div>
  );
}

export default function TournamentWinnersPage() {
  const [, params] = useRoute("/tournament/:id/winners");
  const [, navigate] = useLocation();
  const tournamentId = params?.id ? parseInt(params.id) : null;

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const { data, isLoading, error } = trpc.bracket.getTournamentPodium.useQuery(
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
        <p className="text-sm font-bold text-foreground">입상자 정보를 불러올 수 없습니다</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <button onClick={handleBack} className="text-sm text-primary font-bold mt-2 py-2 px-4">
          돌아가기
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { tournamentName, dates, events } = data;
  const activeDate = selectedDate || dates[0] || "";
  const dateEvents = (events as EventPodium[]).filter(e => e.matchDate === activeDate);
  const selectedEvent = dateEvents.find(e => e.eventId === selectedEventId) ?? null;

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
            <p className="text-[10px] text-muted-foreground">입상자</p>
            <h1 className="text-base font-extrabold text-foreground leading-tight truncate">
              {tournamentName}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-5 pb-12 space-y-5">
        {/* 날짜 선택 */}
        {dates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">날짜 선택</p>
            <div className="flex gap-2 flex-wrap">
              {dates.map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedEventId(null);
                  }}
                  className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                    activeDate === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-line-strong text-foreground hover:border-primary"
                  }`}
                >
                  {d.slice(5).replace("-", "/")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 종목 선택 */}
        {activeDate && dateEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">종목 선택</p>
            <div className="flex gap-2 flex-wrap">
              {dateEvents.map(e => (
                <button
                  key={e.eventId}
                  onClick={() => setSelectedEventId(e.eventId)}
                  className={`text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors ${
                    selectedEventId === e.eventId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-line-strong text-foreground hover:border-primary"
                  }`}
                >
                  {e.eventName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 입상자 카드 */}
        {selectedEvent ? (
          <div className="bg-card border border-line-strong rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-line-strong">
              <p className="text-xs font-bold text-foreground">{selectedEvent.eventName}</p>
            </div>
            <div className="px-4 py-1">
              {!selectedEvent.complete ? (
                <p className="text-xs text-muted-foreground py-3">
                  이 종목의 모든 게임이 종료되지 않았습니다.
                </p>
              ) : (
                <>
                  <PlaceRow medal="🥇" label="1위" team={selectedEvent.first} labelColor="text-yellow-500" />
                  <PlaceRow medal="🥈" label="2위" team={selectedEvent.second} labelColor="text-slate-400" />
                  <PlaceRow medal="🥉" label="3위" team={selectedEvent.third} labelColor="text-orange-400" />
                  {selectedEvent.fourth && (
                    <PlaceRow medal="　" label="4위" team={selectedEvent.fourth} labelColor="text-muted-foreground" />
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          activeDate && (
            <p className="text-sm text-muted-foreground text-center py-10">
              종목을 선택하세요.
            </p>
          )
        )}
      </div>
    </div>
  );
}
