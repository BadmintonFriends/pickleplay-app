import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as bdb from "./bracketDb";
import { createRequire } from "module";
const XLSX: typeof import("xlsx") = createRequire(import.meta.url)("xlsx-js-style");

// ─── Permission Helper ───────────────────────────────────

export async function verifyBracketAccess(user: { id: number; role: string }, tournamentId: number) {
  if (user.role === "admin" || user.role === "super_admin") return;
  const isOrganizer = await db.isTournamentOrganizer(tournamentId, user.id);
  if (!isOrganizer) throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
}

// ─── Pure Helper Functions ───────────────────────────────

/** 코트별 경기 순번 맵 빌드: slotOrder 우선, 없으면 scheduledAt 기준 */
function buildCourtGameNumMap(
  matches: { id: number; courtNumber: number | null; scheduledAt: Date | null; slotOrder: number | null; isBye: boolean }[]
): Map<number, number> {
  const map = new Map<number, number>();
  const candidates = matches.filter(m => m.courtNumber != null && !m.isBye);
  const hasSlotOrder = candidates.some(m => m.slotOrder != null);
  if (hasSlotOrder) {
    const sorted = candidates.filter(m => m.slotOrder != null).sort((a, b) => {
      if (a.courtNumber !== b.courtNumber) return a.courtNumber! - b.courtNumber!;
      return a.slotOrder! - b.slotOrder!;
    });
    const counter = new Map<number, number>();
    for (const m of sorted) {
      const n = (counter.get(m.courtNumber!) ?? 0) + 1;
      counter.set(m.courtNumber!, n);
      map.set(m.id, n);
    }
  } else {
    const sorted = candidates.filter(m => m.scheduledAt != null).sort((a, b) => {
      if (a.courtNumber !== b.courtNumber) return a.courtNumber! - b.courtNumber!;
      return new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime();
    });
    const counter = new Map<number, number>();
    for (const m of sorted) {
      const n = (counter.get(m.courtNumber!) ?? 0) + 1;
      counter.set(m.courtNumber!, n);
      map.set(m.id, n);
    }
  }
  return map;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** 조 크기 계산: 기본 3팀, 나머지 팀은 1조→2조 순으로 배정 */
function calculateGroupSizes(teamCount: number): { numGroups: number; groupSizes: number[] } {
  if (teamCount <= 0) return { numGroups: 0, groupSizes: [] };
  if (teamCount <= 3) return { numGroups: 1, groupSizes: [teamCount] };
  if (teamCount === 4) return { numGroups: 1, groupSizes: [4] };
  if (teamCount === 5) return { numGroups: 2, groupSizes: [3, 2] };
  const numGroups = Math.floor(teamCount / 3);
  const remainder = teamCount % 3;
  const groupSizes = Array(numGroups).fill(3) as number[];
  for (let i = 0; i < remainder; i++) groupSizes[i] = 4;
  return { numGroups, groupSizes };
}

/** 조별 경기 페어 생성 (라운드 로빈) */
function getGroupMatchPairs(teamCount: number): [number, number][] {
  if (teamCount === 2) return [[0, 1]];
  if (teamCount === 3) return [[0, 1], [0, 2], [1, 2]];
  if (teamCount === 4) {
    // Berger 테이블: (R1: 0v1, 2v3), (R2: 0v2, 1v3), (R3: 0v3, 1v2)
    return [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  }
  const pairs: [number, number][] = [];
  for (let i = 0; i < teamCount - 1; i++) {
    for (let j = i + 1; j < teamCount; j++) pairs.push([i, j]);
  }
  return pairs;
}

/** 같은 소속 최소화하며 팀을 조에 배정 */
function assignTeamsToGroups(
  teams: { registrationId: number; affiliations: string[] }[],
  numGroups: number,
  groupSizes: number[]
): number[][] {
  const groups: number[][] = Array.from({ length: numGroups }, () => []);
  const groupAffCounts: Map<string, number>[] = Array.from({ length: numGroups }, () => new Map());

  // 소속 빈도로 정렬 (같은 소속이 많은 팀부터 분산 배정)
  const affFreq = new Map<string, number>();
  for (const t of teams) {
    for (const aff of t.affiliations) {
      affFreq.set(aff, (affFreq.get(aff) ?? 0) + 1);
    }
  }
  const sorted = shuffle(teams).sort((a, b) => {
    const freqA = Math.max(...a.affiliations.map(af => affFreq.get(af) ?? 0), 0);
    const freqB = Math.max(...b.affiliations.map(bf => affFreq.get(bf) ?? 0), 0);
    return freqB - freqA;
  });

  for (const team of sorted) {
    let bestGroup = -1;
    let bestScore = Infinity;
    for (let g = 0; g < numGroups; g++) {
      if (groups[g].length >= groupSizes[g]) continue;
      const sameAffCount = team.affiliations.reduce(
        (sum, aff) => sum + (groupAffCounts[g].get(aff) ?? 0),
        0
      );
      const score = sameAffCount * 1000 + groups[g].length;
      if (score < bestScore) { bestScore = score; bestGroup = g; }
    }
    if (bestGroup >= 0) {
      groups[bestGroup].push(team.registrationId);
      for (const aff of team.affiliations) {
        groupAffCounts[bestGroup].set(aff, (groupAffCounts[bestGroup].get(aff) ?? 0) + 1);
      }
    }
  }
  return groups;
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

type Seed = { type: "team"; groupNumber: number; rank: number } | { type: "bye" };

interface BracketSlot {
  roundNumber: number;
  matchNumber: number;
  seed1: Seed | null;
  seed2: Seed | null;
  nextMatchIndex: number | null;
  nextMatchPosition: 1 | 2 | null;
  loserNextMatchIndex: number | null;
  loserNextMatchPosition: 1 | 2 | null;
  isBye: boolean;
}

/** 본선 대진 슬롯 구조 생성 */
function buildBracketSlots(numGroups: number, advanceCount: number, hasThirdPlace: boolean): BracketSlot[] {
  // 시드 목록 생성
  const seeds: Seed[] = [];
  for (let g = 1; g <= numGroups; g++) seeds.push({ type: "team", groupNumber: g, rank: 1 });
  if (advanceCount === 2) {
    for (let g = 1; g <= numGroups; g++) seeds.push({ type: "team", groupNumber: g, rank: 2 });
  }
  const totalTeams = seeds.length;
  const bracketSize = nextPowerOf2(totalTeams);
  const numByes = bracketSize - totalTeams;
  for (let b = 0; b < numByes; b++) seeds.push({ type: "bye" });

  // 브라켓 순서로 시드 배치
  const order = getStandardBracketOrder(bracketSize);
  const orderedSeeds = order.map(pos => seeds[pos - 1]);

  const totalRounds = Math.log2(bracketSize);
  const slots: BracketSlot[] = [];

  // 진출 팀이 1팀 이하면 본선 대진 불가
  if (totalRounds < 1) return slots;

  // 모든 라운드 슬롯 생성
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

  // 1라운드 시드 배치
  for (let i = 0; i < bracketSize / 2; i++) {
    slots[i].seed1 = orderedSeeds[i * 2];
    slots[i].seed2 = orderedSeeds[i * 2 + 1];
    if (slots[i].seed1?.type === "bye" || slots[i].seed2?.type === "bye") {
      slots[i].isBye = true;
    }
  }

  // 라운드 간 nextMatchIndex 연결
  let roundOffset = 0;
  for (let round = 1; round < totalRounds; round++) {
    const count = bracketSize / Math.pow(2, round);
    const nextOffset = roundOffset + count;
    for (let m = 0; m < count; m++) {
      slots[roundOffset + m].nextMatchIndex = nextOffset + Math.floor(m / 2);
      slots[roundOffset + m].nextMatchPosition = (m % 2 + 1) as 1 | 2;
    }
    // 준결승(penultimate round)의 패자를 3·4위전에 연결
    if (hasThirdPlace && round === totalRounds - 1) {
      const thirdPlaceIndex = slots.length; // 아직 추가 전
      for (let m = 0; m < count; m++) {
        slots[roundOffset + m].loserNextMatchIndex = thirdPlaceIndex;
        slots[roundOffset + m].loserNextMatchPosition = (m + 1) as 1 | 2;
      }
    }
    roundOffset += count;
  }

  // 3·4위전 슬롯 추가 (준결승이 있어야 의미있음: totalRounds >= 2)
  if (hasThirdPlace && totalRounds >= 2) {
    slots.push({
      roundNumber: totalRounds,
      matchNumber: 0, // 0 = 3·4위전 식별자
      seed1: null,
      seed2: null,
      nextMatchIndex: null,
      nextMatchPosition: null,
      loserNextMatchIndex: null,
      loserNextMatchPosition: null,
      isBye: false,
    });
  }

  // 브라켓 소속 분리: 같은 소속 팀이 같은 하프에 있으면 최대한 이동
  // (simplified: top half = index 0..bracketSize/2-1, bottom half = bracketSize/2..)
  // slot seeding 배열에서 조정
  // 여기서는 1라운드 슬롯만 조정
  const firstRoundCount = Math.floor(bracketSize / 2);
  adjustBracketForAffiliation(slots, firstRoundCount);

  return slots;
}

/** 같은 조 출신 팀이 같은 하프에 있거나 1라운드에서 직접 대결하지 않도록 조정 */
function adjustBracketForAffiliation(slots: BracketSlot[], firstRoundCount: number) {
  if (firstRoundCount < 2) return;
  const half = Math.floor(firstRoundCount / 2);

  function groupOf(s: Seed | null): number | null {
    return s?.type === "team" ? s.groupNumber : null;
  }

  for (let pass = 0; pass < 10; pass++) {
    let improved = false;

    // 1) 같은 슬롯 내 seed1-seed2가 같은 조인 경우 (직접 1라운드 충돌) 수정
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

    // 2) 같은 하프에 같은 조 팀이 있는 경우 수정 (seed1/seed2 모두 체크)
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
            [slots[j].seed1, slots[mirror].seed1] = [slots[mirror].seed1, slots[j].seed1];
            improved = true;
          }
        }
      }
    }

    if (!improved) break;
  }
}

// ─── Score Validation ────────────────────────────────────

function isValidFinalScore(
  score1: number,
  score2: number,
  targetScore: number,
  deuceEnabled: boolean,
  deuceMaxScore: number
): boolean {
  const winner = Math.max(score1, score2);
  const loser = Math.min(score1, score2);
  if (winner === loser) return false;
  // 일반 승리: 목표점수 도달, 2점 이상 리드
  if (winner === targetScore && loser <= targetScore - 2) return true;
  if (!deuceEnabled) return winner === targetScore;
  // 듀스: 패자가 목표점수-1 이상일 때
  if (loser < targetScore - 1) return winner === targetScore;
  // 듀스 구간: 2점 차로 승리, 최대점수 이내
  return winner <= deuceMaxScore && winner - loser === 2;
}

// ─── Scheduling ──────────────────────────────────────────

interface SchedulableMatch {
  matchId: number;
  eventOrder: number;
  team1Phones: string[];
  team2Phones: string[];
  minSlot?: number; // 이 슬롯 이전에는 배정 불가 (본선 의존성 제약)
}

interface ScheduleResult {
  matchId: number;
  courtNumber: number;
  scheduledAt: Date;
  slotIndex: number;
}

/**
 * 경기를 코트/시간 슬롯에 배정.
 * - minSlot: 해당 슬롯 이전에는 배정 안 함 (종목별 예선 완료 후 본선 시작 등)
 * - occupiedSlotCourts: 이미 다른 스케줄러 호출에서 점유된 "slotIndex_courtNum" 목록
 *   (예선과 본선을 분리 스케줄링할 때 코트 중복 방지)
 */
