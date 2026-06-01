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
  unique,
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
  nickname: varchar("nickname", { length: 30 }).unique(),
  pushEnabled: boolean("pushEnabled").default(true).notNull(),
  role: mysqlEnum("role", ["user", "admin", "super_admin"])
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
  // Size guide image
  sizeGuideImageUrl: varchar("sizeGuideImageUrl", { length: 1000 }),
  sizeGuideFileKey: varchar("sizeGuideFileKey", { length: 500 }),
  // Status
  status: mysqlEnum("status", ["draft", "open", "closed", "bracket_published", "in_progress", "cancelled"])
    .default("draft")
    .notNull(),
  officialDocUrl: varchar("officialDocUrl", { length: 1000 }), // 공문 링크 URL
  refereePin: varchar("refereePin", { length: 10 }), // 심판 접근 PIN
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
  sortOrder: int("sortOrder").default(0).notNull(),
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

// ─── Tournament Organizers (다중 관리자) ─────────────────
export const tournamentOrganizers = mysqlTable("tournament_organizers", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "manager"]).default("manager").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
}, (table) => ({
  uniqueTournamentUser: unique().on(table.tournamentId, table.userId),
}));

export type TournamentOrganizer = typeof tournamentOrganizers.$inferSelect;
export type InsertTournamentOrganizer = typeof tournamentOrganizers.$inferInsert;

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
  affiliation: varchar("affiliation", { length: 100 }).notNull().default(""), // 소속 (클럽명) - 필수
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ─── KPR (Korea Pickleball Ranking) ─────────────────────
// KPR 체스 ELO식 단일 점수. 초기 1000점, 상한 없음.
export const kprRatings = mysqlTable("kpr_ratings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  rating: int("rating").default(1000).notNull(),
  ratingDelta: int("ratingDelta").default(0).notNull(),
  totalMatches: int("totalMatches").default(0).notNull(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  winStreak: int("winStreak").default(0).notNull(),
  bestRating: int("bestRating").default(1000).notNull(),
  weeklyRankDelta: int("weeklyRankDelta").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KprRating = typeof kprRatings.$inferSelect;
export type InsertKprRating = typeof kprRatings.$inferInsert;

// ─── Match Results ───────────────────────────────
export const matchResults = mysqlTable("match_results", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId"),
  matchDate: timestamp("matchDate").defaultNow().notNull(),
  matchType: mysqlEnum("matchType", ["singles", "doubles", "mixed"]).default("doubles").notNull(),
  winner1Id: int("winner1Id").notNull(),
  winner2Id: int("winner2Id"),
  loser1Id: int("loser1Id").notNull(),
  loser2Id: int("loser2Id"),
  winnerScore: int("winnerScore").notNull(),
  loserScore: int("loserScore").notNull(),
  ratingChange: int("ratingChange").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchResult = typeof matchResults.$inferSelect;
export type InsertMatchResult = typeof matchResults.$inferInsert;

// ─── Community: Posts ───────────────────────────────────
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isNotice: boolean("isNotice").default(false).notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  hiddenBy: int("hiddenBy"),
  hiddenAt: timestamp("hiddenAt"),
  hiddenReason: text("hiddenReason"),
  commentCount: int("commentCount").default(0).notNull(),
  likeCount: int("likeCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ─── Community: Post Images ─────────────────────────────
export const postImages = mysqlTable("post_images", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  thumbnailFileKey: varchar("thumbnailFileKey", { length: 500 }).notNull(),
  width: int("width"),
  height: int("height"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostImage = typeof postImages.$inferSelect;
export type InsertPostImage = typeof postImages.$inferInsert;

// ─── Community: Comments ────────────────────────────────
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  hiddenBy: int("hiddenBy"),
  hiddenAt: timestamp("hiddenAt"),
  hiddenReason: text("hiddenReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ─── Community: Post Likes ──────────────────────────────
export const postLikes = mysqlTable("post_likes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostLike = typeof postLikes.$inferInsert;

// ─── Community: Reports ─────────────────────────────────
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  targetType: mysqlEnum("targetType", ["post", "comment"]).notNull(),
  targetId: int("targetId").notNull(),
  reason: mysqlEnum("reason", [
    "spam",
    "abuse",
    "inappropriate",
    "misinformation",
    "other",
  ]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"])
    .default("pending")
    .notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ─── Community: Notifications ───────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["comment", "like", "notice", "report_result", "hidden"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  relatedPostId: int("relatedPostId"),
  relatedCommentId: int("relatedCommentId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Bracket: Settings (종목별 대진 설정) ────────────────
export const bracketSettings = mysqlTable("bracket_settings", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  tournamentEventId: int("tournamentEventId").notNull(),
  qualifyingScore: int("qualifyingScore").notNull().default(15),
  mainScore: int("mainScore").notNull().default(15),
  deuceEnabled: boolean("deuceEnabled").notNull().default(true),
  deuceMaxScore: int("deuceMaxScore").notNull().default(17),
  advanceCount: int("advanceCount").notNull().default(1), // 1 or 2
  hasThirdPlace: boolean("hasThirdPlace").notNull().default(false),
  eventOrder: int("eventOrder").notNull().default(0),
  matchDate: varchar("matchDate", { length: 10 }),
  status: mysqlEnum("status", ["draft", "qualifying", "main", "completed"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uqTournamentEvent: unique().on(table.tournamentId, table.tournamentEventId),
}));

export type BracketSettings = typeof bracketSettings.$inferSelect;
export type InsertBracketSettings = typeof bracketSettings.$inferInsert;

// ─── Bracket: Court Settings (날짜별 코트 설정) ──────────
export const bracketCourtSettings = mysqlTable("bracket_court_settings", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  matchDate: varchar("matchDate", { length: 10 }).notNull(),
  courtCount: int("courtCount").notNull().default(1),
  startTime: varchar("startTime", { length: 5 }).notNull().default("09:00"),
  estimatedMinutes: int("estimatedMinutes").notNull().default(15),
  targetEndTime: varchar("targetEndTime", { length: 5 }).notNull().default("18:00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uqTournamentDate: unique().on(table.tournamentId, table.matchDate),
}));

export type BracketCourtSettings = typeof bracketCourtSettings.$inferSelect;
export type InsertBracketCourtSettings = typeof bracketCourtSettings.$inferInsert;

// ─── Bracket: Groups (예선 조) ───────────────────────────
export const bracketGroups = mysqlTable("bracket_groups", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  tournamentEventId: int("tournamentEventId").notNull(),
  groupNumber: int("groupNumber").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uqEventGroup: unique().on(table.tournamentEventId, table.groupNumber),
}));

export type BracketGroup = typeof bracketGroups.$inferSelect;
export type InsertBracketGroup = typeof bracketGroups.$inferInsert;

// ─── Bracket: Group Teams (조별 팀 배정) ─────────────────
export const bracketGroupTeams = mysqlTable("bracket_group_teams", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  registrationId: int("registrationId").notNull(),
  finalRank: int("finalRank"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BracketGroupTeam = typeof bracketGroupTeams.$inferSelect;
export type InsertBracketGroupTeam = typeof bracketGroupTeams.$inferInsert;

// ─── Bracket: Matches (전체 경기 - 예선 + 본선) ──────────
export const bracketMatches = mysqlTable("bracket_matches", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  tournamentEventId: int("tournamentEventId").notNull(),
  phase: mysqlEnum("phase", ["qualifying", "main"]).notNull(),
  roundNumber: int("roundNumber").notNull().default(1),
  matchNumber: int("matchNumber").notNull(), // 0 = 3·4위전
  groupId: int("groupId"),                  // 예선 조 (qualifying only)
  team1Id: int("team1Id"),                  // registrations.id
  team2Id: int("team2Id"),
  team1Score: int("team1Score"),
  team2Score: int("team2Score"),
  winnerId: int("winnerId"),
  isBye: boolean("isBye").notNull().default(false),
  courtNumber: int("courtNumber"),
  scheduledAt: timestamp("scheduledAt"),
  // 본선 팀 출처 (대진표 라벨용)
  team1SourceType: mysqlEnum("team1SourceType", ["group_rank", "match_winner"]),
  team1SourceGroupId: int("team1SourceGroupId"),
  team1SourceRank: int("team1SourceRank"),
  team1SourceMatchId: int("team1SourceMatchId"),
  team2SourceType: mysqlEnum("team2SourceType", ["group_rank", "match_winner"]),
  team2SourceGroupId: int("team2SourceGroupId"),
  team2SourceRank: int("team2SourceRank"),
  team2SourceMatchId: int("team2SourceMatchId"),
  // 본선 다음 경기 연결
  nextMatchId: int("nextMatchId"),
  nextMatchPosition: int("nextMatchPosition"), // 1 or 2
  loserNextMatchId: int("loserNextMatchId"),    // 3·4위전용
  loserNextMatchPosition: int("loserNextMatchPosition"),
  slotOrder: int("slotOrder"),                      // 코트 내 경기 순번 (관리자 조정용)
  status: mysqlEnum("status", ["scheduled", "completed"]).notNull().default("scheduled"),
  refereeUserId: int("refereeUserId"),              // 점수 입력 심판 (FK to users.id)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BracketMatch = typeof bracketMatches.$inferSelect;
export type InsertBracketMatch = typeof bracketMatches.$inferInsert;
