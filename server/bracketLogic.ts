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

export type BracketSeed =
  | { type: "team"; groupNumber: number; rank: number }
  | { type: "bye" };

export interface BracketSlot {
  roundNumber: number;
  matchNumber: number;
  seed1: BracketSeed | null;
  seed2: BracketSeed | null;
  nextMatchIndex: number | null;
  nextMatchPosition: 1 | 2 | null;
  loserNextMatchIndex: number | null;
  loserNextMatchPosition: 1 | 2 | null;
  isBye: boolean;
}

export function calculateQualifyingGroupSizes(teamCount: number): {
  numGroups: number;
  groupSizes: number[];
} {
  if (teamCount <= 0) return { numGroups: 0, groupSizes: [] };
  if (teamCount <= 5) return { numGroups: 1, groupSizes: [teamCount] };

  const numGroups = Math.ceil(teamCount / 4);
  const groupSizes = Array(numGroups).fill(3) as number[];
  let remaining = teamCount - numGroups * 3;

  for (let i = 0; i < numGroups && remaining > 0; i++) {
    groupSizes[i]++;
    remaining--;
  }

  return { numGroups, groupSizes };
}

function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** 표준 토너먼트 브라켓 시드 순서 반환 (1-indexed) */
function getStandardBracketOrder(n: number): number[] {
  if (n === 1) return [1];
  const result: number[] = [];
  const half = getStandardBracketOrder(n / 2);
  for (const pos of half) {
    result.push(pos);
    result.push(n + 1 - pos);
  }
  return result;
}

function isTeamSeed(
  seed: BracketSeed | null
): seed is Extract<BracketSeed, { type: "team" }> {
  return seed?.type === "team";
}

function refreshByeFlag(slot: BracketSlot) {
  slot.isBye = slot.seed1?.type === "bye" || slot.seed2?.type === "bye";
}

function rankPriority(seed: Extract<BracketSeed, { type: "team" }>) {
  return seed.rank * 1000 + seed.groupNumber;
}

function sameTeamSeed(
  a: Extract<BracketSeed, { type: "team" }>,
  b: Extract<BracketSeed, { type: "team" }>
) {
  return a.groupNumber === b.groupNumber && a.rank === b.rank;
}

function pairTeamsAvoidingSameGroup(
  teams: Extract<BracketSeed, { type: "team" }>[]
): [
  Extract<BracketSeed, { type: "team" }>,
  Extract<BracketSeed, { type: "team" }>,
][] {
  const remaining = [...teams];
  const pairs: [
    Extract<BracketSeed, { type: "team" }>,
    Extract<BracketSeed, { type: "team" }>,
  ][] = [];

  while (remaining.length >= 2) {
    const first = remaining.shift()!;
    const opponentIndex = remaining.findIndex(
      team => team.groupNumber !== first.groupNumber
    );
    const second = remaining.splice(
      opponentIndex >= 0 ? opponentIndex : 0,
      1
    )[0];
    pairs.push([first, second]);
  }

  return pairs;
}

function prioritizeByeForTopRanks(
  slots: BracketSlot[],
  firstRoundCount: number
) {
  const firstRoundSlots = slots.slice(0, firstRoundCount);
  const teams = firstRoundSlots
    .flatMap(slot => [slot.seed1, slot.seed2])
    .filter(isTeamSeed);
  const byeCount = firstRoundSlots.filter(slot => slot.isBye).length;
  if (byeCount === 0) return;

  const byeRecipients = [...teams]
    .sort((a, b) => rankPriority(a) - rankPriority(b))
    .slice(0, byeCount);
  const playTeams = teams.filter(
    team => !byeRecipients.some(recipient => sameTeamSeed(recipient, team))
  );

  const byeSlotIndexes = firstRoundSlots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.isBye)
    .map(({ index }) => index);
  const playSlotIndexes = firstRoundSlots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.isBye)
    .map(({ index }) => index);

  byeSlotIndexes.forEach((slotIndex, index) => {
    const slot = slots[slotIndex];
    slot.seed1 = byeRecipients[index] ?? null;
    slot.seed2 = { type: "bye" };
    refreshByeFlag(slot);
  });

  const pairs = pairTeamsAvoidingSameGroup(playTeams);
  playSlotIndexes.forEach((slotIndex, index) => {
    const slot = slots[slotIndex];
    const pair = pairs[index];
    slot.seed1 = pair?.[0] ?? null;
    slot.seed2 = pair?.[1] ?? null;
    refreshByeFlag(slot);
  });
}

