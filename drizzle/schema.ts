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
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
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
