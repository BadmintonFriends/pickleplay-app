import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  tournaments, InsertTournament, Tournament,
  tournamentEvents, InsertTournamentEvent,
  tournamentAgeGroups, InsertTournamentAgeGroup,
  tournamentPosters, InsertTournamentPoster,
  tournamentDocuments, InsertTournamentDocument,
  registrations, InsertRegistration,
  players, InsertPlayer,
  kprRatings, InsertKprRating,
  matchResults,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) { values.lastSignedIn = new Date(); }
    if (Object.keys(updateSet).length === 0) { updateSet.lastSignedIn = new Date(); }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "organizer" | "admin" | "super_admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; gender?: "male" | "female"; birthDate?: string }) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.gender !== undefined) updateSet.gender = data.gender;
  if (data.birthDate !== undefined) updateSet.birthDate = data.birthDate;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet).where(eq(users.id, userId));
}

// ─── Tournaments ─────────────────────────────────────────
export async function createTournament(data: InsertTournament) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournaments).values(data);
  return result[0].insertId;
}

export async function getTournamentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllTournaments() {
  const db = await getDb();
  if (!db) return [];
  const allTournaments = await db.select().from(tournaments).orderBy(desc(tournaments.startDate));
  // Attach first poster image for each tournament
  const allPosters = await db.select().from(tournamentPosters).orderBy(tournamentPosters.sortOrder);
  const posterMap = new Map<number, string>();
  for (const p of allPosters) {
    if (!posterMap.has(p.tournamentId)) {
      posterMap.set(p.tournamentId, p.imageUrl);
    }
  }
  return allTournaments.map(t => ({
    ...t,
    posterUrl: posterMap.get(t.id) ?? null,
  }));
}

export async function updateTournament(id: number, data: Partial<InsertTournament>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tournaments).set(data).where(eq(tournaments.id, id));
}

export async function deleteTournament(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournaments).where(eq(tournaments.id, id));
}

// ─── Tournament Events ──────────────────────────────────
export async function createTournamentEvent(data: InsertTournamentEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournamentEvents).values(data);
  return result[0].insertId;
}

export async function getEventsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournamentEvents).where(eq(tournamentEvents.tournamentId, tournamentId));
}

export async function updateTournamentEvent(id: number, data: Partial<InsertTournamentEvent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tournamentEvents).set(data).where(eq(tournamentEvents.id, id));
}

export async function deleteTournamentEvent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentEvents).where(eq(tournamentEvents.id, id));
}

export async function deleteEventsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentEvents).where(eq(tournamentEvents.tournamentId, tournamentId));
}

// ─── Tournament Age Groups ──────────────────────────────
export async function createAgeGroup(data: InsertTournamentAgeGroup) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournamentAgeGroups).values(data);
  return result[0].insertId;
}

export async function getAgeGroupsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournamentAgeGroups).where(eq(tournamentAgeGroups.tournamentId, tournamentId));
}

export async function deleteAgeGroupsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentAgeGroups).where(eq(tournamentAgeGroups.tournamentId, tournamentId));
}

// ─── Tournament Posters ─────────────────────────────────
export async function createPoster(data: InsertTournamentPoster) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournamentPosters).values(data);
  return result[0].insertId;
}

export async function getPostersByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournamentPosters)
    .where(eq(tournamentPosters.tournamentId, tournamentId))
    .orderBy(tournamentPosters.sortOrder);
}

export async function deletePoster(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentPosters).where(eq(tournamentPosters.id, id));
}

export async function deletePostersByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentPosters).where(eq(tournamentPosters.tournamentId, tournamentId));
}

// ─── Tournament Documents ───────────────────────────────
export async function createDocument(data: InsertTournamentDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournamentDocuments).values(data);
  return result[0].insertId;
}

export async function getDocumentsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournamentDocuments)
    .where(eq(tournamentDocuments.tournamentId, tournamentId))
    .orderBy(tournamentDocuments.sortOrder);
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentDocuments).where(eq(tournamentDocuments.id, id));
}

export async function deleteDocumentsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentDocuments).where(eq(tournamentDocuments.tournamentId, tournamentId));
}

// ─── Registrations ──────────────────────────────────────
export async function createRegistration(data: InsertRegistration) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(registrations).values(data);
  return result[0].insertId;
}

export async function getRegistrationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRegistrationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrations)
    .where(eq(registrations.userId, userId))
    .orderBy(desc(registrations.createdAt));
}

export async function getRegistrationsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrations)
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(desc(registrations.createdAt));
}

export async function getRegistrationsByEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrations)
    .where(eq(registrations.tournamentEventId, eventId))
    .orderBy(desc(registrations.createdAt));
}

export async function updateRegistration(id: number, data: Partial<InsertRegistration>) {
  const db = await getDb();
  if (!db) return;
  await db.update(registrations).set(data).where(eq(registrations.id, id));
}