/** 같은 조 출신 팀이 같은 하프에 있거나 1라운드에서 직접 대결하지 않도록 조정 */
function adjustBracketForAffiliation(
  slots: BracketSlot[],
  firstRoundCount: number
) {
  if (firstRoundCount < 2) return;
  const half = Math.floor(firstRoundCount / 2);

  function groupOf(s: BracketSeed | null): number | null {
    return s?.type === "team" ? s.groupNumber : null;
  }

  for (let pass = 0; pass < 10; pass++) {
    let improved = false;

    for (let i = 0; i < firstRoundCount; i++) {
      const gi1 = groupOf(slots[i].seed1);
      const gi2 = groupOf(slots[i].seed2);
      if (gi1 !== null && gi2 !== null && gi1 === gi2) {
        const otherHalfStart = i < half ? half : 0;
        for (let j = otherHalfStart; j < otherHalfStart + half; j++) {
          const gj1 = groupOf(slots[j].seed1);
          if (gj1 !== null && gj1 !== gi1 && groupOf(slots[j].seed2) !== gi1) {
            [slots[i].seed2, slots[j].seed1] = [slots[j].seed1, slots[i].seed2];
            improved = true;
            break;
          }
        }
      }
    }

    for (let i = 0; i < firstRoundCount; i++) {
      for (let j = i + 1; j < firstRoundCount; j++) {
        if (Math.floor(i / half) !== Math.floor(j / half)) continue;

        const gi1 = groupOf(slots[i].seed1);
        const gi2 = groupOf(slots[i].seed2);
        const gj1 = groupOf(slots[j].seed1);
        const gj2 = groupOf(slots[j].seed2);

        const conflict =
          (gi1 !== null && gj1 !== null && gi1 === gj1) ||
          (gi1 !== null && gj2 !== null && gi1 === gj2) ||
          (gi2 !== null && gj1 !== null && gi2 === gj1) ||
          (gi2 !== null && gj2 !== null && gi2 === gj2);

        if (conflict) {
          const mirror = i < half ? i + half : i - half;
          if (mirror !== j && mirror < firstRoundCount) {
            [slots[j].seed1, slots[mirror].seed1] = [
              slots[mirror].seed1,
              slots[j].seed1,
            ];
            improved = true;
          }
        }
      }
    }

    if (!improved) break;
  }

  for (let i = 0; i < firstRoundCount; i++) refreshByeFlag(slots[i]);
}

/** 본선 대진 슬롯 구조 생성 */
export function buildBracketSlots(
  numGroups: number,
  advanceCount: number,
  hasThirdPlace: boolean
): BracketSlot[] {
  const seeds: BracketSeed[] = [];
  for (let g = 1; g <= numGroups; g++)
    seeds.push({ type: "team", groupNumber: g, rank: 1 });
  if (advanceCount === 2) {
    for (let g = 1; g <= numGroups; g++)
      seeds.push({ type: "team", groupNumber: g, rank: 2 });
  }
  const totalTeams = seeds.length;
  const bracketSize = nextPowerOf2(totalTeams);
  const numByes = bracketSize - totalTeams;
  for (let b = 0; b < numByes; b++) seeds.push({ type: "bye" });

  const order = getStandardBracketOrder(bracketSize);
  const orderedSeeds = order.map(pos => seeds[pos - 1]);

  const totalRounds = Math.log2(bracketSize);
  const slots: BracketSlot[] = [];

  if (totalRounds < 1) return slots;

  for (let round = 1; round <= totalRounds; round++) {
    const count = bracketSize / Math.pow(2, round);
    for (let m = 0; m < count; m++) {
      slots.push({
        roundNumber: round,
        matchNumber: m + 1,
        seed1: null,
        seed2: null,
        nextMatchIndex: null,
        nextMatchPosition: null,
        loserNextMatchIndex: null,
        loserNextMatchPosition: null,
        isBye: false,
      });
    }
  }

  for (let i = 0; i < bracketSize / 2; i++) {
    slots[i].seed1 = orderedSeeds[i * 2];
    slots[i].seed2 = orderedSeeds[i * 2 + 1];
    refreshByeFlag(slots[i]);
  }

  let roundOffset = 0;
  for (let round = 1; round < totalRounds; round++) {
    const count = bracketSize / Math.pow(2, round);
    const nextOffset = roundOffset + count;
    for (let m = 0; m < count; m++) {
      slots[roundOffset + m].nextMatchIndex = nextOffset + Math.floor(m / 2);
      slots[roundOffset + m].nextMatchPosition = ((m % 2) + 1) as 1 | 2;
    }
    if (hasThirdPlace && round === totalRounds - 1) {
      const thirdPlaceIndex = slots.length;
      for (let m = 0; m < count; m++) {
        slots[roundOffset + m].loserNextMatchIndex = thirdPlaceIndex;
        slots[roundOffset + m].loserNextMatchPosition = (m + 1) as 1 | 2;
      }
    }
    roundOffset += count;
  }

  if (hasThirdPlace && totalRounds >= 2) {
    slots.push({
      roundNumber: totalRounds,
      matchNumber: 0,
      seed1: null,
      seed2: null,
      nextMatchIndex: null,
      nextMatchPosition: null,
      loserNextMatchIndex: null,
      loserNextMatchPosition: null,
      isBye: false,
    });
  }

  const firstRoundCount = Math.floor(bracketSize / 2);
  adjustBracketForAffiliation(slots, firstRoundCount);
  prioritizeByeForTopRanks(slots, firstRoundCount);

  return slots;
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

export interface MatchForCompletionCheck {
  id: number;
  isBye: boolean;
  status: string;
  nextMatchId: number | null;
}

export function isEffectivelyCompleted(
  matchId: number,
  allMatches: MatchForCompletionCheck[],
  visited = new Set<number>()
): boolean {
  if (visited.has(matchId)) return false;
  visited.add(matchId);
  const m = allMatches.find(x => x.id === matchId);
  if (!m) return false;
  if (m.isBye)
    return m.nextMatchId
      ? isEffectivelyCompleted(m.nextMatchId, allMatches, visited)
      : false;
  return m.status === "completed";
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
