import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  bigint,
  json,
  decimal,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  gender: mysqlEnum("gender", ["male", "female"]),
  birthDate: varchar("birthDate", { length: 10 }), // YYYY-MM-DD
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  privacyAcceptedAt: timestamp("privacyAcceptedAt"),
  role: mysqlEnum("role", ["user", "organizer", "admin", "super_admin"])
    .default("user")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tournaments ─────────────────────────────────────────
export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }).notNull(),
  venue: varchar("venue", { length: 200 }).notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  organizerInfo: text("organizerInfo"), // JSON string: { hosts: string[], sponsors: string[] }
  registrationStart: timestamp("registrationStart"),
  registrationEnd: timestamp("registrationEnd"),
  feePerTeam: int("feePerTeam").default(0).notNull(),
  giftDescription: varchar("giftDescription", { length: 500 }),
  // Size options
  sizeType: mysqlEnum("sizeType", ["numeric", "alpha"]).default("numeric").notNull(),
  sizeOptions: varchar("sizeOptions", { length: 500 }), // JSON array string e.g. '["85","90","95","100","105","110"]'
  // Features
  hasAgeGroup: boolean("hasAgeGroup").default(false).notNull(),
  hasSingles: boolean("hasSingles").default(false).notNull(),
  // Payment info
  bankName: varchar("bankName", { length: 100 }),
  accountNumber: varchar("accountNumber", { length: 100 }),
  accountHolder: varchar("accountHolder", { length: 100 }),
  paymentNote: text("paymentNote"),
  // Status
  status: mysqlEnum("status", ["draft", "open", "closed", "cancelled"])
    .default("draft")
    .notNull(),
  officialDocUrl: varchar("officialDocUrl", { length: 1000 }), // 공문 링크 URL
  organizerId: int("organizerId"), // FK to users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

// ─── Tournament Events (종목/급수 조합) ──────────────────
export const tournamentEvents = mysqlTable("tournament_events", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  eventType: mysqlEnum("eventType", ["남복", "여복", "혼복", "남단", "여단"]).notNull(),
  skillLevel: varchar("skillLevel", { length: 50 }).notNull(), // 오픈부, 2부, 3부, 신인부
  maxTeams: int("maxTeams").default(40).notNull(),
  dayLabel: varchar("dayLabel", { length: 50 }), // e.g. "1일차 (6/13)"
  currentTeams: int("currentTeams").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TournamentEvent = typeof tournamentEvents.$inferSelect;
export type InsertTournamentEvent = typeof tournamentEvents.$inferInsert;

// ─── Tournament Age Groups ───────────────────────────────
export const tournamentAgeGroups = mysqlTable("tournament_age_groups", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  code: varchar("code", { length: 20 }).notNull(), // e.g. "2026", "2733"
  label: varchar("label", { length: 50 }).notNull(), // e.g. "20~26세"
  minAge: int("minAge").notNull(),
  maxAge: int("maxAge"), // null means no upper limit
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TournamentAgeGroup = typeof tournamentAgeGroups.$inferSelect;
export type InsertTournamentAgeGroup = typeof tournamentAgeGroups.$inferInsert;

// ─── Tournament Posters ──────────────────────────────────
export const tournamentPosters = mysqlTable("tournament_posters", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TournamentPoster = typeof tournamentPosters.$inferSelect;
export type InsertTournamentPoster = typeof tournamentPosters.$inferInsert;

// ─── Tournament Documents (공문 PDF) ─────────────────────
export const tournamentDocuments = mysqlTable("tournament_documents", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileSize: int("fileSize").default(0).notNull(), // bytes
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TournamentDocument = typeof tournamentDocuments.$inferSelect;
export type InsertTournamentDocument = typeof tournamentDocuments.$inferInsert;

// ─── Registrations (접수) ────────────────────────────────
export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  tournamentEventId: int("tournamentEventId").notNull(),
  userId: int("userId").notNull(), // 접수한 사용자 (대리 신청 포함)
  ageGroupId: int("ageGroupId"), // nullable (연령 구분 없는 대회)
  isSelfParticipant: boolean("isSelfParticipant").default(true).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"])
    .default("pending")
    .notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid", "refunded"])
    .default("unpaid")
    .notNull(),
  paymentAmount: int("paymentAmount").default(0).notNull(),
  registrationNumber: varchar("registrationNumber", { length: 20 }), // 접수번호
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

// ─── Players (선수) ──────────────────────────────────────
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  playerOrder: int("playerOrder").notNull(), // 1 = 선수1, 2 = 선수2
  name: varchar("name", { length: 100 }).notNull(),
  birthDate: varchar("birthDate", { length: 10 }).notNull(), // YYYY-MM-DD
  phone: varchar("phone", { length: 20 }).notNull(),
  giftSize: varchar("giftSize", { length: 20 }), // 참가기념품 사이즈
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ─── KPR (Korea Pickleball Ranking) ─────────────────────
// KPL (Korea Pickleball Level) 7.00 스케일. 모든 사용자 초기 3.00점.
export const kprRatings = mysqlTable("kpr_ratings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users.id
  rating: decimal("rating", { precision: 4, scale: 2 }).default("3.00").notNull(), // KPL rating (초기 3.00, 최대 7.00)
  ratingDelta: decimal("ratingDelta", { precision: 4, scale: 2 }).default("0.00").notNull(), // 지난 주 대비 변동량
  totalMatches: int("totalMatches").default(0).notNull(), // 총 경기 수
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  winStreak: int("winStreak").default(0).notNull(), // 현재 연승
  bestRating: decimal("bestRating", { precision: 4, scale: 2 }).default("3.00").notNull(), // 최고 레이팅
  weeklyRankDelta: int("weeklyRankDelta").default(0).notNull(), // 이번 주 순위 변동
  tier: mysqlEnum("tier", [
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
    "Champion",
  ]).default("Bronze").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KprRating = typeof kprRatings.$inferSelect;
export type InsertKprRating = typeof kprRatings.$inferInsert;

// ─── Match Results (경기 결과) ──────────────────────────
export const matchResults = mysqlTable("match_results", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId"), // nullable (비대회 경기 가능)
  tournamentEventId: int("tournamentEventId"), // nullable
  // 경기 참가자 (복식: 팀 단위, 단식: 개인)
  winner1Id: int("winner1Id").notNull(), // FK to users.id
  winner2Id: int("winner2Id"), // nullable (단식일 경우)
  loser1Id: int("loser1Id").notNull(), // FK to users.id
  loser2Id: int("loser2Id"), // nullable (단식일 경우)
  // 스코어
  winnerScore: int("winnerScore").notNull(),
  loserScore: int("loserScore").notNull(),
  // 레이팅 변동
  ratingChange: int("ratingChange").default(0).notNull(), // 승자 기준 변동량
  matchDate: varchar("matchDate", { length: 10 }).notNull(), // YYYY-MM-DD
  matchType: mysqlEnum("matchType", ["singles", "doubles"]).default("doubles").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchResult = typeof matchResults.$inferSelect;
export type InsertMatchResult = typeof matchResults.$inferInsert;
