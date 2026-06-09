type BracketEvent = {
  id: number;
  label: string;
  matchDate: string | null;
};

type BracketGroupTeam = {
  registrationId: number;
  playerNames?: string | null;
  finalRank?: number | null;
};

type QualifyingMatch = {
  id: number;
  courtNumber: number | null;
  timeStr: string | null;
  team1Name: string;
  team1Players?: string | null;
  team2Name: string;
  team2Players?: string | null;
  status: string;
};

type BracketGroup = {
  id: number;
  tournamentEventId: number;
  groupNumber: number;
  teams: BracketGroupTeam[];
  matches: QualifyingMatch[];
};

type MainMatch = {
  id: number;
  isBye?: boolean | null;
  courtNumber: number | null;
  timeStr: string | null;
  team1Label: string;
  team1Players?: string | null;
  team2Label: string;
  team2Players?: string | null;
  status: string;
};

type BracketData = {
  events: BracketEvent[];
  groups: BracketGroup[];
  mainByEvent: { eventId: number; matches: MainMatch[] }[];
};

export type PotentialBracketConflict = {
  date: string;
  timeStr: string;
  mixedMatchId: number;
  mainMatchId: number;
  mixedEventLabel: string;
  mainEventLabel: string;
  mixedCourtNumber: number | null;
  mainCourtNumber: number | null;
  mixedMatchLabel: string;
  mainMatchLabel: string;
  overlappingPlayers: string[];
};

function eventTypeOf(label: string) {
  return label.trim().split(/\s+/)[0] ?? "";
}

function splitPlayers(value?: string | null) {
  return (value ?? "")
    .split(/[,/·]/)
    .map(name => name.trim())
    .filter(Boolean);
}

function playerSet(...values: (string | null | undefined)[]) {
  return new Set(values.flatMap(splitPlayers));
}

function playersForGroupSource(
  label: string,
  eventId: number,
  groupsByEvent: Map<number, BracketGroup[]>
) {
  const match = label.match(/^(\d+)조\s+(\d+)위$/);
  if (!match) return [];

  const groupNumber = Number(match[1]);
  const rank = Number(match[2]);
  const group = groupsByEvent
    .get(eventId)
    ?.find(g => g.groupNumber === groupNumber);
  if (!group) return [];

  const rankedTeams = group.teams.filter(team => team.finalRank === rank);
  const candidateTeams = rankedTeams.length > 0 ? rankedTeams : group.teams;
  return candidateTeams.flatMap(team => splitPlayers(team.playerNames));
}

function possibleMainPlayers(
  match: MainMatch,
  eventId: number,
  groupsByEvent: Map<number, BracketGroup[]>
) {
  const players = playerSet(match.team1Players, match.team2Players);
  for (const player of playersForGroupSource(
    match.team1Label,
    eventId,
    groupsByEvent
  )) {
    players.add(player);
  }
  for (const player of playersForGroupSource(
    match.team2Label,
    eventId,
    groupsByEvent
  )) {
    players.add(player);
  }
  return players;
}

function intersectPlayers(a: Set<string>, b: Set<string>) {
  return [...a]
    .filter(player => b.has(player))
    .sort((x, y) => x.localeCompare(y, "ko"));
}

export function findPotentialBracketConflicts(
  bracket: BracketData
): PotentialBracketConflict[] {
  const eventsById = new Map(bracket.events.map(event => [event.id, event]));
  const groupsByEvent = new Map<number, BracketGroup[]>();
  for (const group of bracket.groups) {
    const list = groupsByEvent.get(group.tournamentEventId) ?? [];
    list.push(group);
    groupsByEvent.set(group.tournamentEventId, list);
  }

  const mixedQualifying: {
    event: BracketEvent;
    match: QualifyingMatch;
    players: Set<string>;
  }[] = [];
  for (const group of bracket.groups) {
    const event = eventsById.get(group.tournamentEventId);
    if (!event || eventTypeOf(event.label) !== "혼복") continue;
    for (const match of group.matches) {
      if (!match.timeStr || match.status === "completed") continue;
      mixedQualifying.push({
        event,
        match,
        players: playerSet(match.team1Players, match.team2Players),
      });
    }
  }

  const results: PotentialBracketConflict[] = [];
  for (const mainEvent of bracket.mainByEvent) {
    const event = eventsById.get(mainEvent.eventId);
    const eventType = event ? eventTypeOf(event.label) : "";
    if (!event || !["남복", "여복"].includes(eventType)) continue;

    for (const mainMatch of mainEvent.matches) {
      if (
        mainMatch.isBye ||
        !mainMatch.timeStr ||
        mainMatch.status === "completed"
      ) {
        continue;
      }
      const mainPlayers = possibleMainPlayers(
        mainMatch,
        mainEvent.eventId,
        groupsByEvent
      );

      for (const mixed of mixedQualifying) {
        if (mixed.event.matchDate !== event.matchDate) continue;
        if (mixed.match.timeStr !== mainMatch.timeStr) continue;

        const overlappingPlayers = intersectPlayers(mixed.players, mainPlayers);
        if (overlappingPlayers.length === 0) continue;

        results.push({
          date: event.matchDate ?? "",
          timeStr: mainMatch.timeStr,
          mixedMatchId: mixed.match.id,
          mainMatchId: mainMatch.id,
          mixedEventLabel: mixed.event.label,
          mainEventLabel: event.label,
          mixedCourtNumber: mixed.match.courtNumber,
          mainCourtNumber: mainMatch.courtNumber,
          mixedMatchLabel: `${mixed.match.team1Name} vs ${mixed.match.team2Name}`,
          mainMatchLabel: `${mainMatch.team1Label} vs ${mainMatch.team2Label}`,
          overlappingPlayers,
        });
      }
    }
  }

  return results.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.timeStr !== b.timeStr) return a.timeStr.localeCompare(b.timeStr);
    return a.mainMatchId - b.mainMatchId || a.mixedMatchId - b.mixedMatchId;
  });
}
