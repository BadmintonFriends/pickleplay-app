import {
  eq,
  and,
  desc,
  asc,
  sql,
  or,
  like,
  ne,
  gte,
  inArray,
  isNull,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  tournaments,
  InsertTournament,
  Tournament,
  tournamentEvents,
  InsertTournamentEvent,
  tournamentAgeGroups,
  InsertTournamentAgeGroup,
  tournamentPosters,
  InsertTournamentPoster,
  tournamentDocuments,
  InsertTournamentDocument,
  tournamentOrganizers,
  InsertTournamentOrganizer,
  registrations,
  InsertRegistration,
  players,
  InsertPlayer,
  kprRatings,
  InsertKprRating,
  matchResults,
  posts,
  InsertPost,
  postImages,
  InsertPostImage,
  comments,
  InsertComment,
  postLikes,
  reports,
  InsertReport,
  notifications,
  InsertNotification,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

function createDatabase(connectionString: string) {
  const pool = mysql.createPool({
    uri: connectionString,
    ssl: { rejectUnauthorized: false },
    timezone: "+09:00",
  });
  return drizzle(pool);
}

let _db: ReturnType<typeof createDatabase> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = createDatabase(process.env.DATABASE_URL);
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
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

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

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.openId, openId), isNull(users.deletedAt)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt));
}

export async function updateUserRole(
  userId: number,
  role: "user" | "admin" | "super_admin"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; gender?: "male" | "female"; birthDate?: string }
) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.gender !== undefined) updateSet.gender = data.gender;
  if (data.birthDate !== undefined) updateSet.birthDate = data.birthDate;
  if (Object.keys(updateSet).length === 0) return;
  await db
    .update(users)
    .set(updateSet)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
}

export async function softDeleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const deletedAt = new Date();
  await db
    .update(users)
    .set({
      openId: `deleted_${userId}_${deletedAt.getTime()}`,
      name: "탈퇴한 사용자",
      email: null,
      phone: null,
      loginMethod: "deleted",
      gender: null,
      birthDate: null,
      termsAcceptedAt: null,
      privacyAcceptedAt: null,
      nickname: null,
      pushEnabled: false,
      role: "user",
      deletedAt,
    })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
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
  const result = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllTournaments() {
  const db = await getDb();
  if (!db) return [];
  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.startDate));
  // Attach first poster image for each tournament
  const allPosters = await db
    .select()
    .from(tournamentPosters)
    .orderBy(tournamentPosters.sortOrder);
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

export async function updateTournament(
  id: number,
  data: Partial<InsertTournament>
) {
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
  return db
    .select()
    .from(tournamentEvents)
    .where(
      and(
        eq(tournamentEvents.tournamentId, tournamentId),
        gte(tournamentEvents.sortOrder, 0)
      )
    )
    .orderBy(asc(tournamentEvents.sortOrder), asc(tournamentEvents.id));
}

export async function updateTournamentEvent(
  id: number,
  data: Partial<InsertTournamentEvent>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(tournamentEvents)
    .set(data)
    .where(eq(tournamentEvents.id, id));
}

export async function deleteTournamentEvent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentEvents).where(eq(tournamentEvents.id, id));
}

export async function deleteEventsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(tournamentEvents)
    .where(eq(tournamentEvents.tournamentId, tournamentId));
}

export async function hasRegistrationsForEvent(
  eventId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(eq(registrations.tournamentEventId, eventId))
    .limit(1);
  return result.length > 0;
}

export async function updateEventSortOrders(
  orders: { id: number; sortOrder: number }[]
) {
  const db = await getDb();
  if (!db) return;
  for (const { id, sortOrder } of orders) {
    await db
      .update(tournamentEvents)
      .set({ sortOrder })
      .where(eq(tournamentEvents.id, id));
  }
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
  return db
    .select()
    .from(tournamentAgeGroups)
    .where(eq(tournamentAgeGroups.tournamentId, tournamentId));
}

