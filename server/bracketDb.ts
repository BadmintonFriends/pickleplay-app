import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  bracketSettings, type InsertBracketSettings,
  bracketCourtSettings, type InsertBracketCourtSettings,
  bracketGroups, type InsertBracketGroup,
  bracketGroupTeams, type InsertBracketGroupTeam,
  bracketMatches, type InsertBracketMatch,
} from "../drizzle/schema";

// ─── Bracket Settings ────────────────────────────────────

export async function getBracketSettings(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bracketSettings)
    .where(eq(bracketSettings.tournamentId, tournamentId))
    .orderBy(bracketSettings.eventOrder);
}

export async function getBracketSettingsByEvent(tournamentEventId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(bracketSettings)
    .where(eq(bracketSettings.tournamentEventId, tournamentEventId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertBracketSettings(data: InsertBracketSettings) {
  const db = await getDb();
  if (!db) return;
  await db.insert(bracketSettings).values(data).onDuplicateKeyUpdate({
    set: {
      qualifyingScore: data.qualifyingScore,
      mainScore: data.mainScore,
      deuceEnabled: data.deuceEnabled,
      deuceMaxScore: data.deuceMaxScore,
      advanceCount: data.advanceCount,
      hasThirdPlace: data.hasThirdPlace,
      eventOrder: data.eventOrder,
      matchDate: data.matchDate,
      status: data.status,
    },
  });
}

export async function updateBracketSettingsStatus(
  tournamentEventId: number,
  status: "draft" | "qualifying" | "main" | "completed"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(bracketSettings)
    .set({ status })
    .where(eq(bracketSettings.tournamentEventId, tournamentEventId));
}

// ─── Court Settings ──────────────────────────────────────

export async function getBracketCourtSettings(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bracketCourtSettings)
    .where(eq(bracketCourtSettings.tournamentId, tournamentId))
    .orderBy(bracketCourtSettings.matchDate);
}

export async function upsertBracketCourtSettings(data: InsertBracketCourtSettings) {
  const db = await getDb();
  if (!db) return;
  await db.insert(bracketCourtSettings).values(data).onDuplicateKeyUpdate({
    set: {
      courtCount: data.courtCount,
      startTime: data.startTime,
      estimatedMinutes: data.estimatedMinutes,
    },
  });
}

// ─── Groups ──────────────────────────────────────────────

export async function createBracketGroup(data: InsertBracketGroup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(bracketGroups).values(data);
  return result[0].insertId;
}

export async function getBracketGroups(tournamentId: number, tournamentEventId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bracketGroups.tournamentId, tournamentId)];
  if (tournamentEventId !== undefined) {
    conditions.push(eq(bracketGroups.tournamentEventId, tournamentEventId));
  }
  return db.select().from(bracketGroups)
    .where(and(...conditions))
    .orderBy(bracketGroups.tournamentEventId, bracketGroups.groupNumber);
}

export async function deleteBracketGroups(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(bracketGroups).where(eq(bracketGroups.tournamentId, tournamentId));
}

// ─── Group Teams ─────────────────────────────────────────

export async function createBracketGroupTeam(data: InsertBracketGroupTeam) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(bracketGroupTeams).values(data);
}

export async function getBracketGroupTeams(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bracketGroupTeams)
    .where(eq(bracketGroupTeams.groupId, groupId));
}

export async function getBracketGroupTeamsByGroupIds(groupIds: number[]) {
  const db = await getDb();
  if (!db || groupIds.length === 0) return [];
  return db.select().from(bracketGroupTeams)
    .where(inArray(bracketGroupTeams.groupId, groupIds));
}

export async function updateGroupTeamRank(id: number, finalRank: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(bracketGroupTeams).set({ finalRank }).where(eq(bracketGroupTeams.id, id));
}

export async function deleteBracketGroupTeams(groupIds: number[]) {
  const db = await getDb();
  if (!db || groupIds.length === 0) return;
  await db.delete(bracketGroupTeams).where(inArray(bracketGroupTeams.groupId, groupIds));
}

// ─── Matches ─────────────────────────────────────────────

export async function createBracketMatch(data: InsertBracketMatch): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(bracketMatches).values(data);
  return result[0].insertId;
}

export async function getBracketMatches(tournamentId: number, tournamentEventId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bracketMatches.tournamentId, tournamentId)];
  if (tournamentEventId !== undefined) {
    conditions.push(eq(bracketMatches.tournamentEventId, tournamentEventId));
  }
  return db.select().from(bracketMatches)
    .where(and(...conditions))
    .orderBy(bracketMatches.tournamentEventId, bracketMatches.phase, bracketMatches.roundNumber, bracketMatches.matchNumber);
}

export async function getBracketMatchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(bracketMatches).where(eq(bracketMatches.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateBracketMatch(id: number, data: Partial<InsertBracketMatch>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bracketMatches).set(data).where(eq(bracketMatches.id, id));
}

export async function deleteBracketMatches(tournamentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, tournamentId));
}

// ─── Composite Delete ────────────────────────────────────

export async function deleteBracketData(tournamentId: number) {
  // Order matters: matches → group_teams (via group ids) → groups
  await deleteBracketMatches(tournamentId);
  const groups = await getBracketGroups(tournamentId);
  if (groups.length > 0) {
    await deleteBracketGroupTeams(groups.map(g => g.id));
  }
  await deleteBracketGroups(tournamentId);
}