function computeSchedule(
  matches: SchedulableMatch[],
  courtSetting: { courtCount: number; startTime: string; estimatedMinutes: number },
  matchDate: string,
  startSlotOffset = 0,
  occupiedSlotCourts: Set<string> = new Set()
): { results: ScheduleResult[]; slotsUsed: number } {
  const results: ScheduleResult[] = [];
  const [startHour, startMin] = courtSetting.startTime.split(":").map(Number);
  const [year, month, day] = matchDate.split("-").map(Number);

  const queue = [...matches].sort((a, b) => a.eventOrder - b.eventOrder);
  let slotIndex = startSlotOffset;
  // phone → 마지막으로 배정된 slotIndex (1슬롯 휴식 강제: 직전 슬롯 뛴 사람은 현 슬롯 배정 불가)
  const lastPlayedSlot = new Map<string, number>();
  const REST_SLOTS = 1; // 최소 건너뛸 슬롯 수 (1 = 1번 뛰면 3번부터 가능)

  let safety = 0;
  while (queue.length > 0 && safety++ < 2000) {
    // 이 슬롯에서 사용 가능한 코트 목록 (기존 점유 제외)
    const freeCourts: number[] = [];
    for (let c = 1; c <= courtSetting.courtCount; c++) {
      if (!occupiedSlotCourts.has(`${slotIndex}_${c}`)) freeCourts.push(c);
    }

    const currentSlotPhones = new Set<string>();
    let courtIdx = 0;
    const remaining: SchedulableMatch[] = [];

    for (const match of queue) {
      // 아직 준비 안 된 경기 (minSlot 미달)
      if (match.minSlot !== undefined && slotIndex < match.minSlot) {
        remaining.push(match); continue;
      }
      if (courtIdx >= freeCourts.length) { remaining.push(match); continue; }
      const allPhones = [...match.team1Phones, ...match.team2Phones];
      const conflict = allPhones.some(p => {
        if (currentSlotPhones.has(p)) return true;
        const last = lastPlayedSlot.get(p);
        return last !== undefined && (slotIndex - last) <= REST_SLOTS;
      });
      if (!conflict) {
        for (const p of allPhones) currentSlotPhones.add(p);
        const totalMins = startHour * 60 + startMin + slotIndex * courtSetting.estimatedMinutes;
        results.push({
          matchId: match.matchId,
          courtNumber: freeCourts[courtIdx++],
          scheduledAt: new Date(year, month - 1, day, Math.floor(totalMins / 60), totalMins % 60),
          slotIndex,
        });
      } else {
        remaining.push(match);
      }
    }

    for (const p of currentSlotPhones) lastPlayedSlot.set(p, slotIndex);

    queue.splice(0, queue.length, ...remaining);
    slotIndex++;
  }
  return { results, slotsUsed: slotIndex };
}

// ─── Standings Calculation ───────────────────────────────

interface TeamStanding {
  registrationId: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  ageDiff: number; // sum of birth years (smaller = older = higher rank)
}

function computeStandings(
  teamIds: number[],
  matches: { team1Id: number | null; team2Id: number | null; team1Score: number | null; team2Score: number | null; status: string }[],
  ageMap: Map<number, number> // registrationId → sum of birthYears
): TeamStanding[] {
  const standings = new Map<number, TeamStanding>();
  for (const id of teamIds) {
    standings.set(id, { registrationId: id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, ageDiff: ageMap.get(id) ?? 0 });
  }

  const completedMatches = matches.filter(m => m.status === "completed" && m.team1Id && m.team2Id && m.team1Score !== null && m.team2Score !== null);

  for (const m of completedMatches) {
    const t1 = standings.get(m.team1Id!);
    const t2 = standings.get(m.team2Id!);
    if (!t1 || !t2) continue;
    t1.pointsFor += m.team1Score!;
    t1.pointsAgainst += m.team2Score!;
    t2.pointsFor += m.team2Score!;
    t2.pointsAgainst += m.team1Score!;
    if (m.team1Score! > m.team2Score!) { t1.wins++; t2.losses++; }
    else if (m.team2Score! > m.team1Score!) { t2.wins++; t1.losses++; }
  }

  const list = [...standings.values()];

  // 승수가 같은 팀들끼리 H2H 승리 수를 미리 계산 (순환 타이 방지)
  const winGroups = new Map<number, number[]>();
  for (const s of list) {
    if (!winGroups.has(s.wins)) winGroups.set(s.wins, []);
    winGroups.get(s.wins)!.push(s.registrationId);
  }
  const h2hGroupWins = new Map<number, number>();
  for (const [, groupIds] of winGroups) {
    const idSet = new Set(groupIds);
    for (const id of groupIds) h2hGroupWins.set(id, 0);
    for (const m of completedMatches) {
      if (!m.team1Id || !m.team2Id) continue;
      if (!idSet.has(m.team1Id) || !idSet.has(m.team2Id)) continue;
      const winner = m.team1Score! > m.team2Score! ? m.team1Id : m.team2Id;
      h2hGroupWins.set(winner, (h2hGroupWins.get(winner) ?? 0) + 1);
    }
  }

  list.sort((a, b) => {
    // 1) 승수
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 2) 승자승 (동일 승수 그룹 내 H2H 승리 수 - 순환 타이도 올바르게 처리)
    const h2hA = h2hGroupWins.get(a.registrationId) ?? 0;
    const h2hB = h2hGroupWins.get(b.registrationId) ?? 0;
    if (h2hB !== h2hA) return h2hB - h2hA;
    // 3) 득실 (점수 차)
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    // 4) 다득점
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    // 5) 나이 합 많은 순 (birthYear 합 작을수록 나이 많음)
    return a.ageDiff - b.ageDiff;
  });

  return list;
}

function getHeadToHead(
  idA: number,
  idB: number,
  matches: { team1Id: number | null; team2Id: number | null; team1Score: number | null; team2Score: number | null }[]
): number {
  for (const m of matches) {
    if (m.team1Id === idA && m.team2Id === idB && m.team1Score !== null && m.team2Score !== null) {
      return m.team2Score - m.team1Score; // negative = A wins (lower is better for A)
    }
    if (m.team1Id === idB && m.team2Id === idA && m.team1Score !== null && m.team2Score !== null) {
      return m.team1Score - m.team2Score; // positive = B wins
    }
  }
  return 0;
}

// ─── Label Helpers ───────────────────────────────────────

function getRoundName(roundNumber: number, totalRounds: number, matchNumber: number): string {
  if (matchNumber === 0) return "3·4위전";
  if (roundNumber === totalRounds) return "결승";
  const remaining = totalRounds - roundNumber;
  if (remaining === 1) return "준결승 (4강)";
  const teams = Math.pow(2, remaining + 1);
  return `${teams}강`;
}

function getSeedLabel(seed: Seed | null): string {
  if (!seed) return "미정";
  if (seed.type === "bye") return "부전승";
  return `${seed.groupNumber}조 ${seed.rank}위`;
}

// ─── Excel Generation ─────────────────────────────────────