export async function deleteAgeGroupsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(tournamentAgeGroups)
    .where(eq(tournamentAgeGroups.tournamentId, tournamentId));
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
  return db
    .select()
    .from(tournamentPosters)
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
  await db
    .delete(tournamentPosters)
    .where(eq(tournamentPosters.tournamentId, tournamentId));
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
  return db
    .select()
    .from(tournamentDocuments)
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
  await db
    .delete(tournamentDocuments)
    .where(eq(tournamentDocuments.tournamentId, tournamentId));
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
  const result = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRegistrationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(registrations)
    .where(eq(registrations.userId, userId))
    .orderBy(desc(registrations.createdAt));
}

// 내가 접수한 건 + 내가 선수로 등록된 건(대리접수) 모두 조회
export async function getRegistrationsByUserOrPlayer(
  userId: number,
  userPhone: string | null
) {
  const db = await getDb();
  if (!db) return [];
  // 1) 내가 직접 접수한 건
  const myRegs = await db
    .select()
    .from(registrations)
    .where(eq(registrations.userId, userId))
    .orderBy(desc(registrations.createdAt));

  if (!userPhone) return myRegs.map(r => ({ ...r, isProxy: false }));

  // 2) 내 전화번호로 선수 등록된 접수 (다른 사람이 대리 접수한 건)
  const phoneDigits = userPhone.replace(/\D/g, "");
  const playerRows = await db
    .select({ registrationId: players.registrationId })
    .from(players)
    .where(eq(players.phone, phoneDigits));

  const proxyRegIds = playerRows
    .map(p => p.registrationId)
    .filter(regId => !myRegs.some(r => r.id === regId));

  if (proxyRegIds.length === 0)
    return myRegs.map(r => ({ ...r, isProxy: false }));

  const proxyRegs = await db
    .select()
    .from(registrations)
    .where(inArray(registrations.id, proxyRegIds))
    .orderBy(desc(registrations.createdAt));

  return [
    ...myRegs.map(r => ({ ...r, isProxy: false })),
    ...proxyRegs.map(r => ({ ...r, isProxy: true })),
  ];
}

export async function getRegistrationsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(registrations)
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(desc(registrations.createdAt));
}

export async function getRegistrationsByEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(registrations)
    .where(eq(registrations.tournamentEventId, eventId))
    .orderBy(desc(registrations.createdAt));
}

export async function updateRegistration(
  id: number,
  data: Partial<InsertRegistration>
) {
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

export async function generateRegistrationNumber(
  tournamentId: number
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(registrations)
    .where(eq(registrations.tournamentId, tournamentId));
  const count = result[0]?.count ?? 0;
  return `R${tournamentId.toString().padStart(3, "0")}-${(count + 1).toString().padStart(4, "0")}`;
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
  return db
    .select()
    .from(players)
    .where(eq(players.registrationId, registrationId))
    .orderBy(players.playerOrder);
}

export async function getPlayerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(players)
    .where(eq(players.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
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
  return db
    .select({
      tournamentEventId: registrations.tournamentEventId,
      count: sql<number>`count(*)`,
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        sql`${registrations.status} != 'cancelled'`
      )
    )
    .groupBy(registrations.tournamentEventId);
}

export async function getRegistrationsWithPlayers(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  const regs = await getRegistrationsByTournament(tournamentId);
  if (regs.length === 0) return [];
  // 종목/나이대 정보를 한 번에 조회
  const events = await getEventsByTournament(tournamentId);
  const ageGroups = await getAgeGroupsByTournament(tournamentId);
  const eventMap = new Map(events.map(e => [e.id, e]));
  const ageGroupMap = new Map(ageGroups.map(a => [a.id, a]));

  // N+1 쿼리 최적화: 모든 선수를 한 번에 조회 후 registrationId로 그룹핑
  const regIds = regs.map(r => r.id);
  const allPlayers = await db
    .select()
    .from(players)
    .where(inArray(players.registrationId, regIds))
    .orderBy(players.playerOrder);
  const playersByRegId = new Map<number, typeof allPlayers>();
  for (const p of allPlayers) {
    if (!playersByRegId.has(p.registrationId)) {
      playersByRegId.set(p.registrationId, []);
    }
    playersByRegId.get(p.registrationId)!.push(p);
  }

  return regs.map(reg => {
    const event = eventMap.get(reg.tournamentEventId);
    const ageGroup = reg.ageGroupId ? ageGroupMap.get(reg.ageGroupId) : null;
    return {
      ...reg,
      players: playersByRegId.get(reg.id) ?? [],
      eventType: event?.eventType ?? null,
      skillLevel: event?.skillLevel ?? null,
      ageGroupLabel: ageGroup?.label ?? null,
    };
  });
}

export async function incrementEventTeamCount(eventId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(tournamentEvents)
    .set({ currentTeams: sql`${tournamentEvents.currentTeams} + 1` })
    .where(eq(tournamentEvents.id, eventId));
}

export async function decrementEventTeamCount(eventId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(tournamentEvents)
    .set({
      currentTeams: sql`GREATEST(${tournamentEvents.currentTeams} - 1, 0)`,
    })
    .where(eq(tournamentEvents.id, eventId));
}

// ─── KPR (Korea Pickleball Ranking) helpers ──────────────

/** 사용자의 KPR 레이팅 조회 */
export async function getKprRating(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(kprRatings)
    .where(eq(kprRatings.userId, userId))
    .limit(1);
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

// ─── Nickname ──────────────────────────────────────────
export async function updateNickname(userId: number, nickname: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ nickname })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
}

export async function isNicknameAvailable(
  nickname: string,
  excludeUserId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const conditions = [eq(users.nickname, nickname), isNull(users.deletedAt)];
  if (excludeUserId) conditions.push(ne(users.id, excludeUserId));
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1);
  return rows.length === 0;
}

