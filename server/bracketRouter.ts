import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as bdb from "./bracketDb";
import * as XLSX from "xlsx";

// ─── Permission Helper ───────────────────────────────────

export async function verifyBracketAccess(user: { id: number; role: string }, tournamentId: number) {
  if (user.role === "admin" || user.role === "super_admin") return;
  const isOrganizer = await db.isTournamentOrganizer(tournamentId, user.id);
  if (!isOrganizer) throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
}

// ─── Pure Helper Functions ───────────────────────────────

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
  const firstRoundCount = bracketSize / 2;
  adjustBracketForAffiliation(slots, firstRoundCount);

  return slots;
}

/** 같은 조 출신 팀이 같은 하프에 있거나 1라운드에서 직접 대결하지 않도록 조정 */
function adjustBracketForAffiliation(slots: BracketSlot[], firstRoundCount: number) {
  const half = firstRoundCount / 2;

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
}

interface ScheduleResult {
  matchId: number;
  courtNumber: number;
  scheduledAt: Date;
}

function computeSchedule(
  matches: SchedulableMatch[],
  courtSetting: { courtCount: number; startTime: string; estimatedMinutes: number },
  matchDate: string,
  startSlotOffset = 0
): { results: ScheduleResult[]; slotsUsed: number } {
  const results: ScheduleResult[] = [];
  const [startHour, startMin] = courtSetting.startTime.split(":").map(Number);
  const [year, month, day] = matchDate.split("-").map(Number);

  const queue = [...matches].sort((a, b) => a.eventOrder - b.eventOrder);
  let slotIndex = startSlotOffset;
  const prevSlotPhones = new Set<string>();

  let safety = 0;
  while (queue.length > 0 && safety++ < 2000) {
    const currentSlotPhones = new Set<string>();
    let courtNum = 1;
    let courtsLeft = courtSetting.courtCount;
    const remaining: SchedulableMatch[] = [];

    for (const match of queue) {
      if (courtsLeft === 0) { remaining.push(match); continue; }
      const allPhones = [...match.team1Phones, ...match.team2Phones];
      const conflict = allPhones.some(p => prevSlotPhones.has(p) || currentSlotPhones.has(p));
      if (!conflict) {
        for (const p of allPhones) currentSlotPhones.add(p);
        const totalMins = startHour * 60 + startMin + slotIndex * courtSetting.estimatedMinutes;
        results.push({
          matchId: match.matchId,
          courtNumber: courtNum++,
          scheduledAt: new Date(year, month - 1, day, Math.floor(totalMins / 60), totalMins % 60),
        });
        courtsLeft--;
      } else {
        remaining.push(match);
      }
    }

    // prevSlot 업데이트 (아무것도 못 잡으면 이전 제약 해제)
    prevSlotPhones.clear();
    for (const p of currentSlotPhones) prevSlotPhones.add(p);

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

export async function generateBracketExcel(tournamentId: number): Promise<Buffer> {
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
  const playersData: Map<number, { name: string; phone: string }[]> = new Map();
  for (const regId of regIds) {
    const ps = await db.getPlayersByRegistration(regId);
    playersData.set(regId, ps.map(p => ({ name: p.name, phone: p.phone })));
  }

  function teamName(regId: number | null): string {
    if (!regId) return "미정";
    const ps = playersData.get(regId);
    if (!ps || ps.length === 0) return `팀#${regId}`;
    return ps.map(p => p.name).join(" / ");
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
    return "미정";
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: 전체 스케줄 ──────────────────────────────
  const scheduleRows: (string | number)[][] = [
    ["번호", "날짜", "시작시간", "코트", "종목", "팀1", "팀2", "단계"],
  ];
  const scheduledMatches = allMatches
    .filter(m => m.scheduledAt)
    .sort((a, b) => {
      const tA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const tB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return tA !== tB ? tA - tB : (a.courtNumber ?? 0) - (b.courtNumber ?? 0);
    });

  scheduledMatches.forEach((m, idx) => {
    const ev = eventMap.get(m.tournamentEventId);
    const eventName = ev ? `${ev.eventType} ${ev.skillLevel}` : `종목#${m.tournamentEventId}`;
    const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
    const dateStr = dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}` : "";
    const timeStr = dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "";
    const phase = m.phase === "qualifying" ? "예선" : "본선";
    scheduleRows.push([idx + 1, dateStr, timeStr, m.courtNumber ?? "", eventName, matchLabel(m, 1), matchLabel(m, 2), phase]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(scheduleRows);
  ws1["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws1, "전체 스케줄");

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
      grpMatches.forEach(m => {
        const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
        const timeStr = dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "-";
        qualRows.push([`${grp.groupNumber}조`, m.matchNumber, matchLabel(m, 1), matchLabel(m, 2), timeStr, m.courtNumber ?? "-"]);
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

    mainRows.push([`【${evName} 본선】`]);
    mainRows.push(["라운드", "경기번호", "팀1", "팀2", "시작시간", "코트"]);

    const evMatches = mainMatches.filter(m => m.tournamentEventId === evId)
      .sort((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber);

    for (const m of evMatches) {
      const dt = m.scheduledAt ? new Date(m.scheduledAt) : null;
      const timeStr = dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "-";
      const roundName = getRoundName(m.roundNumber, totalRounds, m.matchNumber);
      const matchNum = m.matchNumber === 0 ? "-" : m.matchNumber;
      mainRows.push([roundName, matchNum, matchLabel(m, 1), matchLabel(m, 2), timeStr, m.courtNumber ?? "-"]);
    }
    mainRows.push([]);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(mainRows);
  ws3["!cols"] = [{ wch: 14 }, { wch: 8 }, { wch: 24 }, { wch: 24 }, { wch: 8 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws3, "본선 대진표");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
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
        });
      }
      return { success: true };
    }),

  // ── 대진 생성 ────────────────────────────────────────

  generate: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);

      const allSettings = await bdb.getBracketSettings(input.tournamentId);
      if (allSettings.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "대진 설정이 없습니다" });

      const courtSettingsList = await bdb.getBracketCourtSettings(input.tournamentId);
      const courtMap = new Map(courtSettingsList.map(cs => [cs.matchDate ?? "", cs]));

      // 날짜별 스케줄링을 위한 전체 경기 목록
      const allSchedulable: { matchId: number; eventOrder: number; matchDate: string; team1Phones: string[]; team2Phones: string[] }[] = [];

      for (const settings of allSettings.sort((a, b) => a.eventOrder - b.eventOrder)) {
        const eventId = settings.tournamentEventId;
        const matchDate = settings.matchDate ?? "";

        // 1. 확정된 팀 조회 (confirmed + paid)
        const allRegs = await db.getRegistrationsByTournament(input.tournamentId);
        const eligible = allRegs.filter(r => r.tournamentEventId === eventId && r.status === "confirmed" && r.paymentStatus === "paid");

        if (eligible.length < 2) continue;

        // 2. 선수 정보 조회
        const teamPlayerMap = new Map<number, { phone: string; birthDate: string; affiliation: string }[]>();
        for (const reg of eligible) {
          const ps = await db.getPlayersByRegistration(reg.id);
          teamPlayerMap.set(reg.id, ps.map(p => ({ phone: p.phone.replace(/\D/g, ""), birthDate: p.birthDate, affiliation: p.affiliation })));
        }

        // 3. 조 편성
        const { numGroups, groupSizes } = calculateGroupSizes(eligible.length);
        const teamsForAssign = eligible.map(r => ({
          registrationId: r.id,
          affiliations: [...new Set((teamPlayerMap.get(r.id) ?? []).map(p => p.affiliation).filter(Boolean))],
        }));
        const groupAssignments = assignTeamsToGroups(teamsForAssign, numGroups, groupSizes);

        // 4. 조 생성 + 팀 배정 저장
        const groupIds: number[] = [];
        for (let g = 0; g < numGroups; g++) {
          const gid = await bdb.createBracketGroup({ tournamentId: input.tournamentId, tournamentEventId: eventId, groupNumber: g + 1 });
          groupIds.push(gid);
          for (const regId of groupAssignments[g]) {
            await bdb.createBracketGroupTeam({ groupId: gid, registrationId: regId });
          }
        }

        // 나이 합 계산 (birthDate → birthYear sum, 작을수록 고령)
        const ageMap = new Map<number, number>();
        for (const reg of eligible) {
          const ps = teamPlayerMap.get(reg.id) ?? [];
          const yearSum = ps.reduce((s, p) => s + (p.birthDate ? parseInt(p.birthDate.slice(0, 4)) : 2000), 0);
          ageMap.set(reg.id, yearSum);
        }

        // 5. 예선 경기 생성
        let qualMatchNum = 1;
        for (let g = 0; g < numGroups; g++) {
          const teams = groupAssignments[g];
          const pairs = getGroupMatchPairs(teams.length);
          for (const [i, j] of pairs) {
            const matchId = await bdb.createBracketMatch({
              tournamentId: input.tournamentId,
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
            allSchedulable.push({ matchId, eventOrder: settings.eventOrder, matchDate, team1Phones: t1Phones, team2Phones: t2Phones });
          }
        }

        // 6. 본선 대진 구조 생성
        const slots = buildBracketSlots(numGroups, settings.advanceCount, settings.hasThirdPlace);
        const mainMatchIds: number[] = [];

        for (const slot of slots) {
          const id = await bdb.createBracketMatch({
            tournamentId: input.tournamentId,
            tournamentEventId: eventId,
            phase: "main",
            roundNumber: slot.roundNumber,
            matchNumber: slot.matchNumber,
            isBye: slot.isBye,
            // 시드에서 소스 정보 설정
            team1SourceType: slot.seed1?.type === "team" ? "group_rank" : undefined,
            team1SourceGroupId: slot.seed1?.type === "team" ? groupIds[(slot.seed1.groupNumber - 1)] : undefined,
            team1SourceRank: slot.seed1?.type === "team" ? slot.seed1.rank : undefined,
            team2SourceType: slot.seed2?.type === "team" ? "group_rank" : undefined,
            team2SourceGroupId: slot.seed2?.type === "team" ? groupIds[(slot.seed2.groupNumber - 1)] : undefined,
            team2SourceRank: slot.seed2?.type === "team" ? slot.seed2.rank : undefined,
          });
          mainMatchIds.push(id);
        }

        // 7. 본선 경기 간 nextMatchId 링크 설정
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

        // 부전승 처리: team1 또는 team2가 bye인 경우 winner 자동 설정
        for (let i = 0; i < slots.length; i++) {
          if (slots[i].isBye) {
            const nonByeSeed = slots[i].seed1?.type === "bye" ? slots[i].seed2 : slots[i].seed1;
            // winner는 예선 완료 후에 실제 팀 ID로 설정됨 - 여기서는 isBye 플래그만
          }
        }

        // 본선 스케줄은 예선 완료 후 별도 처리 (현재는 예상 시간 없음)
      }

      // 8. 날짜별 예선 스케줄링
      const dateGroups = new Map<string, typeof allSchedulable>();
      for (const m of allSchedulable) {
        if (!dateGroups.has(m.matchDate)) dateGroups.set(m.matchDate, []);
        dateGroups.get(m.matchDate)!.push(m);
      }

      const dateSlotsUsed = new Map<string, number>();
      for (const [date, matches] of dateGroups) {
        const cs = courtMap.get(date);
        if (!cs) continue;
        const { results: schedResults, slotsUsed } = computeSchedule(matches, cs, date);
        dateSlotsUsed.set(date, slotsUsed);
        for (const sr of schedResults) {
          await bdb.updateBracketMatch(sr.matchId, { courtNumber: sr.courtNumber, scheduledAt: sr.scheduledAt });
        }
      }

      // 9. 날짜별 본선 스케줄링 (예선 종료 이후 슬롯부터, 라운드 순서대로)
      const dateCurrentOffset = new Map(dateSlotsUsed);
      for (const settings of allSettings) {
        const eventId = settings.tournamentEventId;
        const matchDate = settings.matchDate ?? "";
        const cs = courtMap.get(matchDate);
        if (!cs) continue;
        const mainMatches = (await bdb.getBracketMatches(input.tournamentId, eventId))
          .filter(m => m.phase === "main" && !m.isBye);
        if (mainMatches.length === 0) continue;

        // 라운드별로 그룹화하여 순서대로 배정 (준결승이 결승보다 먼저)
        const roundsMap = new Map<number, typeof mainMatches>();
        for (const m of mainMatches) {
          if (!roundsMap.has(m.roundNumber)) roundsMap.set(m.roundNumber, []);
          roundsMap.get(m.roundNumber)!.push(m);
        }
        const sortedRounds = [...roundsMap.keys()].sort((a, b) => a - b);

        let currentOffset = dateCurrentOffset.get(matchDate) ?? 0;
        for (const round of sortedRounds) {
          const roundSchedulable: SchedulableMatch[] = roundsMap.get(round)!.map(m => ({
            matchId: m.id,
            eventOrder: settings.eventOrder,
            team1Phones: [],
            team2Phones: [],
          }));
          const { results: roundResults, slotsUsed } = computeSchedule(roundSchedulable, cs, matchDate, currentOffset);
          currentOffset = slotsUsed;
          for (const sr of roundResults) {
            await bdb.updateBracketMatch(sr.matchId, { courtNumber: sr.courtNumber, scheduledAt: sr.scheduledAt });
          }
        }
        dateCurrentOffset.set(matchDate, currentOffset);
      }

      // 모든 생성된 종목의 status 업데이트
      for (const settings of allSettings) {
        await bdb.updateBracketSettingsStatus(settings.tournamentEventId, "qualifying");
      }
      return { success: true };
    }),

  regenerate: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      await bdb.deleteBracketData(input.tournamentId);
      // settings와 courtSettings는 유지
      return { success: true, message: "기존 대진이 삭제되었습니다. 다시 생성해주세요." };
    }),

  // ── 조회 ─────────────────────────────────────────────

  getGroups: protectedProcedure
    .input(z.object({ tournamentId: z.number(), tournamentEventId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      const groups = await bdb.getBracketGroups(input.tournamentId, input.tournamentEventId);
      const groupIds = groups.map(g => g.id);
      const allTeams = groupIds.length > 0 ? await bdb.getBracketGroupTeamsByGroupIds(groupIds) : [];
      return groups.map(g => ({
        ...g,
        teams: allTeams.filter(t => t.groupId === g.id),
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
      const matches = await bdb.getBracketMatches(input.tournamentId, input.tournamentEventId);
      return matches.filter(m => m.phase === "main");
    }),

  getSchedule: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyBracketAccess(ctx.user!, input.tournamentId);
      const matches = await bdb.getBracketMatches(input.tournamentId);
      return matches
        .filter(m => m.scheduledAt)
        .sort((a, b) => {
          const tA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const tB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return tA !== tB ? tA - tB : (a.courtNumber ?? 0) - (b.courtNumber ?? 0);
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
