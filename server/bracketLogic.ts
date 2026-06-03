export interface TeamStanding {
  registrationId: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  ageDiff: number;
}

export interface StandingMatch {
  team1Id: number | null;
  team2Id: number | null;
  team1Score: number | null;
  team2Score: number | null;
  status: string;
}

export interface GroupTeamForAdvancement {
  id: number;
  registrationId: number;
}

export interface MainMatchForAdvancement {
  id: number;
  isBye: boolean;
  team1SourceType: string | null;
  team1SourceGroupId: number | null;
  team1SourceRank: number | null;
  team2SourceType: string | null;
  team2SourceGroupId: number | null;
  team2SourceRank: number | null;
  nextMatchId: number | null;
  nextMatchPosition: number | null;
}

export interface GroupRankUpdate {
  groupTeamId: number;
  finalRank: number;
}

export interface MatchPatch {
  team1Id?: number | null;
  team2Id?: number | null;
  winnerId?: number | null;
  status?: "scheduled" | "completed";
}

export interface MatchUpdatePlan {
  matchId: number;
  patch: MatchPatch;
}

export function isGroupComplete(
  matches: Pick<StandingMatch, "status">[]
): boolean {
  return matches.every(m => m.status === "completed");
}

export function computeStandings(
  teamIds: number[],
  matches: StandingMatch[],
  ageMap: Map<number, number>
): TeamStanding[] {
  const standings = new Map<number, TeamStanding>();
  for (const id of teamIds) {
    standings.set(id, {
      registrationId: id,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      ageDiff: ageMap.get(id) ?? 0,
    });
  }

  const completedMatches = matches.filter(
    m =>
      m.status === "completed" &&
      m.team1Id &&
      m.team2Id &&
      m.team1Score !== null &&
      m.team2Score !== null
  );

  for (const m of completedMatches) {
    const t1 = standings.get(m.team1Id!);
    const t2 = standings.get(m.team2Id!);
    if (!t1 || !t2) continue;
    t1.pointsFor += m.team1Score!;
    t1.pointsAgainst += m.team2Score!;
    t2.pointsFor += m.team2Score!;
    t2.pointsAgainst += m.team1Score!;
    if (m.team1Score! > m.team2Score!) {
      t1.wins++;
      t2.losses++;
    } else if (m.team2Score! > m.team1Score!) {
      t2.wins++;
      t1.losses++;
    }
  }

  const list = Array.from(standings.values());

  const winGroups = new Map<number, number[]>();
  for (const s of list) {
    if (!winGroups.has(s.wins)) winGroups.set(s.wins, []);
    winGroups.get(s.wins)!.push(s.registrationId);
  }

  const h2hGroupWins = new Map<number, number>();
  winGroups.forEach(groupIds => {
    const idSet = new Set(groupIds);
    for (const id of groupIds) h2hGroupWins.set(id, 0);
    for (const m of completedMatches) {
      if (!m.team1Id || !m.team2Id) continue;
      if (!idSet.has(m.team1Id) || !idSet.has(m.team2Id)) continue;
      const winner = m.team1Score! > m.team2Score! ? m.team1Id : m.team2Id;
      h2hGroupWins.set(winner, (h2hGroupWins.get(winner) ?? 0) + 1);
    }
  });

  list.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const h2hA = h2hGroupWins.get(a.registrationId) ?? 0;
    const h2hB = h2hGroupWins.get(b.registrationId) ?? 0;
    if (h2hB !== h2hA) return h2hB - h2hA;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return a.ageDiff - b.ageDiff;
  });

  return list;
}

export function planGroupAdvancement(input: {
  groupId: number;
  groupTeams: GroupTeamForAdvancement[];
  standings: Pick<TeamStanding, "registrationId">[];
  advanceCount: number;
  mainMatches: MainMatchForAdvancement[];
}): { rankUpdates: GroupRankUpdate[]; matchUpdates: MatchUpdatePlan[] } {
  const rankUpdates: GroupRankUpdate[] = [];
  const matchUpdates: MatchUpdatePlan[] = [];

  for (let i = 0; i < input.standings.length; i++) {
    const gt = input.groupTeams.find(
      t => t.registrationId === input.standings[i].registrationId
    );
    if (gt) rankUpdates.push({ groupTeamId: gt.id, finalRank: i + 1 });
  }

  for (let rank = 1; rank <= input.advanceCount; rank++) {
    const advancingTeam = input.standings[rank - 1];
    if (!advancingTeam) continue;

    for (const match of input.mainMatches) {
      if (
        match.team1SourceType === "group_rank" &&
        match.team1SourceGroupId === input.groupId &&
        match.team1SourceRank === rank
      ) {
        matchUpdates.push({
          matchId: match.id,
          patch: { team1Id: advancingTeam.registrationId },
        });
        if (match.isBye) {
          matchUpdates.push({
            matchId: match.id,
            patch: {
              winnerId: advancingTeam.registrationId,
              status: "completed",
            },
          });
          if (match.nextMatchId && match.nextMatchPosition) {
            matchUpdates.push({
              matchId: match.nextMatchId,
              patch:
                match.nextMatchPosition === 1
                  ? { team1Id: advancingTeam.registrationId }
                  : { team2Id: advancingTeam.registrationId },
            });
          }
        }
      }

      if (
        match.team2SourceType === "group_rank" &&
        match.team2SourceGroupId === input.groupId &&
        match.team2SourceRank === rank
      ) {
        matchUpdates.push({
          matchId: match.id,
          patch: { team2Id: advancingTeam.registrationId },
        });
      }
    }
  }

  return { rankUpdates, matchUpdates };
}