// ─── Community: Posts ──────────────────────────────────
export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(posts).values(data);
  return result[0].insertId;
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listPosts(opts: {
  cursor?: number;
  limit: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null };
  const { cursor, limit, search } = opts;

  const conditions: any[] = [];
  if (cursor) conditions.push(sql`${posts.id} < ${cursor}`);
  if (search)
    conditions.push(
      or(like(posts.title, `%${search}%`), like(posts.content, `%${search}%`))
    );

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(posts)
    .where(where)
    .orderBy(desc(posts.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}

export async function updatePost(id: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set(data).where(eq(posts.id, id));
}

export async function deletePost(id: number) {
  const db = await getDb();
  if (!db) return;
  // Delete related data first
  await db.delete(postImages).where(eq(postImages.postId, id));
  await db.delete(comments).where(eq(comments.postId, id));
  await db.delete(postLikes).where(eq(postLikes.postId, id));
  await db.delete(posts).where(eq(posts.id, id));
}

// ─── Community: Post Images ────────────────────────────
export async function createPostImage(data: InsertPostImage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(postImages).values(data);
  return result[0].insertId;
}

export async function getImagesByPost(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(postImages)
    .where(eq(postImages.postId, postId))
    .orderBy(asc(postImages.sortOrder));
}

export async function deletePostImage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(postImages).where(eq(postImages.id, id));
}

export async function deletePostImagesByPost(postId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(postImages).where(eq(postImages.postId, postId));
}

// ─── Community: Comments ───────────────────────────────
export async function createComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(comments).values(data);
  // Increment comment count
  await db
    .update(posts)
    .set({ commentCount: sql`${posts.commentCount} + 1` })
    .where(eq(posts.id, data.postId));
  return result[0].insertId;
}

export async function getCommentsByPost(
  postId: number,
  opts: { cursor?: number; limit: number }
) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null };
  const conditions: any[] = [eq(comments.postId, postId)];
  if (opts.cursor) conditions.push(sql`${comments.id} > ${opts.cursor}`);
  const rows = await db
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(asc(comments.id))
    .limit(opts.limit + 1);
  const hasMore = rows.length > opts.limit;
  const items = hasMore ? rows.slice(0, opts.limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}

export async function deleteComment(id: number, postId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(eq(comments.id, id));
  await db
    .update(posts)
    .set({ commentCount: sql`GREATEST(${posts.commentCount} - 1, 0)` })
    .where(eq(posts.id, postId));
}