export async function generateBracketExcel(tournamentId: number): Promise<{ buffer: Buffer; tournamentName: string }> {
  const tournament = await db.getTournamentById(tournamentId);
  if (!tournament) throw new Error("대회를 찾을 수 없습니다");

  const settings = await bdb.getBracketSettings(tournamentId);
  const settingsMap = new Map(settings.map(s => [s.tournamentEventId, s]));
  const events = await db.getEventsByTournament(tournamentId);
  const eventMap = new Map(events.map(e => [e.id, e]));

  const allMatches = await bdb.getBracketMatches(tournamentId);
  const groups = await bdb.getBracketGroups(tournamentId);
  const groupIds = groups.map(g => g.id);
  const groupTeams = groupIds.length > 0 ? await bdb.getBracketGroupTeamsByGroupIds(groupIds) : [];

  // 팀 이름 조회
  const regIds = [...new Set([
    ...groupTeams.map(gt => gt.registrationId),
    ...allMatches.flatMap(m => [m.team1Id, m.team2Id].filter(Boolean) as number[]),
  ])];
  const courtSettingsList = await bdb.getBracketCourtSettings(tournamentId);
  const courtMap = new Map(courtSettingsList.map(cs => [cs.matchDate ?? "", cs]));

  const playersData: Map<number, { name: string; phone: string; affiliation: string }[]> = new Map();
  for (const regId of regIds) {
    const ps = await db.getPlayersByRegistration(regId);
    playersData.set(regId, ps.map(p => ({ name: p.name, phone: p.phone, affiliation: p.affiliation ?? "" })));
  }

  function teamName(regId: number | null): string {
    if (!regId) return "미정";
    const ps = playersData.get(regId);
    if (!ps || ps.length === 0) return `팀#${regId}`;
    const names = ps.map(p => p.name).join(", ");
    const uniqueAffs = [...new Set(ps.map(p => p.affiliation.trim()).filter(Boolean))];
    return uniqueAffs.length > 0 ? `${uniqueAffs.join(" & ")}\n${names}` : names;
  }

  function matchLabel(match: typeof allMatches[0], position: 1 | 2): string {
    const teamId = position === 1 ? match.team1Id : match.team2Id;
    if (teamId) return teamName(teamId);
    const sourceType = position === 1 ? match.team1SourceType : match.team2SourceType;
    const sourceGroupId = position === 1 ? match.team1SourceGroupId : match.team2SourceGroupId;
    const sourceRank = position === 1 ? match.team1SourceRank : match.team2SourceRank;
    const sourceMatchId = position === 1 ? match.team1SourceMatchId : match.team2SourceMatchId;
    if (sourceType === "group_rank" && sourceGroupId && sourceRank) {
      const grp = groups.find(g => g.id === sourceGroupId);
      return grp ? `${grp.groupNumber}조 ${sourceRank}위` : "미정";
    }
    if (sourceType === "match_winner" && sourceMatchId) {
      const srcMatch = allMatches.find(m => m.id === sourceMatchId);
      if (srcMatch) {
        const ev = settingsMap.get(srcMatch.tournamentEventId);
        const totalRounds = ev ? Math.log2(nextPowerOf2(groups.filter(g => g.tournamentEventId === srcMatch.tournamentEventId).length * (ev.advanceCount ?? 1))) : 1;
        return `${getRoundName(srcMatch.roundNumber, totalRounds, srcMatch.matchNumber)} ${srcMatch.matchNumber}경기 승자`;
      }
    }
    if (!sourceType && match.isBye) return "부전승";
    return "미정";
  }

  // 종목별 본선 총 라운드 수 맵
  const eventTotalRoundsMap = new Map<number, number>();
  for (const [evId, ev] of eventMap) {
    const numAdvancing = groups.filter(g => g.tournamentEventId === evId).length * ((settingsMap.get(evId)?.advanceCount) ?? 1);
    eventTotalRoundsMap.set(evId, Math.ceil(Math.log2(nextPowerOf2(Math.max(numAdvancing, 1)))));
  }

  const wb = XLSX.utils.book_new();

  // ── 날짜별 그리드 시트 (시간 × 코트 격자) ────────────
  const scheduledMatches = allMatches
    .filter(m => m.scheduledAt)
    .sort((a, b) => {
      const tA = new Date(a.scheduledAt!).getTime();
      const tB = new Date(b.scheduledAt!).getTime();
      return tA !== tB ? tA - tB : (a.courtNumber ?? 0) - (b.courtNumber ?? 0);
    });

  // 날짜별 그룹핑
  const dateMsMap = new Map<string, typeof scheduledMatches>();
  for (const m of scheduledMatches) {
    const dt = new Date(m.scheduledAt!);
    const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    if (!dateMsMap.has(d)) dateMsMap.set(d, []);
    dateMsMap.get(d)!.push(m);
  }

  for (const [date, dateMatches] of [...dateMsMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const cs = courtMap.get(date);
    const courtCount = cs?.courtCount ?? Math.max(1, ...dateMatches.map((m: typeof scheduledMatches[0]) => m.courtNumber ?? 1));

    // 시간 목록 (중복 없이, 정렬)
    const seenTimes = new Set<number>();
    const timeEntries: [number, string][] = [];
    for (const m of dateMatches) {
      const dt = new Date(m.scheduledAt!);
      const ms = dt.getTime();
      if (!seenTimes.has(ms)) {
        seenTimes.add(ms);
        const ts = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
        timeEntries.push([ms, ts]);
      }
    }
    timeEntries.sort((a, b) => a[0] - b[0]);

    // 경기 격자 조회: "timeMs_courtNum" → match
    const matchGrid = new Map<string, typeof scheduledMatches[0]>();
    for (const m of dateMatches) {
      const ms = new Date(m.scheduledAt!).getTime();
      matchGrid.set(`${ms}_${m.courtNumber}`, m);
    }

    const ws: Record<string, any> = {};
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    const setCell = (r: number, c: number, v: string | number, wrapText = false) => {
      const cell: any = { v, t: typeof v === "number" ? "n" : "s" };
      if (wrapText) cell.s = { alignment: { wrapText: true, vertical: "center" } };
      ws[XLSX.utils.encode_cell({ r, c })] = cell;
    };

    // 헤더 행 (row 0)
    setCell(0, 0, "시간");
    for (let ct = 0; ct < courtCount; ct++) {
      const col = 1 + ct * 4;
      setCell(0, col, `${ct + 1}코트`);
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 3 } });
    }

    // 시간 슬롯별 4행 블록
    timeEntries.forEach(([timeMs, timeStr], slotIdx) => {
      const br = 1 + slotIdx * 4; // 슬롯 기준 행 (0-indexed)

      // 시간 칸: 4행 병합
      setCell(br, 0, timeStr);
      merges.push({ s: { r: br, c: 0 }, e: { r: br + 3, c: 0 } });

      for (let ct = 0; ct < courtCount; ct++) {
        const bc = 1 + ct * 4; // 코트 기준 열
        const match = matchGrid.get(`${timeMs}_${ct + 1}`);
        if (!match) continue;

        const ev = eventMap.get(match.tournamentEventId);
        const evName = ev ? `${ev.eventType} ${ev.skillLevel}` : `종목#${match.tournamentEventId}`;
        let phaseLabel: string;
        if (match.phase === "qualifying") {
          phaseLabel = "예선";
        } else {
          const totalRounds = eventTotalRoundsMap.get(match.tournamentEventId) ?? 1;
          phaseLabel = `본선 - ${getRoundName(match.roundNumber, totalRounds, match.matchNumber)}`;
        }
        const t1 = matchLabel(match, 1);
        const t2 = matchLabel(match, 2);

        // 종목행 (row 0 of slot): 4열 병합
        setCell(br, bc, `${evName} (${phaseLabel})`);
        merges.push({ s: { r: br, c: bc }, e: { r: br, c: bc + 3 } });

        // 팀행 (rows 1-2 of slot): 팀1(2행 병합) | 스코어1 | 스코어2 | 팀2(2행 병합)
        setCell(br + 1, bc, t1, true);
        merges.push({ s: { r: br + 1, c: bc }, e: { r: br + 2, c: bc } });
        setCell(br + 1, bc + 3, t2, true);
        merges.push({ s: { r: br + 1, c: bc + 3 }, e: { r: br + 2, c: bc + 3 } });

        // 완료된 경기는 스코어 표시, 아니면 빈 칸(현장 기록용)
        if (match.status === "completed" && match.team1Score !== null && match.team2Score !== null) {
          setCell(br + 1, bc + 1, match.team1Score);
          setCell(br + 1, bc + 2, match.team2Score);
        }
        // row 3 of slot: 구분 빈행
      }
    });

    const totalRows = 1 + timeEntries.length * 4;
    const totalCols = 1 + courtCount * 4;
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows - 1, c: totalCols - 1 } });
    ws["!merges"] = merges;

    const colWidths: { wch: number }[] = [{ wch: 8 }];
    for (let ct = 0; ct < courtCount; ct++) {
      colWidths.push({ wch: 20 }, { wch: 6 }, { wch: 6 }, { wch: 20 });
    }
    ws["!cols"] = colWidths;

    const rowHeights: { hpt: number }[] = [{ hpt: 20 }];
    for (let s = 0; s < timeEntries.length; s++) {
      rowHeights.push({ hpt: 20 }, { hpt: 28 }, { hpt: 28 }, { hpt: 8 });
    }
    ws["!rows"] = rowHeights;

    XLSX.utils.book_append_sheet(wb, ws, date);
  }

  // ── Sheet 2: 예선 조별 경기 ───────────────────────────
  const qualRows: (string | number)[][] = [];
  const qualMatches = allMatches.filter(m => m.phase === "qualifying");

  // 종목별, 조별로 그루핑
  const eventIds = [...new Set(qualMatches.map(m => m.tournamentEventId))];
  for (const evId of eventIds) {
    const ev = eventMap.get(evId);
    const evName = ev ? `${ev.eventType} ${ev.skillLevel}` : `종목#${evId}`;
    qualRows.push([`【${evName}】`]);
    qualRows.push(["조", "경기번호", "팀1", "팀2", "시작시간", "코트"]);

    const evGroups = groups.filter(g => g.tournamentEventId === evId).sort((a, b) => a.groupNumber - b.groupNumber);
    for (const grp of evGroups) {
      const grpMatches = qualMatches.filter(m => m.groupId === grp.id).sort((a, b) => a.matchNumber - b.matchNumber);
      grpMatches.forEach((m, idx) => {
        const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
        const timeStr = dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "-";
        qualRows.push([`${grp.groupNumber}조`, idx + 1, matchLabel(m, 1), matchLabel(m, 2), timeStr, m.courtNumber ?? "-"]);
      });
    }
    qualRows.push([]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(qualRows);
  ws2["!cols"] = [{ wch: 8 }, { wch: 8 }, { wch: 24 }, { wch: 24 }, { wch: 8 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws2, "예선 조별 경기");

  // ── Sheet 3: 본선 대진표 ──────────────────────────────
  const mainRows: (string | number)[][] = [];
  const mainMatches = allMatches.filter(m => m.phase === "main");

  for (const evId of [...new Set(mainMatches.map(m => m.tournamentEventId))]) {
    const ev = eventMap.get(evId);
    const evName = ev ? `${ev.eventType} ${ev.skillLevel}` : `종목#${evId}`;
    const evSettings = settingsMap.get(evId);
    const evGroups = groups.filter(g => g.tournamentEventId === evId);
    const numAdvancing = evGroups.length * (evSettings?.advanceCount ?? 1);
    const totalRounds = Math.ceil(Math.log2(nextPowerOf2(Math.max(numAdvancing, 1))));

    const evMatches = mainMatches.filter(m => m.tournamentEventId === evId)
      .sort((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber);

    const roundNums = [...new Set(evMatches.map(m => m.roundNumber))].sort((a, b) => a - b);
    for (const rn of roundNums) {
      const roundMatches = evMatches.filter(m => m.roundNumber === rn);
      const rName = getRoundName(rn, totalRounds, roundMatches[0].matchNumber);
      mainRows.push([`【${evName} 본선 - ${rName}】`]);
      mainRows.push(["경기번호", "팀1", "팀2", "시작시간", "코트"]);
      for (const m of roundMatches) {
        const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
        const timeStr = dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "-";
        const matchNum = m.matchNumber === 0 ? "-" : m.matchNumber;
        mainRows.push([matchNum, matchLabel(m, 1), matchLabel(m, 2), timeStr, m.courtNumber ?? "-"]);
      }
      mainRows.push([]);
    }
  }

  const ws3 = XLSX.utils.aoa_to_sheet(mainRows);
  ws3["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 24 }, { wch: 8 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws3, "본선 대진표");

  return {
    buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true }) as Buffer,
    tournamentName: tournament.name,
  };
}

// ─── Generate Logic (shared by generate & regenerate) ────

async function runGenerateBracket(tournamentId: number): Promise<{ success: boolean }> {
  const allSettings = await bdb.getBracketSettings(tournamentId);
  if (allSettings.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "대진 설정이 없습니다" });

  const existingGroups = await bdb.getBracketGroups(tournamentId);
  if (existingGroups.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "대진이 이미 생성되어 있습니다. '대진 재생성' 버튼을 사용해주세요." });
  }

  const courtSettingsList = await bdb.getBracketCourtSettings(tournamentId);
  const courtMap = new Map(courtSettingsList.map(cs => [cs.matchDate ?? "", cs]));

  const allSchedulable: { matchId: number; eventOrder: number; matchDate: string; tournamentEventId: number; team1Phones: string[]; team2Phones: string[] }[] = [];

  for (const settings of allSettings.sort((a, b) => a.eventOrder - b.eventOrder)) {
    const eventId = settings.tournamentEventId;
    const matchDate = settings.matchDate ?? "";

    const allRegs = await db.getRegistrationsByTournament(tournamentId);
    const eligible = allRegs.filter(r => r.tournamentEventId === eventId && r.status === "confirmed" && r.paymentStatus === "paid");

    if (eligible.length < 2) continue;

    const teamPlayerMap = new Map<number, { phone: string; birthDate: string; affiliation: string }[]>();
    for (const reg of eligible) {
      const ps = await db.getPlayersByRegistration(reg.id);
      teamPlayerMap.set(reg.id, ps.map(p => ({ phone: p.phone.replace(/\D/g, ""), birthDate: p.birthDate, affiliation: p.affiliation })));
    }

    const { numGroups, groupSizes } = calculateGroupSizes(eligible.length);
    const teamsForAssign = eligible.map(r => ({
      registrationId: r.id,
      affiliations: [...new Set((teamPlayerMap.get(r.id) ?? []).map(p => p.affiliation).filter(Boolean))],
    }));
    const groupAssignments = assignTeamsToGroups(teamsForAssign, numGroups, groupSizes);

    const groupIds: number[] = [];
    for (let g = 0; g < numGroups; g++) {
      const gid = await bdb.createBracketGroup({ tournamentId, tournamentEventId: eventId, groupNumber: g + 1 });
      groupIds.push(gid);
      for (const regId of groupAssignments[g]) {
        await bdb.createBracketGroupTeam({ groupId: gid, registrationId: regId });
      }
    }

    const ageMap = new Map<number, number>();
    for (const reg of eligible) {
      const ps = teamPlayerMap.get(reg.id) ?? [];
      const yearSum = ps.reduce((s, p) => s + (p.birthDate ? parseInt(p.birthDate.slice(0, 4)) : 2000), 0);
      ageMap.set(reg.id, yearSum);
    }

    let qualMatchNum = 1;
    for (let g = 0; g < numGroups; g++) {
      const teams = groupAssignments[g];
      const pairs = getGroupMatchPairs(teams.length);
      for (const [i, j] of pairs) {
        const matchId = await bdb.createBracketMatch({
          tournamentId,
          tournamentEventId: eventId,
          phase: "qualifying",
          roundNumber: 1,
          matchNumber: qualMatchNum++,
          groupId: groupIds[g],
          team1Id: teams[i],
          team2Id: teams[j],
        });
        const t1Phones = (teamPlayerMap.get(teams[i]) ?? []).map(p => p.phone);
        const t2Phones = (teamPlayerMap.get(teams[j]) ?? []).map(p => p.phone);
        allSchedulable.push({ matchId, eventOrder: settings.eventOrder, matchDate, tournamentEventId: eventId, team1Phones: t1Phones, team2Phones: t2Phones });
      }
    }

    const slots = buildBracketSlots(numGroups, settings.advanceCount, settings.hasThirdPlace);
    const mainMatchIds: number[] = [];

    for (const slot of slots) {
      const id = await bdb.createBracketMatch({
        tournamentId,
        tournamentEventId: eventId,
        phase: "main",
        roundNumber: slot.roundNumber,
        matchNumber: slot.matchNumber,
        isBye: slot.isBye,
        team1SourceType: slot.seed1?.type === "team" ? "group_rank" : undefined,
        team1SourceGroupId: slot.seed1?.type === "team" ? groupIds[(slot.seed1.groupNumber - 1)] : undefined,
        team1SourceRank: slot.seed1?.type === "team" ? slot.seed1.rank : undefined,
        team2SourceType: slot.seed2?.type === "team" ? "group_rank" : undefined,
        team2SourceGroupId: slot.seed2?.type === "team" ? groupIds[(slot.seed2.groupNumber - 1)] : undefined,
        team2SourceRank: slot.seed2?.type === "team" ? slot.seed2.rank : undefined,
      });
      mainMatchIds.push(id);
    }

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const updates: Record<string, unknown> = {};
      if (slot.nextMatchIndex !== null && slot.nextMatchIndex < mainMatchIds.length) {
        updates.nextMatchId = mainMatchIds[slot.nextMatchIndex];
        updates.nextMatchPosition = slot.nextMatchPosition;
      }
      if (slot.loserNextMatchIndex !== null && slot.loserNextMatchIndex < mainMatchIds.length) {
        updates.loserNextMatchId = mainMatchIds[slot.loserNextMatchIndex];
        updates.loserNextMatchPosition = slot.loserNextMatchPosition;
      }
      if (Object.keys(updates).length > 0) {
        await bdb.updateBracketMatch(mainMatchIds[i], updates as any);
      }
    }
  }

  // ── 스케줄링: 모든 예선 함께(코트 가득) → 종목별 예선 완료 직후 본선 시작 ──────
  // 날짜별 그룹핑
  const dateGroups = new Map<string, typeof allSchedulable>();
  for (const m of allSchedulable) {
    if (!dateGroups.has(m.matchDate)) dateGroups.set(m.matchDate, []);
    dateGroups.get(m.matchDate)!.push(m);
  }

  for (const [date, qualMatches] of dateGroups) {
    const cs = courtMap.get(date);
    if (!cs) continue;

    // 1. 모든 예선을 날짜 단위로 함께 스케줄링 → 코트를 최대한 채움
    const { results: qualResults } = computeSchedule(qualMatches, cs, date);

    // 점유 슬롯 추적 (본선과 코트 중복 방지) + 종목별 예선 마지막 슬롯
    const occupiedSlotCourts = new Set<string>();
    const eventQualEndSlot = new Map<number, number>(); // eventId → last qual slotIndex

    for (const sr of qualResults) {
      occupiedSlotCourts.add(`${sr.slotIndex}_${sr.courtNumber}`);
      await bdb.updateBracketMatch(sr.matchId, { courtNumber: sr.courtNumber, scheduledAt: sr.scheduledAt });
      const qm = qualMatches.find((m: typeof qualMatches[0]) => m.matchId === sr.matchId)!;
      const prev = eventQualEndSlot.get(qm.tournamentEventId) ?? -1;
      eventQualEndSlot.set(qm.tournamentEventId, Math.max(prev, sr.slotIndex));
    }

    // 2. 이 날짜의 모든 본선 경기 수집 (라운드별)
    const allMainItems: { matchId: number; eventId: number; eventOrder: number; roundNumber: number }[] = [];
    for (const settings of allSettings
      .filter(s => (s.matchDate ?? "") === date)
      .sort((a, b) => a.eventOrder - b.eventOrder)) {
      const eventId = settings.tournamentEventId;
      const mains = (await bdb.getBracketMatches(tournamentId, eventId))
        .filter(m => m.phase === "main" && !m.isBye);
      for (const m of mains) {
        allMainItems.push({ matchId: m.id, eventId, eventOrder: settings.eventOrder, roundNumber: m.roundNumber });
      }
    }
    if (allMainItems.length === 0) continue;

    // 3. 라운드 레벨별로 모든 종목 본선을 함께 스케줄링
    //    - Round 1: minSlot = 해당 종목 예선 마지막 슬롯 + 1
    //    - Round N: minSlot = 해당 종목 이전 라운드 마지막 슬롯 + 1
    //    → 다른 종목의 예선/본선과 빈 코트를 공유하며 효율적으로 채움
    const allRoundLevels = [...new Set(allMainItems.map(m => m.roundNumber))].sort((a, b) => a - b);
    const eventRoundEndSlot = new Map<string, number>(); // `${eventId}_${round}` → last slotIndex

    for (const round of allRoundLevels) {
      const roundItems = allMainItems.filter(m => m.roundNumber === round);
      const prevRoundLevel = allRoundLevels[allRoundLevels.indexOf(round) - 1];

      const roundSchedulable: SchedulableMatch[] = roundItems.map(item => {
        const minSlot = prevRoundLevel === undefined
          ? (eventQualEndSlot.get(item.eventId) ?? -1) + 1          // Round 1: 예선 직후
          : (eventRoundEndSlot.get(`${item.eventId}_${prevRoundLevel}`) ?? -1) + 1; // Round N: 이전 라운드 직후
        return { matchId: item.matchId, eventOrder: item.eventOrder, team1Phones: [], team2Phones: [], minSlot };
      });

      const startSlot = Math.min(...roundSchedulable.map(m => m.minSlot ?? 0));
      const { results: roundResults } = computeSchedule(roundSchedulable, cs, date, startSlot, occupiedSlotCourts);

      for (const sr of roundResults) {
        occupiedSlotCourts.add(`${sr.slotIndex}_${sr.courtNumber}`);
        const item = roundItems.find(r => r.matchId === sr.matchId)!;
        const key = `${item.eventId}_${round}`;
        eventRoundEndSlot.set(key, Math.max(eventRoundEndSlot.get(key) ?? 0, sr.slotIndex));
        await bdb.updateBracketMatch(sr.matchId, { courtNumber: sr.courtNumber, scheduledAt: sr.scheduledAt });
      }
    }
  }

  for (const settings of allSettings) {
    await bdb.updateBracketSettingsStatus(settings.tournamentEventId, "qualifying");
  }
  return { success: true };
}