export async function deleteRegistration(id: number) {
  const db = await getDb();
  if (!db) return;
  // Delete players first
  await db.delete(players).where(eq(players.registrationId, id));
  await db.delete(registrations).where(eq(registrations.id, id));
}

export async function generateRegistrationNumber(tournamentId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(registrations)
    .where(eq(registrations.tournamentId, tournamentId));
  const count = result[0]?.count ?? 0;
  return `R${tournamentId.toString().padStart(3, '0')}-${(count + 1).toString().padStart(4, '0')}`;
}

// ─── Players ────────────────────────────────────────────
export async function createPlayer(data: InsertPlayer) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(players).values(data);
  return result[0].insertId;
}

export async function getPlayersByRegistration(registrationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(players)
    .where(eq(players.registrationId, registrationId))
    .orderBy(players.playerOrder);
}

export async function updatePlayer(id: number, data: Partial<InsertPlayer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(players).set(data).where(eq(players.id, id));
}

export async function deletePlayersByRegistration(registrationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(players).where(eq(players.registrationId, registrationId));
}

// ─── Aggregate Queries ──────────────────────────────────
export async function getRegistrationWithPlayers(registrationId: number) {
  const db = await getDb();
  if (!db) return null;
  const reg = await getRegistrationById(registrationId);
  if (!reg) return null;
  const playerList = await getPlayersByRegistration(registrationId);
  return { ...reg, players: playerList };
}

export async function getFullTournamentData(tournamentId: number) {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return null;
  const events = await getEventsByTournament(tournamentId);
  const ageGroups = await getAgeGroupsByTournament(tournamentId);
  const posters = await getPostersByTournament(tournamentId);
  const documents = await getDocumentsByTournament(tournamentId);
  return { ...tournament, events, ageGroups, posters, documents };
}

export async function getEventRegistrationCounts(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    tournamentEventId: registrations.tournamentEventId,
    count: sql<number>`count(*)`,
  })
    .from(registrations)
    .where(and(
      eq(registrations.tournamentId, tournamentId),
      sql`${registrations.status} != 'cancelled'`
    ))
    .groupBy(registrations.tournamentEventId);
}

export async function getRegistrationsWithPlayers(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  const regs = await getRegistrationsByTournament(tournamentId);
  const result = [];
  for (const reg of regs) {
    const playerList = await getPlayersByRegistration(reg.id);
    result.push({ ...reg, players: playerList });
  }
  return result;
}

export async function incrementEventTeamCount(eventId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tournamentEvents)
    .set({ currentTeams: sql`${tournamentEvents.currentTeams} + 1` })
    .where(eq(tournamentEvents.id, eventId));
}

export async function decrementEventTeamCount(eventId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tournamentEvents)
    .set({ currentTeams: sql`GREATEST(${tournamentEvents.currentTeams} - 1, 0)` })
    .where(eq(tournamentEvents.id, eventId));
}


// ─── KPR (Korea Pickleball Ranking) helpers ──────────────

/** 사용자의 KPR 레이팅 조회 */
export async function getKprRating(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(kprRatings).where(eq(kprRatings.userId, userId)).limit(1);
  return rows[0] ?? null;
}

/** KPR 레이팅 초기화 (신규 가입 시) */
export async function initKprRating(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(kprRatings).values({ userId });
}

/** 전체 리더보드 (rating 내림차순) */
export async function getKprLeaderboard(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: kprRatings.userId,
      rating: kprRatings.rating,
      totalMatches: kprRatings.totalMatches,
      wins: kprRatings.wins,
      losses: kprRatings.losses,
      winStreak: kprRatings.winStreak,
      tier: kprRatings.tier,
      userName: users.name,
    })
    .from(kprRatings)
    .leftJoin(users, eq(kprRatings.userId, users.id))
    .orderBy(desc(kprRatings.rating))
    .limit(limit);
}

/** 전체 참가자 수 */
export async function getKprTotalParticipants(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ cnt: sql<number>`COUNT(*)` }).from(kprRatings);
  return rows[0]?.cnt ?? 0;
}

/** 사용자의 순위 */
export async function getKprRank(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const userRating = await getKprRating(userId);
  if (!userRating) return 0;
  const rows = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(kprRatings)
    .where(sql`${kprRatings.rating} > ${userRating.rating}`);
  return (rows[0]?.cnt ?? 0) + 1;
}

/** 사용자의 최근 경기 기록 */
export async function getRecentMatches(userId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matchResults)
    .where(
      sql`${matchResults.winner1Id} = ${userId} OR ${matchResults.winner2Id} = ${userId} OR ${matchResults.loser1Id} = ${userId} OR ${matchResults.loser2Id} = ${userId}`
    )
    .orderBy(desc(matchResults.matchDate))
    .limit(limit);
}