// ─── Community: Likes ──────────────────────────────────
export async function toggleLike(
  postId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(postLikes).where(eq(postLikes.id, existing[0].id));
    await db
      .update(posts)
      .set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` })
      .where(eq(posts.id, postId));
    return false; // unliked
  } else {
    await db.insert(postLikes).values({ postId, userId });
    await db
      .update(posts)
      .set({ likeCount: sql`${posts.likeCount} + 1` })
      .where(eq(posts.id, postId));
    return true; // liked
  }
}

export async function hasUserLiked(
  postId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function getLikedPostIds(
  userId: number,
  postIds: number[]
): Promise<number[]> {
  const db = await getDb();
  if (!db || postIds.length === 0) return [];
  const rows = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(
      and(
        eq(postLikes.userId, userId),
        sql`${postLikes.postId} IN (${sql.join(
          postIds.map(id => sql`${id}`),
          sql`, `
        )})`
      )
    );
  return rows.map(r => r.postId);
}

// ─── Community: Reports ────────────────────────────────
export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check duplicate
  const existing = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, data.reporterId),
        eq(reports.targetType, data.targetType!),
        eq(reports.targetId, data.targetId)
      )
    )
    .limit(1);
  if (existing.length > 0) throw new Error("DUPLICATE_REPORT");
  const result = await db.insert(reports).values(data);
  return result[0].insertId;
}

export async function listReports(opts: {
  status?: string;
  limit: number;
  offset: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions: any[] = [];
  if (opts.status) conditions.push(eq(reports.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(reports)
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(reports)
      .where(where),
  ]);
  return { items, total: countResult[0]?.cnt ?? 0 };
}

export async function updateReport(id: number, data: Partial<InsertReport>) {
  const db = await getDb();
  if (!db) return;
  await db.update(reports).set(data).where(eq(reports.id, id));
}

// ─── Community: Notifications ──────────────────────────
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function listNotifications(
  userId: number,
  opts: { cursor?: number; limit: number }
) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null };
  const conditions: any[] = [eq(notifications.userId, userId)];
  if (opts.cursor) conditions.push(sql`${notifications.id} < ${opts.cursor}`);
  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.id))
    .limit(opts.limit + 1);
  const hasMore = rows.length > opts.limit;
  const items = hasMore ? rows.slice(0, opts.limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(
  userId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return rows[0]?.cnt ?? 0;
}

export async function updatePushEnabled(userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ pushEnabled: enabled })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
}

// ─── Tournament Organizers (다중 관리자) ─────────────────

export async function getTournamentOrganizers(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: tournamentOrganizers.id,
      tournamentId: tournamentOrganizers.tournamentId,
      userId: tournamentOrganizers.userId,
      role: tournamentOrganizers.role,
      assignedAt: tournamentOrganizers.assignedAt,
      userName: users.name,
      userPhone: users.phone,
    })
    .from(tournamentOrganizers)
    .leftJoin(users, eq(tournamentOrganizers.userId, users.id))
    .where(eq(tournamentOrganizers.tournamentId, tournamentId))
    .orderBy(
      asc(tournamentOrganizers.role),
      asc(tournamentOrganizers.assignedAt)
    );
  return rows;
}

export async function isTournamentOrganizer(
  tournamentId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: tournamentOrganizers.id })
    .from(tournamentOrganizers)
    .where(
      and(
        eq(tournamentOrganizers.tournamentId, tournamentId),
        eq(tournamentOrganizers.userId, userId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function addTournamentOrganizer(
  tournamentId: number,
  userId: number,
  role: "owner" | "manager" = "manager"
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(tournamentOrganizers).values({ tournamentId, userId, role });
}

export async function removeTournamentOrganizer(
  tournamentId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return;
  // owner는 제거 불가
  await db
    .delete(tournamentOrganizers)
    .where(
      and(
        eq(tournamentOrganizers.tournamentId, tournamentId),
        eq(tournamentOrganizers.userId, userId),
        eq(tournamentOrganizers.role, "manager")
      )
    );
}

export async function getUserManagedTournaments(
  userId: number
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ tournamentId: tournamentOrganizers.tournamentId })
    .from(tournamentOrganizers)
    .where(eq(tournamentOrganizers.userId, userId));
  return rows.map(r => r.tournamentId);
}