// ─── Bracket Router ───────────────────────────────────────

export const bracketRouter = router({

  // ── 설정 조회/저장 ──────────────────────────────────

  getSettings: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      return bdb.getBracketSettings(input.tournamentId);
    }),

  saveSettings: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      settings: z.array(z.object({
        tournamentEventId: z.number(),
        qualifyingScore: z.number().default(15),
        mainScore: z.number().default(15),
        deuceEnabled: z.boolean().default(true),
        deuceMaxScore: z.number().default(17),
        advanceCount: z.number().min(1).max(2).default(1),
        hasThirdPlace: z.boolean().default(false),
        eventOrder: z.number().default(0),
        matchDate: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      // 이벤트가 해당 대회 소속인지 검증
      const events = await db.getEventsByTournament(input.tournamentId);
      const validEventIds = new Set(events.map(e => e.id));
      for (const s of input.settings) {
        if (!validEventIds.has(s.tournamentEventId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이벤트가 해당 대회에 속하지 않습니다" });
        }
      }
      for (const s of input.settings) {
        await bdb.upsertBracketSettings({
          tournamentId: input.tournamentId,
          tournamentEventId: s.tournamentEventId,
          qualifyingScore: s.qualifyingScore,
          mainScore: s.mainScore,
          deuceEnabled: s.deuceEnabled,
          deuceMaxScore: s.deuceMaxScore,
          advanceCount: s.advanceCount,
          hasThirdPlace: s.hasThirdPlace,
          eventOrder: s.eventOrder,
          matchDate: s.matchDate ?? null,
        });
      }
      return { success: true };
    }),

  getCourtSettings: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      return bdb.getBracketCourtSettings(input.tournamentId);
    }),

  saveCourtSettings: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      courtSettings: z.array(z.object({
        matchDate: z.string(),
        courtCount: z.number().min(1),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        estimatedMinutes: z.number().min(1),
        targetEndTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      for (const cs of input.courtSettings) {
        await bdb.upsertBracketCourtSettings({
          tournamentId: input.tournamentId,
          matchDate: cs.matchDate,
          courtCount: cs.courtCount,
          startTime: cs.startTime,
          estimatedMinutes: cs.estimatedMinutes,
          targetEndTime: cs.targetEndTime,
        });
      }
      return { success: true };
    }),

  // ── 대진 생성 ────────────────────────────────────────

  generate: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      return runGenerateBracket(input.tournamentId);
    }),

  regenerate: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      await bdb.deleteBracketData(input.tournamentId);
      return runGenerateBracket(input.tournamentId);
    }),

  // ── 조회 ─────────────────────────────────────────────

  getGroups: protectedProcedure
    .input(z.object({ tournamentId: z.number(), tournamentEventId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      const groups = await bdb.getBracketGroups(input.tournamentId, input.tournamentEventId);
      const groupIds = groups.map(g => g.id);
      const allTeams = groupIds.length > 0 ? await bdb.getBracketGroupTeamsByGroupIds(groupIds) : [];

      // 팀명 조회
      const regIds = [...new Set(allTeams.map(t => t.registrationId))];
      const teamNameMap = new Map<number, string>();
      for (const regId of regIds) {
        const ps = await db.getPlayersByRegistration(regId);
        if (ps.length === 0) { teamNameMap.set(regId, `팀#${regId}`); continue; }
        const names = ps.map(p => p.name).join(", ");
        const affiliations = ps.map(p => (p.affiliation ?? "").trim()).filter(Boolean);
        const uniqueAffs = [...new Set(affiliations)];
        const affLabel = uniqueAffs.length > 0 ? uniqueAffs.join(" & ") : "";
        teamNameMap.set(regId, affLabel ? `${affLabel} (${names})` : names);
      }

      return groups.map(g => ({
        ...g,
        teams: allTeams.filter(t => t.groupId === g.id).map(t => ({
          ...t,
          teamName: teamNameMap.get(t.registrationId) ?? `팀#${t.registrationId}`,
        })),
      }));
    }),

  getGroupStandings: protectedProcedure
    .input(z.object({ tournamentId: z.number(), tournamentEventId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      const groups = await bdb.getBracketGroups(input.tournamentId, input.tournamentEventId);
      const groupIds = groups.map(g => g.id);
      const allTeams = groupIds.length > 0 ? await bdb.getBracketGroupTeamsByGroupIds(groupIds) : [];
      const allMatches = await bdb.getBracketMatches(input.tournamentId, input.tournamentEventId);
      const qualMatches = allMatches.filter(m => m.phase === "qualifying");

      const result = [];
      for (const grp of groups) {
        const grpTeams = allTeams.filter(t => t.groupId === grp.id).map(t => t.registrationId);
        const grpMatches = qualMatches.filter(m => m.groupId === grp.id);

        // 나이 합 계산
        const ageMap = new Map<number, number>();
        for (const regId of grpTeams) {
          const ps = await db.getPlayersByRegistration(regId);
          const yearSum = ps.reduce((s, p) => s + (p.birthDate ? parseInt(p.birthDate.slice(0, 4)) : 2000), 0);
          ageMap.set(regId, yearSum);
        }

        const standings = computeStandings(grpTeams, grpMatches, ageMap);
        result.push({
          groupId: grp.id,
          groupNumber: grp.groupNumber,
          standings: standings.map((s, idx) => ({ ...s, rank: idx + 1 })),
        });
      }
      return result;
    }),

  getMainBracket: protectedProcedure
    .input(z.object({ tournamentId: z.number(), tournamentEventId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      const allMatches = await bdb.getBracketMatches(input.tournamentId, input.tournamentEventId);
      const mainMatches = allMatches.filter(m => m.phase === "main");
      if (mainMatches.length === 0) return [];

      // 그룹 정보 (groupId → groupNumber)
      const groups = await bdb.getBracketGroups(input.tournamentId, input.tournamentEventId);
      const groupMap = new Map(groups.map(g => [g.id, g.groupNumber]));

      // 팀명 조회
      const teamIds = [...new Set(mainMatches.flatMap(m => [m.team1Id, m.team2Id]).filter((id): id is number => id !== null))];
      const teamNameMap = new Map<number, string>();
      for (const regId of teamIds) {
        const ps = await db.getPlayersByRegistration(regId);
        if (ps.length === 0) { teamNameMap.set(regId, `팀#${regId}`); continue; }
        const names = ps.map(p => p.name).join(", ");
        const uniqueAffs = [...new Set(ps.map(p => (p.affiliation ?? "").trim()).filter(Boolean))];
        const affLabel = uniqueAffs.join(" & ");
        teamNameMap.set(regId, affLabel ? `${affLabel} (${names})` : names);
      }

      // totalRounds: 3·4위전(matchNumber=0) 제외한 최대 라운드
      const mainOnly = mainMatches.filter(m => m.matchNumber !== 0);
      const totalRounds = mainOnly.length > 0 ? Math.max(...mainOnly.map(m => m.roundNumber)) : 1;

      function roundName(roundNumber: number, matchNumber: number): string {
        if (matchNumber === 0) return "3·4위전";
        if (roundNumber === totalRounds) return "결승";
        const remaining = totalRounds - roundNumber;
        if (remaining === 1) return "준결승";
        return `${Math.pow(2, remaining + 1)}강`;
      }

      // nextMatchId + nextMatchPosition 역방향 매핑: `matchId_pos` → 해당 포지션에 올 소스 경기 id
      const reverseMap = new Map<string, number>();
      for (const m of mainMatches) {
        if (m.nextMatchId && m.nextMatchPosition) {
          reverseMap.set(`${m.nextMatchId}_${m.nextMatchPosition}`, m.id);
        }
      }

      function teamLabel(
        matchId: number,
        position: 1 | 2,
        teamId: number | null,
        sourceType: string | null | undefined,
        sourceGroupId: number | null | undefined,
        sourceRank: number | null | undefined,
        isBye: boolean
      ): string {
        if (teamId) return teamNameMap.get(teamId) ?? `팀#${teamId}`;
        // 1라운드: group_rank 소스
        if (sourceType === "group_rank" && sourceGroupId && sourceRank) {
          const gNum = groupMap.get(sourceGroupId);
          return gNum != null ? `${gNum}조 ${sourceRank}위` : "미정";
        }
        // 부전승 슬롯
        if (isBye && !sourceType) return "부전승";
        // 2라운드 이상: 역방향 매핑으로 소스 경기 찾기
        const srcMatchId = reverseMap.get(`${matchId}_${position}`);
        if (srcMatchId != null) {
          const src = mainMatches.find(m => m.id === srcMatchId);
          if (src) return `${roundName(src.roundNumber, src.matchNumber)} 승리팀`;
        }
        return "미정";
      }

      return mainMatches.map(m => ({
        ...m,
        roundName: roundName(m.roundNumber, m.matchNumber),
        team1Label: teamLabel(m.id, 1, m.team1Id, m.team1SourceType, m.team1SourceGroupId, m.team1SourceRank, m.isBye ?? false),
        team2Label: teamLabel(m.id, 2, m.team2Id, m.team2SourceType, m.team2SourceGroupId, m.team2SourceRank, m.isBye ?? false),
      }));
    }),

  getSchedule: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      const matches = await bdb.getBracketMatches(input.tournamentId);
      const scheduled = matches
        .filter(m => m.scheduledAt)
        .sort((a, b) => {
          const tA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const tB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return tA !== tB ? tA - tB : (a.courtNumber ?? 0) - (b.courtNumber ?? 0);
        });

      // 팀명 조회
      const regIds = [...new Set(scheduled.flatMap(m => [m.team1Id, m.team2Id]).filter((id): id is number => id !== null))];
      const teamNameMap = new Map<number, string>();
      for (const regId of regIds) {
        const ps = await db.getPlayersByRegistration(regId);
        if (ps.length === 0) { teamNameMap.set(regId, `팀#${regId}`); continue; }
        const names = ps.map(p => p.name).join(", ");
        const uniqueAffs = [...new Set(ps.map(p => (p.affiliation ?? "").trim()).filter(Boolean))];
        teamNameMap.set(regId, uniqueAffs.length > 0 ? `${uniqueAffs.join(" & ")} (${names})` : names);
      }

      // 종목 정보
      const events = await db.getEventsByTournament(input.tournamentId);
      const eventMap = new Map(events.map(e => [e.id, e]));

      return scheduled.map(m => {
        const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
        const ev = eventMap.get(m.tournamentEventId);
        return {
          ...m,
          dateStr: dt ? dt.toISOString().slice(0, 10) : null,
          timeStr: dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : null,
          eventName: ev ? `${ev.eventType} ${ev.skillLevel}` : `종목#${m.tournamentEventId}`,
          team1Name: m.team1Id ? (teamNameMap.get(m.team1Id) ?? `팀#${m.team1Id}`) : "미정",
          team2Name: m.team2Id ? (teamNameMap.get(m.team2Id) ?? `팀#${m.team2Id}`) : "미정",
          phaseLabel: m.phase === "qualifying" ? "예선" : "본선",
        };
      });
    }),

  getGroupMatches: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const group = await bdb.getBracketGroupById(input.groupId);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      await verifyBracketAccess(ctx.user!, group.tournamentId);
      const matches = await bdb.getBracketMatchesByGroupId(input.groupId);
      const regIds = [...new Set(matches.flatMap(m => [m.team1Id, m.team2Id]).filter((id): id is number => id !== null))];
      const teamNameMap = new Map<number, string>();
      for (const regId of regIds) {
        const ps = await db.getPlayersByRegistration(regId);
        if (ps.length === 0) { teamNameMap.set(regId, `팀#${regId}`); continue; }
        const uniqueAffs = [...new Set(ps.map(p => (p.affiliation ?? "").trim()).filter(Boolean))];
        teamNameMap.set(regId, uniqueAffs.length > 0 ? uniqueAffs.join(" & ") : ps.map(p => p.name).join(", "));
      }
      return matches.map((m, idx) => {
        const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
        const isCompleted = m.status === "completed" && m.team1Score !== null && m.team2Score !== null;
        const team1Wins = isCompleted && m.team1Score! > m.team2Score!;
        const team2Wins = isCompleted && m.team2Score! > m.team1Score!;
        return {
          ...m,
          matchNum: idx + 1,
          team1Name: m.team1Id ? (teamNameMap.get(m.team1Id) ?? `팀#${m.team1Id}`) : "미정",
          team2Name: m.team2Id ? (teamNameMap.get(m.team2Id) ?? `팀#${m.team2Id}`) : "미정",
          team1Result: team1Wins ? "승" : isCompleted ? "패" : null,
          team2Result: team2Wins ? "승" : isCompleted ? "패" : null,
          timeStr: dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : null,
        };
      });
    }),

  // ── 경기 결과 입력 ────────────────────────────────────

  updateMatchResult: protectedProcedure
    .input(z.object({
      matchId: z.number(),
      team1Score: z.number().min(0),
      team2Score: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const match = await bdb.getBracketMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "경기를 찾을 수 없습니다" });
      await verifyBracketAccess(ctx.user!, match.tournamentId);

      if (!match.team1Id || !match.team2Id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "양 팀이 모두 확정된 후 결과를 입력할 수 있습니다" });
      }

      if (input.team1Score === input.team2Score) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "동점은 유효한 결과가 아닙니다. 점수를 다시 확인해주세요." });
      }

      // 설정된 목표점수 및 듀스 규칙으로 점수 유효성 검사
      const eventSettings = await bdb.getBracketSettingsByEvent(match.tournamentEventId);
      if (eventSettings) {
        const targetScore = match.phase === "qualifying"
          ? (eventSettings.qualifyingScore ?? 15)
          : (eventSettings.mainScore ?? 15);
        const deuceEnabled = eventSettings.deuceEnabled ?? true;
        const deuceMaxScore = eventSettings.deuceMaxScore ?? 17;
        if (!isValidFinalScore(input.team1Score, input.team2Score, targetScore, deuceEnabled, deuceMaxScore)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `유효하지 않은 점수입니다. 목표 점수: ${targetScore}${deuceEnabled ? `, 듀스 최대: ${deuceMaxScore}` : ""}`,
          });
        }
      }

      const winnerId = input.team1Score > input.team2Score ? match.team1Id : match.team2Id;
      const loserId = input.team1Score > input.team2Score ? match.team2Id : match.team1Id;

      await bdb.updateBracketMatch(input.matchId, {
        team1Score: input.team1Score,
        team2Score: input.team2Score,
        winnerId: winnerId ?? undefined,
        status: "completed",
      });

      // 본선 경기 결과 → 다음 라운드 자동 진출
      if (match.phase === "main" && match.nextMatchId && winnerId) {
        const pos = match.nextMatchPosition as 1 | 2;
        if (pos === 1) await bdb.updateBracketMatch(match.nextMatchId, { team1Id: winnerId });
        else await bdb.updateBracketMatch(match.nextMatchId, { team2Id: winnerId });
      }

      // 3·4위전 패자 진출
      if (match.phase === "main" && match.loserNextMatchId && loserId) {
        const lpos = match.loserNextMatchPosition as 1 | 2;
        if (lpos === 1) await bdb.updateBracketMatch(match.loserNextMatchId, { team1Id: loserId });
        else await bdb.updateBracketMatch(match.loserNextMatchId, { team2Id: loserId });
      }

      // 예선 조 완료 확인 → 예선 완료 시 본선 진출 팀 세팅
      if (match.phase === "qualifying" && match.groupId) {
        await tryAdvanceGroupToMain(match.groupId, match.tournamentId, match.tournamentEventId);
      }

      return { success: true };
    }),

  // ── 수동 조정 ────────────────────────────────────────

  moveTeam: protectedProcedure
    .input(z.object({
      registrationId: z.number(),
      fromGroupId: z.number(),
      toGroupId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fromGroup = await bdb.getBracketGroupById(input.fromGroupId);
      if (!fromGroup) throw new TRPCError({ code: "NOT_FOUND", message: "조를 찾을 수 없습니다" });
      await verifyBracketAccess(ctx.user!, fromGroup.tournamentId);

      const toGroup = await bdb.getBracketGroupById(input.toGroupId);
      if (!toGroup || toGroup.tournamentId !== fromGroup.tournamentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "대상 조가 같은 대회에 속하지 않습니다" });
      }

      const fromTeams = await bdb.getBracketGroupTeams(input.fromGroupId);
      const target = fromTeams.find(t => t.registrationId === input.registrationId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "해당 조에 팀이 없습니다" });

      const db2 = await (await import("./db")).getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { bracketGroupTeams: bgt } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db2.update(bgt).set({ groupId: input.toGroupId, finalRank: null }).where(eq(bgt.id, target.id));

      // 예선 경기 데이터 동기화: 영향받은 두 조의 경기 삭제 후 재생성
      await bdb.deleteBracketMatchesByGroupId(input.fromGroupId);
      await bdb.deleteBracketMatchesByGroupId(input.toGroupId);
      await recreateQualifyingMatchesForGroup(input.fromGroupId, fromGroup.tournamentId, fromGroup.tournamentEventId);
      await recreateQualifyingMatchesForGroup(input.toGroupId, toGroup.tournamentId, toGroup.tournamentEventId);

      return { success: true };
    }),

  swapTeams: protectedProcedure
    .input(z.object({
      registrationId1: z.number(),
      registrationId2: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db2 = await (await import("./db")).getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { bracketGroupTeams: bgt } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db2.select().from(bgt)
        .where(eq(bgt.registrationId, input.registrationId1)).limit(1);
      const rows2 = await db2.select().from(bgt)
        .where(eq(bgt.registrationId, input.registrationId2)).limit(1);

      if (!rows[0] || !rows2[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const group1 = await bdb.getBracketGroupById(rows[0].groupId);
      if (!group1) throw new TRPCError({ code: "NOT_FOUND" });
      await verifyBracketAccess(ctx.user!, group1.tournamentId);

      const group2 = await bdb.getBracketGroupById(rows2[0].groupId);
      if (!group2 || group2.tournamentId !== group1.tournamentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "두 팀이 같은 대회에 속하지 않습니다" });
      }

      const g1 = rows[0].groupId;
      const g2 = rows2[0].groupId;
      await db2.update(bgt).set({ groupId: g2, finalRank: null }).where(eq(bgt.id, rows[0].id));
      await db2.update(bgt).set({ groupId: g1, finalRank: null }).where(eq(bgt.id, rows2[0].id));

      // 예선 경기 데이터 동기화: 영향받은 두 조의 경기 삭제 후 재생성
      if (g1 !== g2) {
        await bdb.deleteBracketMatchesByGroupId(g1);
        await bdb.deleteBracketMatchesByGroupId(g2);
        await recreateQualifyingMatchesForGroup(g1, group1.tournamentId, group1.tournamentEventId);
        await recreateQualifyingMatchesForGroup(g2, group2.tournamentId, group2.tournamentEventId);
      }

      return { success: true };
    }),

  // ── 대진표 공개 조회 (public) ─────────────────────────

  getPublicBracket: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const tournament = await db.getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["bracket_published", "in_progress"].includes(tournament.status ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "대진표가 공개되지 않은 대회입니다" });
      }

      const allSettings = await bdb.getBracketSettings(input.tournamentId);
      const allGroups = await bdb.getBracketGroups(input.tournamentId);
      const groupIds = allGroups.map(g => g.id);
      const allGroupTeams = groupIds.length > 0 ? await bdb.getBracketGroupTeamsByGroupIds(groupIds) : [];
      const allMatches = await bdb.getBracketMatches(input.tournamentId);
      const events = await db.getEventsByTournament(input.tournamentId);

      // 팀명(소속명) 조회
      const regIds = [...new Set(allGroupTeams.map(t => t.registrationId))];
      const teamNameMap = new Map<number, string>();
      for (const regId of regIds) {
        const ps = await db.getPlayersByRegistration(regId);
        if (ps.length === 0) { teamNameMap.set(regId, `팀#${regId}`); continue; }
        const uniqueAffs = [...new Set(ps.map(p => (p.affiliation ?? "").trim()).filter(Boolean))];
        teamNameMap.set(regId, uniqueAffs.length > 0 ? uniqueAffs.join(" & ") : ps.map(p => p.name).join(", "));
      }

      // 날짜 목록
      const dates = [...new Set(allSettings.map(s => s.matchDate).filter(Boolean))].sort() as string[];

      // 코트별 경기 순번 계산 (slotOrder 우선, 없으면 scheduledAt)
      const courtGameNumMap = buildCourtGameNumMap(allMatches);

      // 종목 정보
      const eventList = events.map(e => ({
        id: e.id,
        label: `${e.eventType} ${e.skillLevel}`,
        matchDate: allSettings.find(s => s.tournamentEventId === e.id)?.matchDate ?? null,
      }));

      // 조별 데이터 (예선 조별리그 표 포함)
      const groups = allGroups.map(grp => {
        const teamRows = allGroupTeams.filter(t => t.groupId === grp.id);
        const grpMatches = allMatches.filter(m => m.groupId === grp.id && m.phase === "qualifying");

        // 팀별 stats 계산
        const statsMap = new Map<number, { wins: number; losses: number; ptsFor: number; ptsAgainst: number }>();
        for (const t of teamRows) statsMap.set(t.registrationId, { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 });
        for (const m of grpMatches) {
          if (m.status !== "completed" || !m.team1Id || !m.team2Id || m.team1Score === null || m.team2Score === null) continue;
          const s1 = statsMap.get(m.team1Id); const s2 = statsMap.get(m.team2Id);
          if (s1) { s1.ptsFor += m.team1Score; s1.ptsAgainst += m.team2Score; if (m.team1Score > m.team2Score) s1.wins++; else s1.losses++; }
          if (s2) { s2.ptsFor += m.team2Score; s2.ptsAgainst += m.team1Score; if (m.team2Score > m.team1Score) s2.wins++; else s2.losses++; }
        }

        // pair grid: regId1_regId2 → { s1, s2 } (행 기준으로 row팀이 s1)
        const pairGrid: Record<string, { s1: number; s2: number } | null> = {};
        for (const t1 of teamRows) {
          for (const t2 of teamRows) {
            if (t1.registrationId === t2.registrationId) continue;
            const key = `${t1.registrationId}_${t2.registrationId}`;
            const m = grpMatches.find(m =>
              (m.team1Id === t1.registrationId && m.team2Id === t2.registrationId) ||
              (m.team1Id === t2.registrationId && m.team2Id === t1.registrationId)
            );
            if (!m || m.status !== "completed" || m.team1Score === null || m.team2Score === null) { pairGrid[key] = null; continue; }
            pairGrid[key] = m.team1Id === t1.registrationId
              ? { s1: m.team1Score, s2: m.team2Score }
              : { s1: m.team2Score, s2: m.team1Score };
          }
        }

        const teams = teamRows
          .sort((a, b) => (a.finalRank ?? 999) - (b.finalRank ?? 999))
          .map(t => {
            const stats = statsMap.get(t.registrationId) ?? { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 };
            return {
              registrationId: t.registrationId,
              teamName: teamNameMap.get(t.registrationId) ?? `팀#${t.registrationId}`,
              ...stats,
              finalRank: t.finalRank,
            };
          });

        const matches = grpMatches
          .sort((a, b) => {
            // 코트별 경기 순번 기준으로 정렬
            const aNum = courtGameNumMap.get(a.id) ?? 9999;
            const bNum = courtGameNumMap.get(b.id) ?? 9999;
            if (a.courtNumber !== b.courtNumber) return (a.courtNumber ?? 0) - (b.courtNumber ?? 0);
            return aNum - bNum;
          })
          .map((m) => {
            const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
            const isCompleted = m.status === "completed" && m.team1Score !== null && m.team2Score !== null;
            return {
              id: m.id,
              courtNumber: m.courtNumber,
              courtGameNum: courtGameNumMap.get(m.id) ?? null,
              timeStr: dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : null,
              team1Id: m.team1Id, team2Id: m.team2Id,
              team1Name: m.team1Id ? (teamNameMap.get(m.team1Id) ?? "미정") : "미정",
              team2Name: m.team2Id ? (teamNameMap.get(m.team2Id) ?? "미정") : "미정",
              team1Score: m.team1Score, team2Score: m.team2Score,
              team1Result: isCompleted ? (m.team1Score! > m.team2Score! ? "승" : "패") : null,
              team2Result: isCompleted ? (m.team2Score! > m.team1Score! ? "승" : "패") : null,
              status: m.status,
            };
          });

        return { id: grp.id, tournamentEventId: grp.tournamentEventId, groupNumber: grp.groupNumber, teams, matches, pairGrid };
      });

      // 본선 데이터 (이벤트별)
      const mainMatches = allMatches.filter(m => m.phase === "main");
      const settingsMap = new Map(allSettings.map(s => [s.tournamentEventId, s]));
      const groupsMap = new Map(allGroups.map(g => [g.id, g]));

      function mainTeamLabel(m: typeof mainMatches[0], pos: 1 | 2): string {
        const teamId = pos === 1 ? m.team1Id : m.team2Id;
        if (teamId) return teamNameMap.get(teamId) ?? `팀#${teamId}`;
        const srcType = pos === 1 ? m.team1SourceType : m.team2SourceType;
        const srcGroupId = pos === 1 ? m.team1SourceGroupId : m.team2SourceGroupId;
        const srcRank = pos === 1 ? m.team1SourceRank : m.team2SourceRank;
        const srcMatchId = pos === 1 ? m.team1SourceMatchId : m.team2SourceMatchId;
        if (srcType === "group_rank" && srcGroupId && srcRank) {
          const grp = groupsMap.get(srcGroupId);
          return grp ? `${grp.groupNumber}조 ${srcRank}위` : "미정";
        }
        if (srcType === "match_winner" && srcMatchId) {
          const src = mainMatches.find(x => x.id === srcMatchId);
          if (src) {
            const ev = settingsMap.get(src.tournamentEventId);
            const evGroups = allGroups.filter(g => g.tournamentEventId === src.tournamentEventId);
            const totalRounds = ev ? Math.ceil(Math.log2(nextPowerOf2(Math.max(evGroups.length * (ev.advanceCount ?? 1), 1)))) : 1;
            return `${getRoundName(src.roundNumber, totalRounds, src.matchNumber)} ${src.matchNumber}경기 승자`;
          }
        }
        // source 정보가 없는 쪽이 실제 부전승 슬롯
        return m.isBye ? "부전승" : "미정";
      }

      const mainByEvent = events.map(e => {
        const evGroups = allGroups.filter(g => g.tournamentEventId === e.id);
        const ev = settingsMap.get(e.id);
        const totalRounds = ev ? Math.ceil(Math.log2(nextPowerOf2(Math.max(evGroups.length * (ev.advanceCount ?? 1), 1)))) : 1;
        const sorted = mainMatches
          .filter(m => m.tournamentEventId === e.id)
          .sort((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber);
        const evMatches = sorted.map(m => {
            const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
            const isCompleted = m.status === "completed" && m.team1Score !== null && m.team2Score !== null;
            const isBye = m.isBye ?? false;
            return {
              id: m.id, roundNumber: m.roundNumber, matchNumber: m.matchNumber,
              roundName: getRoundName(m.roundNumber, totalRounds, m.matchNumber),
              isBye,
              courtNumber: m.courtNumber,
              courtGameNum: isBye ? null : (courtGameNumMap.get(m.id) ?? null),
              timeStr: dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : null,
              team1Label: mainTeamLabel(m, 1), team2Label: mainTeamLabel(m, 2),
              team1Score: m.team1Score, team2Score: m.team2Score,
              team1Result: isCompleted ? (m.team1Score! > m.team2Score! ? "승" : "패") : null,
              team2Result: isCompleted ? (m.team2Score! > m.team1Score! ? "승" : "패") : null,
              status: m.status,
            };
          });
        return { eventId: e.id, matches: evMatches };
      });

      return { dates, events: eventList, groups, mainByEvent, tournamentName: tournament.name };
    }),

  // ── 심판 PIN 확인 (public) ────────────────────────────

  // ── 심판 경기 상세 조회 (public) ─────────────────────────

  getRefereeMatchDetail: publicProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ input }) => {
      const match = await bdb.getBracketMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      const tournament = await db.getTournamentById(match.tournamentId);
      if (!tournament || tournament.status !== "in_progress")
        throw new TRPCError({ code: "FORBIDDEN" });

      const allGroups = await bdb.getBracketGroups(match.tournamentId);
      const groupsMap = new Map(allGroups.map(g => [g.id, g]));
      const allSettings = await bdb.getBracketSettings(match.tournamentId);
      const settingsMap = new Map(allSettings.map(s => [s.tournamentEventId, s]));

      async function teamPlayers(regId: number | null) {
        if (!regId) return [];
        const ps = await db.getPlayersByRegistration(regId);
        return ps.map(p => ({
          name: p.name,
          affiliation: p.affiliation,
          birthDate: p.birthDate,
          phone: p.phone,
        }));
      }

      function sourceLabel(pos: 1 | 2): string {
        const teamId = pos === 1 ? match.team1Id : match.team2Id;
        if (teamId) return "";
        const srcType = pos === 1 ? match.team1SourceType : match.team2SourceType;
        const srcGroupId = pos === 1 ? match.team1SourceGroupId : match.team2SourceGroupId;
        const srcRank = pos === 1 ? match.team1SourceRank : match.team2SourceRank;
        if (srcType === "group_rank" && srcGroupId && srcRank) {
          const grp = groupsMap.get(srcGroupId);
          return grp ? `${grp.groupNumber}조 ${srcRank}위` : "미정";
        }
        return "미정";
      }

      const [team1Players, team2Players] = await Promise.all([
        teamPlayers(match.team1Id),
        teamPlayers(match.team2Id),
      ]);

      const ev = (await db.getEventsByTournament(match.tournamentId)).find(e => e.id === match.tournamentEventId);
      const evSettings = settingsMap.get(match.tournamentEventId);
      const targetScore = match.phase === "qualifying"
        ? (evSettings?.qualifyingScore ?? 21)
        : (evSettings?.mainScore ?? 21);
      const deuceEnabled = evSettings?.deuceEnabled ?? false;
      const maxScore = evSettings?.deuceMaxScore ?? 25;

      const dt = match.scheduledAt ? new Date(match.scheduledAt) : null;
      return {
        id: match.id,
        tournamentId: match.tournamentId,
        phase: match.phase,
        evLabel: ev ? `${ev.eventType} ${ev.skillLevel}` : "종목",
        courtNumber: match.courtNumber,
        timeStr: dt ? `${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}` : null,
        status: match.status,
        team1Id: match.team1Id, team2Id: match.team2Id,
        team1SourceLabel: sourceLabel(1), team2SourceLabel: sourceLabel(2),
        team1Players, team2Players,
        team1Score: match.team1Score, team2Score: match.team2Score,
        team1Result: match.status === "completed" && match.team1Score != null && match.team2Score != null
          ? (match.team1Score > match.team2Score ? "승" : "패") : null,
        team2Result: match.status === "completed" && match.team1Score != null && match.team2Score != null
          ? (match.team2Score > match.team1Score ? "승" : "패") : null,
        targetScore, deuceEnabled, maxScore,
      };
    }),

  // ── 심판 점수 입력 (public, PIN 검증) ────────────────────

  refereeUpdateMatchResult: publicProcedure
    .input(z.object({
      matchId: z.number(),
      pin: z.string(),
      team1Score: z.number().min(0),
      team2Score: z.number().min(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const match = await bdb.getBracketMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      const tournament = await db.getTournamentById(match.tournamentId);
      if (!tournament?.refereePin || tournament.refereePin !== input.pin)
        throw new TRPCError({ code: "FORBIDDEN", message: "PIN이 올바르지 않습니다" });
      if (!match.team1Id || !match.team2Id)
        throw new TRPCError({ code: "BAD_REQUEST", message: "양 팀이 확정된 후 결과를 입력할 수 있습니다" });
      if (input.team1Score === input.team2Score)
        throw new TRPCError({ code: "BAD_REQUEST", message: "동점은 유효하지 않습니다" });

      // 점수 유효성 검증
      const allSettings = await bdb.getBracketSettings(match.tournamentId);
      const evSettings = allSettings.find(s => s.tournamentEventId === match.tournamentEventId);
      const targetScore = match.phase === "qualifying"
        ? (evSettings?.qualifyingScore ?? 21)
        : (evSettings?.mainScore ?? 21);
      const deuceEnabled = evSettings?.deuceEnabled ?? false;
      const deuceMaxScore = evSettings?.deuceMaxScore ?? 25;
      if (!isValidFinalScore(input.team1Score, input.team2Score, targetScore, deuceEnabled, deuceMaxScore)) {
        const phaseStr = match.phase === "qualifying" ? "예선" : "본선";
        const deuceStr = deuceEnabled ? ` (듀스 최대 ${deuceMaxScore}점)` : " (듀스 없음)";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `유효하지 않은 점수입니다. ${phaseStr} 목표점수는 ${targetScore}점${deuceStr}입니다`,
        });
      }

      const winner = input.team1Score > input.team2Score ? match.team1Id : match.team2Id;
      const loser = input.team1Score > input.team2Score ? match.team2Id : match.team1Id;
      await bdb.updateBracketMatch(input.matchId, {
        team1Score: input.team1Score, team2Score: input.team2Score, status: "completed",
        refereeUserId: ctx.user?.id ?? undefined,
      });

      // 본선 승자 다음 경기 배정
      if (match.phase === "main") {
        if (match.nextMatchId && winner)
          await bdb.advanceTeamToNextMatch(match.nextMatchId, match.id, winner);
        if (match.loserNextMatchId && loser)
          await bdb.advanceTeamToNextMatch(match.loserNextMatchId, match.id, loser);
      }
      // 예선 완료 처리
      if (match.phase === "qualifying" && match.groupId)
        await tryAdvanceGroupToMain(match.groupId, match.tournamentId, match.tournamentEventId);

      return { success: true };
    }),

  // ── 관리자 경기 결과 수정 (보호된 절차, 상위 라운드 완료 여부 검증) ──
  adminUpdateMatchResult: protectedProcedure
    .input(z.object({
      matchId: z.number(),
      team1Score: z.number().min(0),
      team2Score: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const match = await bdb.getBracketMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      await verifyBracketAccess(ctx.user!, match.tournamentId);

      if (input.team1Score === input.team2Score)
        throw new TRPCError({ code: "BAD_REQUEST", message: "동점은 유효하지 않습니다" });

      const allMatches = await bdb.getBracketMatches(match.tournamentId);

      // 부전승 경기를 넘어서 실제 완료된 경기가 있는지 확인
      function isEffectivelyCompleted(matchId: number, visited = new Set<number>()): boolean {
        if (visited.has(matchId)) return false;
        visited.add(matchId);
        const m = allMatches.find(x => x.id === matchId);
        if (!m) return false;
        if (m.isBye) return m.nextMatchId ? isEffectivelyCompleted(m.nextMatchId, visited) : false;
        return m.status === "completed";
      }

      // 변경 가능 여부 검증
      if (match.phase === "qualifying" && match.groupId) {
        const dependentMains = allMatches.filter(m =>
          m.phase === "main" &&
          (m.team1SourceGroupId === match.groupId || m.team2SourceGroupId === match.groupId)
        );
        for (const dm of dependentMains) {
          if (isEffectivelyCompleted(dm.id)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "이 예선 경기를 통해 진출한 팀이 이미 상위 라운드 경기를 완료했습니다. 결과를 변경할 수 없습니다.",
            });
          }
        }
      } else if (match.phase === "main") {
        if (match.nextMatchId && isEffectivelyCompleted(match.nextMatchId))
          throw new TRPCError({ code: "BAD_REQUEST", message: "이 경기의 승자가 이미 상위 라운드 경기를 완료했습니다. 결과를 변경할 수 없습니다." });
        if (match.loserNextMatchId && isEffectivelyCompleted(match.loserNextMatchId))
          throw new TRPCError({ code: "BAD_REQUEST", message: "이 경기의 패자가 이미 상위 라운드 경기를 완료했습니다. 결과를 변경할 수 없습니다." });
      }

      const newWinnerId = input.team1Score > input.team2Score ? match.team1Id : match.team2Id;
      const newLoserId = input.team1Score > input.team2Score ? match.team2Id : match.team1Id;
      const oldWinnerId = match.winnerId;

      // 점수 업데이트
      await bdb.updateBracketMatch(input.matchId, {
        team1Score: input.team1Score,
        team2Score: input.team2Score,
        winnerId: newWinnerId ?? undefined,
        status: "completed",
      });

      // 예선: 조 진출 재계산
      if (match.phase === "qualifying" && match.groupId) {
        const groupMainMatches = allMatches.filter(m =>
          m.phase === "main" &&
          (m.team1SourceGroupId === match.groupId || m.team2SourceGroupId === match.groupId)
        );
        for (const mm of groupMainMatches) {
          const clears: any = {};
          if (mm.team1SourceGroupId === match.groupId) clears.team1Id = null;
          if (mm.team2SourceGroupId === match.groupId) clears.team2Id = null;
          if (mm.isBye) {
            clears.winnerId = null;
            clears.status = "scheduled";
            if (mm.nextMatchId && mm.nextMatchPosition) {
              const nextSlot = mm.nextMatchPosition === 1 ? { team1Id: null } : { team2Id: null };
              await bdb.updateBracketMatch(mm.nextMatchId, nextSlot as any);
            }
          }
          if (Object.keys(clears).length > 0) await bdb.updateBracketMatch(mm.id, clears);
        }
        await tryAdvanceGroupToMain(match.groupId, match.tournamentId, match.tournamentEventId);
      } else if (match.phase === "main" && newWinnerId !== oldWinnerId) {
        // 본선: 승자/패자 다음 경기 슬롯 갱신
        if (match.nextMatchId && newWinnerId) {
          const nextMatch = allMatches.find(m => m.id === match.nextMatchId);
          if (nextMatch && nextMatch.status !== "completed") {
            const pos = match.nextMatchPosition as 1 | 2;
            await bdb.updateBracketMatch(match.nextMatchId, pos === 1 ? { team1Id: newWinnerId } : { team2Id: newWinnerId });
          }
        }
        if (match.loserNextMatchId && newLoserId) {
          const loserNext = allMatches.find(m => m.id === match.loserNextMatchId);
          if (loserNext && loserNext.status !== "completed") {
            const lpos = match.loserNextMatchPosition as 1 | 2;
            await bdb.updateBracketMatch(match.loserNextMatchId, lpos === 1 ? { team1Id: newLoserId } : { team2Id: newLoserId });
          }
        }
      }

      return { success: true };
    }),

  checkRefereePin: publicProcedure
    .input(z.object({ tournamentId: z.number(), pin: z.string() }))
    .mutation(async ({ input }) => {
      const tournament = await db.getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      if (!tournament.refereePin) throw new TRPCError({ code: "FORBIDDEN", message: "심판 PIN이 설정되지 않은 대회입니다" });
      if (tournament.refereePin !== input.pin) throw new TRPCError({ code: "FORBIDDEN", message: "PIN이 올바르지 않습니다" });
      return { success: true };
    }),

  // ── 경기 배정 이동 (코트 변경 또는 같은 코트 내 위치 변경) ─────
  moveMatchToCourt: protectedProcedure
    .input(z.object({
      matchId: z.number(),
      targetCourtNumber: z.number().min(1),
      targetSlotOrder: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const match = await bdb.getBracketMatchById(input.matchId);
      if (!match || match.courtNumber == null) throw new TRPCError({ code: "NOT_FOUND" });
      await verifyBracketAccess(ctx.user!, match.tournamentId);

      const allMatches = await bdb.getBracketMatches(match.tournamentId);

      // slotOrder 미설정 시 scheduledAt 기준으로 초기화
      const hasSlotOrder = allMatches.some(m => m.slotOrder != null && m.courtNumber != null && !m.isBye);
      if (!hasSlotOrder) {
        const toInit = allMatches
          .filter(m => m.courtNumber != null && !m.isBye && m.scheduledAt != null)
          .sort((a, b) => a.courtNumber! - b.courtNumber! || new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
        const counter = new Map<number, number>();
        for (const m of toInit) {
          const n = (counter.get(m.courtNumber!) ?? 0) + 1;
          counter.set(m.courtNumber!, n);
          await bdb.updateBracketMatch(m.id, { slotOrder: n });
          if (m.id === match.id) (match as any).slotOrder = n;
        }
        // Refresh allMatches
        const refreshed = await bdb.getBracketMatches(match.tournamentId);
        allMatches.length = 0;
        refreshed.forEach(m => allMatches.push(m));
      }

      const sourceCourt = match.courtNumber;
      const targetCourt = input.targetCourtNumber;
      const targetPos = input.targetSlotOrder;

      // 소스 코트 매치 (M 제외, slotOrder 순)
      const sourceList = allMatches
        .filter(m => m.courtNumber === sourceCourt && !m.isBye && m.id !== match.id && m.slotOrder != null)
        .sort((a, b) => a.slotOrder! - b.slotOrder!);

      if (sourceCourt === targetCourt) {
        // 같은 코트 내 위치 변경
        const clampedPos = Math.min(targetPos, sourceList.length + 1);
        sourceList.splice(clampedPos - 1, 0, match as any);
        for (let i = 0; i < sourceList.length; i++) {
          const newSlot = i + 1;
          if (sourceList[i].slotOrder !== newSlot)
            await bdb.updateBracketMatch(sourceList[i].id, { slotOrder: newSlot });
        }
      } else {
        // 소스 코트 재번호 부여
        for (let i = 0; i < sourceList.length; i++) {
          const newSlot = i + 1;
          if (sourceList[i].slotOrder !== newSlot)
            await bdb.updateBracketMatch(sourceList[i].id, { slotOrder: newSlot });
        }
        // 타겟 코트에 삽입
        const targetList = allMatches
          .filter(m => m.courtNumber === targetCourt && !m.isBye && m.slotOrder != null)
          .sort((a, b) => a.slotOrder! - b.slotOrder!);
        const clampedPos = Math.min(targetPos, targetList.length + 1);
        targetList.splice(clampedPos - 1, 0, match as any);
        for (let i = 0; i < targetList.length; i++) {
          const newSlot = i + 1;
          const updates: any = { slotOrder: newSlot };
          if (targetList[i].id === match.id) updates.courtNumber = targetCourt;
          if (targetList[i].slotOrder !== newSlot || (targetList[i].id === match.id && targetList[i].courtNumber !== targetCourt))
            await bdb.updateBracketMatch(targetList[i].id, updates);
        }
      }
      return { success: true };
    }),

  // ── 같은 코트 내 두 경기 순번 교체 ─────────────────────────
  swapMatchOrder: protectedProcedure
    .input(z.object({ matchId1: z.number(), matchId2: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [m1, m2] = await Promise.all([
        bdb.getBracketMatchById(input.matchId1),
        bdb.getBracketMatchById(input.matchId2),
      ]);
      if (!m1 || !m2) throw new TRPCError({ code: "NOT_FOUND" });
      if (m1.courtNumber !== m2.courtNumber)
        throw new TRPCError({ code: "BAD_REQUEST", message: "같은 코트 내의 경기만 순번을 교체할 수 있습니다" });
      await verifyBracketAccess(ctx.user!, m1.tournamentId);

      const allMatches = await bdb.getBracketMatches(m1.tournamentId);
      const hasSlotOrder = allMatches.some(m => m.slotOrder != null);
      if (!hasSlotOrder) {
        const toInit = allMatches
          .filter(m => m.courtNumber != null && !m.isBye && m.scheduledAt != null)
          .sort((a, b) => a.courtNumber! - b.courtNumber! || new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
        const counter = new Map<number, number>();
        for (const m of toInit) {
          const n = (counter.get(m.courtNumber!) ?? 0) + 1;
          counter.set(m.courtNumber!, n);
          await bdb.updateBracketMatch(m.id, { slotOrder: n });
        }
        const refreshed = await bdb.getBracketMatches(m1.tournamentId);
        const r1 = refreshed.find(m => m.id === m1.id)!;
        const r2 = refreshed.find(m => m.id === m2.id)!;
        await bdb.updateBracketMatch(m1.id, { slotOrder: r2.slotOrder! });
        await bdb.updateBracketMatch(m2.id, { slotOrder: r1.slotOrder! });
      } else {
        const s1 = m1.slotOrder ?? 0;
        const s2 = m2.slotOrder ?? 0;
        await bdb.updateBracketMatch(m1.id, { slotOrder: s2 });
        await bdb.updateBracketMatch(m2.id, { slotOrder: s1 });
      }
      return { success: true };
    }),

  // ── 심판 화면: 코트별 게임 목록 (public) ─────────────────

  getRefereeData: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const tournament = await db.getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      if (tournament.status !== "in_progress")
        throw new TRPCError({ code: "FORBIDDEN", message: "대회 진행중 상태가 아닙니다" });

      const allMatches = await bdb.getBracketMatches(input.tournamentId);
      const allGroups = await bdb.getBracketGroups(input.tournamentId);
      const allGroupTeams = allGroups.length > 0
        ? await bdb.getBracketGroupTeamsByGroupIds(allGroups.map(g => g.id))
        : [];
      const events = await db.getEventsByTournament(input.tournamentId);
      const eventMap = new Map(events.map(e => [e.id, e]));
      const groupsMap = new Map(allGroups.map(g => [g.id, g]));

      // 팀명 조회
      const regIds = [...new Set(allGroupTeams.map(t => t.registrationId))];
      const teamNameMap = new Map<number, string>();
      for (const regId of regIds) {
        const ps = await db.getPlayersByRegistration(regId);
        if (ps.length === 0) { teamNameMap.set(regId, `팀#${regId}`); continue; }
        const uniqueAffs = [...new Set(ps.map(p => (p.affiliation ?? "").trim()).filter(Boolean))];
        teamNameMap.set(regId, uniqueAffs.length > 0 ? uniqueAffs.join(" & ") : ps.map(p => p.name).join(", "));
      }

      function teamLabel(m: typeof allMatches[0], pos: 1 | 2): string {
        const teamId = pos === 1 ? m.team1Id : m.team2Id;
        if (teamId) return teamNameMap.get(teamId) ?? `팀#${teamId}`;
        const srcType = pos === 1 ? m.team1SourceType : m.team2SourceType;
        const srcGroupId = pos === 1 ? m.team1SourceGroupId : m.team2SourceGroupId;
        const srcRank = pos === 1 ? m.team1SourceRank : m.team2SourceRank;
        if (srcType === "group_rank" && srcGroupId && srcRank) {
          const grp = groupsMap.get(srcGroupId);
          return grp ? `${grp.groupNumber}조 ${srcRank}위` : "미정";
        }
        return m.isBye ? "부전승" : "미정";
      }

      // 코트별 경기 순번 계산 (slotOrder 우선, 없으면 scheduledAt)
      const courtGameNumMap = buildCourtGameNumMap(allMatches);

      // 코트 목록 및 날짜 목록 (scheduledAt 기준)
      const scheduledWithTime = allMatches.filter(m => m.scheduledAt != null && m.courtNumber != null && !m.isBye);
      const courts = [...new Set(scheduledWithTime.map(m => m.courtNumber!))].sort((a, b) => a - b);
      const dateSet = new Set<string>();
      for (const m of scheduledWithTime) {
        const dt = new Date(m.scheduledAt!);
        dateSet.add(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`);
      }
      const dates = [...dateSet].sort();

      // 전체 경기 목록
      const matches = scheduledWithTime.map(m => {
        const dt = new Date(m.scheduledAt!);
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
        const timeStr = `${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
        const ev = eventMap.get(m.tournamentEventId);
        const evLabel = ev ? `${ev.eventType} ${ev.skillLevel}` : `종목#${m.tournamentEventId}`;
        const isCompleted = m.status === "completed" && m.team1Score !== null && m.team2Score !== null;
        return {
          id: m.id,
          date: dateStr,
          courtNumber: m.courtNumber!,
          courtGameNum: courtGameNumMap.get(m.id)!,
          timeStr,
          phase: m.phase,
          evLabel,
          team1Name: teamLabel(m, 1),
          team2Name: teamLabel(m, 2),
          team1Score: m.team1Score,
          team2Score: m.team2Score,
          team1Result: isCompleted ? (m.team1Score! > m.team2Score! ? "승" : "패") : null,
          team2Result: isCompleted ? (m.team2Score! > m.team1Score! ? "승" : "패") : null,
          status: m.status,
        };
      });

      return { tournamentName: tournament.name, courts, dates, matches };
    }),

});

// ─── 조 예선 경기 재생성 ──────────────────────────────────

async function recreateQualifyingMatchesForGroup(
  groupId: number,
  tournamentId: number,
  tournamentEventId: number
): Promise<void> {
  const teams = await bdb.getBracketGroupTeams(groupId);
  const teamIds = teams.map(t => t.registrationId);
  if (teamIds.length < 2) return;
  const pairs = getGroupMatchPairs(teamIds.length);
  for (let m = 0; m < pairs.length; m++) {
    const [i, j] = pairs[m];
    await bdb.createBracketMatch({
      tournamentId,
      tournamentEventId,
      phase: "qualifying",
      roundNumber: 1,
      matchNumber: m + 1,
      groupId,
      team1Id: teamIds[i],
      team2Id: teamIds[j],
    });
  }
}

// ─── 예선 완료 → 본선 진출 처리 ─────────────────────────

async function tryAdvanceGroupToMain(groupId: number, tournamentId: number, tournamentEventId: number) {
  const groupTeams = await bdb.getBracketGroupTeams(groupId);
  const groupMatches = (await bdb.getBracketMatches(tournamentId, tournamentEventId))
    .filter(m => m.phase === "qualifying" && m.groupId === groupId);

  const totalMatches = groupMatches.length;
  const completedMatches = groupMatches.filter(m => m.status === "completed").length;
  if (completedMatches < totalMatches) return; // 조 경기 미완료

  // 나이 합 계산
  const ageMap = new Map<number, number>();
  for (const gt of groupTeams) {
    const ps = await db.getPlayersByRegistration(gt.registrationId);
    const yearSum = ps.reduce((s, p) => s + (p.birthDate ? parseInt(p.birthDate.slice(0, 4)) : 2000), 0);
    ageMap.set(gt.registrationId, yearSum);
  }

  const teamIds = groupTeams.map(t => t.registrationId);
  const standings = computeStandings(teamIds, groupMatches, ageMap);

  // finalRank 저장
  for (let i = 0; i < standings.length; i++) {
    const gt = groupTeams.find(t => t.registrationId === standings[i].registrationId);
    if (gt) await bdb.updateGroupTeamRank(gt.id, i + 1);
  }

  // 본선 대진에 진출 팀 세팅
  const settings = await bdb.getBracketSettingsByEvent(tournamentEventId);
  const advanceCount = settings?.advanceCount ?? 1;
  const mainMatches = (await bdb.getBracketMatches(tournamentId, tournamentEventId))
    .filter(m => m.phase === "main");

  for (let rank = 1; rank <= advanceCount; rank++) {
    const advancingTeam = standings[rank - 1];
    if (!advancingTeam) continue;

    // 이 팀이 들어가야 하는 본선 경기 찾기 (group_rank source 기준)
    for (const mm of mainMatches) {
      if (mm.team1SourceType === "group_rank" && mm.team1SourceGroupId === groupId && mm.team1SourceRank === rank) {
        await bdb.updateBracketMatch(mm.id, { team1Id: advancingTeam.registrationId });
        if (mm.isBye) {
          await bdb.updateBracketMatch(mm.id, { winnerId: advancingTeam.registrationId, status: "completed" });
          if (mm.nextMatchId && mm.nextMatchPosition) {
            const pos = mm.nextMatchPosition as 1 | 2;
            if (pos === 1) await bdb.updateBracketMatch(mm.nextMatchId, { team1Id: advancingTeam.registrationId });
            else await bdb.updateBracketMatch(mm.nextMatchId, { team2Id: advancingTeam.registrationId });
          }
        }
      }
      if (mm.team2SourceType === "group_rank" && mm.team2SourceGroupId === groupId && mm.team2SourceRank === rank) {
        await bdb.updateBracketMatch(mm.id, { team2Id: advancingTeam.registrationId });
      }
    }
  }
}
