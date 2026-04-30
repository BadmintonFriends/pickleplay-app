import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db module ─────────────────────────────────────
vi.mock("./db", () => {
  const mockTournament = {
    id: 1,
    name: "테스트 대회",
    description: null,
    startDate: "2026-06-14",
    endDate: "2026-06-14",
    venue: "테스트 체육관",
    address: "서울시 강남구",
    organizerInfo: JSON.stringify({ hosts: ["주최사"], sponsors: [] }),
    registrationStart: null,
    registrationEnd: null,
    feePerTeam: 50000,
    giftDescription: "티셔츠",
    sizeType: "alpha" as const,
    sizeOptions: JSON.stringify(["S", "M", "L", "XL"]),
    sizeGuideImageUrl: null,
    sizeGuideFileKey: null,
    hasAgeGroup: false,
    hasSingles: false,
    bankName: "국민은행",
    accountNumber: "123-456-789",
    accountHolder: "테스트",
    paymentNote: "",
    status: "open" as const,
    organizerId: 1, // admin user owns this
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvents = [
    { id: 1, tournamentId: 1, eventType: "남복", skillLevel: "오픈부", maxTeams: 40, dayLabel: null, currentTeams: 5, createdAt: new Date() },
    { id: 2, tournamentId: 1, eventType: "여복", skillLevel: "A조", maxTeams: 40, dayLabel: null, currentTeams: 3, createdAt: new Date() },
  ];

  const mockRegistrations: any[] = [];
  const mockPlayers: any[] = [];
  let regIdCounter = 1;
  let playerIdCounter = 1;

  return {
    getAllTournaments: vi.fn().mockResolvedValue([mockTournament]),
    getTournamentById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return mockTournament;
      return undefined;
    }),
    getFullTournamentData: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return { ...mockTournament, events: mockEvents, ageGroups: [], posters: [], documents: [] };
      return null;
    }),
    getEventsByTournament: vi.fn().mockImplementation(async (tournamentId: number) => {
      if (tournamentId === 1) return mockEvents;
      return [];
    }),
    getEventRegistrationCounts: vi.fn().mockResolvedValue([
      { tournamentEventId: 1, count: 5 },
      { tournamentEventId: 2, count: 3 },
    ]),
    getAgeGroupsByTournament: vi.fn().mockResolvedValue([]),
    getPostersByTournament: vi.fn().mockResolvedValue([]),
    getDocumentsByTournament: vi.fn().mockResolvedValue([]),
    generateRegistrationNumber: vi.fn().mockResolvedValue("R001-0001"),
    createRegistration: vi.fn().mockImplementation(async (data: any) => {
      const id = regIdCounter++;
      mockRegistrations.push({ id, ...data, createdAt: new Date(), updatedAt: new Date() });
      return id;
    }),
    createPlayer: vi.fn().mockImplementation(async (data: any) => {
      const id = playerIdCounter++;
      mockPlayers.push({ id, ...data, createdAt: new Date() });
      return id;
    }),
    incrementEventTeamCount: vi.fn().mockResolvedValue(undefined),
    decrementEventTeamCount: vi.fn().mockResolvedValue(undefined),
    getRegistrationsByUser: vi.fn().mockResolvedValue([]),
    getRegistrationById: vi.fn().mockImplementation(async (id: number) => {
      return mockRegistrations.find(r => r.id === id) ?? undefined;
    }),
    getRegistrationWithPlayers: vi.fn().mockResolvedValue(null),
    getPlayersByRegistration: vi.fn().mockResolvedValue([]),
    deletePlayersByRegistration: vi.fn().mockResolvedValue(undefined),
    updateRegistration: vi.fn().mockResolvedValue(undefined),
    getRegistrationsWithPlayers: vi.fn().mockResolvedValue([]),
    createTournament: vi.fn().mockResolvedValue(100),
    updateTournament: vi.fn().mockResolvedValue(undefined),
    deleteEventsByTournament: vi.fn().mockResolvedValue(undefined),
    createTournamentEvent: vi.fn().mockResolvedValue(1),
    deleteAgeGroupsByTournament: vi.fn().mockResolvedValue(undefined),
    createAgeGroup: vi.fn().mockResolvedValue(1),
    deletePoster: vi.fn().mockResolvedValue(undefined),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    getAllUsers: vi.fn().mockResolvedValue([]),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    getUserByPhone: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue(undefined),
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
    getKprRating: vi.fn().mockResolvedValue(null),
    initKprRating: vi.fn().mockResolvedValue(undefined),
    getKprLeaderboard: vi.fn().mockResolvedValue([]),
    getKprTotalParticipants: vi.fn().mockResolvedValue(0),
    getKprRank: vi.fn().mockResolvedValue(1),
    getRecentMatches: vi.fn().mockResolvedValue([]),
    createPoster: vi.fn().mockResolvedValue(1),
    createDocument: vi.fn().mockResolvedValue(1),
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.jpg", key: "test-key" }),
}));

vi.mock("./sms", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  verifyCode: vi.fn().mockImplementation(async (_phone: string, code: string) => {
    return { success: code === "123456" };
  }),
  normalizePhoneToDigits: vi.fn().mockImplementation((phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("82")) return `0${digits.slice(2)}`;
    return digits;
  }),
  sendSmsMessage: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  },
}));

// ─── Context helpers ────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 10,
    openId: "test-user-1",
    email: "user@test.com",
    name: "테스트유저",
    phone: "01012345678",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(role: "admin" | "organizer" | "super_admin" = "admin"): TrpcContext {
  return createUserContext({ id: 1, openId: "admin-1", name: "관리자", role });
}

// ─── Phase 36 Tests ─────────────────────────────────────

describe("Phase 36: 소속(affiliation) 필드 필수 검증", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registration.create requires affiliation for each player", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 1,
        isSelfParticipant: false,
        players: [
          { name: "홍길동", birthDate: "1990-01-01", phone: "01011112222", giftSize: "L" },
          { name: "김철수", birthDate: "1992-05-15", phone: "01033334444", giftSize: "XL" },
        ],
      })
    ).rejects.toThrow(); // Zod validation error - affiliation missing
  });

  it("registration.create succeeds with affiliation provided (doubles - 2 players)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.registration.create({
      tournamentId: 1,
      tournamentEventId: 1, // 남복 - doubles, needs 2 players
      isSelfParticipant: false,
      players: [
        { name: "홍길동", birthDate: "1990-01-01", phone: "01011112222", giftSize: "L", affiliation: "OO클럽" },
        { name: "김철수", birthDate: "1992-05-15", phone: "01033334444", giftSize: "XL", affiliation: "XX클럽" },
      ],
    });
    expect(result).toHaveProperty("registrationId");
    expect(result).toHaveProperty("registrationNumber");
  });

  it("registration.create passes affiliation to createPlayer (doubles)", async () => {
    const db = await import("./db");
    const caller = appRouter.createCaller(createUserContext());
    await caller.registration.create({
      tournamentId: 1,
      tournamentEventId: 1, // 남복 - doubles
      isSelfParticipant: false,
      players: [
        { name: "박선수", birthDate: "1995-03-20", phone: "01055556666", affiliation: "피클클럽" },
        { name: "이선수", birthDate: "1996-04-21", phone: "01077778888", affiliation: "피클클럽" },
      ],
    });
    expect(db.createPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ affiliation: "피클클럽" })
    );
  });
});

describe("Phase 36: 접수 관리 권한 (admin procedures)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin.tournamentRegistrations accessible by admin", async () => {
    const caller = appRouter.createCaller(createAdminContext("admin"));
    const result = await caller.admin.tournamentRegistrations({ tournamentId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin.tournamentRegistrations accessible by organizer", async () => {
    const caller = appRouter.createCaller(createAdminContext("organizer"));
    const result = await caller.admin.tournamentRegistrations({ tournamentId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin.tournamentRegistrations blocked for regular user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.tournamentRegistrations({ tournamentId: 1 })
    ).rejects.toThrow();
  });

  it("admin.updatePaymentStatus accessible by organizer", async () => {
    const db = await import("./db");
    // Create a registration first (doubles - 2 players)
    const userCaller = appRouter.createCaller(createUserContext());
    const reg = await userCaller.registration.create({
      tournamentId: 1,
      tournamentEventId: 1, // 남복 - doubles
      isSelfParticipant: false,
      players: [
        { name: "테스트", birthDate: "1990-01-01", phone: "01077778888", affiliation: "테스트클럽" },
        { name: "테스트2", birthDate: "1991-02-02", phone: "01088889999", affiliation: "테스트클럽" },
      ],
    });

    const adminCaller = appRouter.createCaller(createAdminContext("organizer"));
    const result = await adminCaller.admin.updatePaymentStatus({
      registrationId: reg.registrationId,
      paymentStatus: "paid",
    });
    expect(result.success).toBe(true);
  });

  it("admin.updateRegistrationStatus accessible by organizer", async () => {
    const userCaller = appRouter.createCaller(createUserContext());
    const reg = await userCaller.registration.create({
      tournamentId: 1,
      tournamentEventId: 1, // 남복 - doubles
      isSelfParticipant: false,
      players: [
        { name: "테스트2", birthDate: "1991-02-02", phone: "01099990000", affiliation: "ABC클럽" },
        { name: "테스트3", birthDate: "1992-03-03", phone: "01011110000", affiliation: "ABC클럽" },
      ],
    });

    const adminCaller = appRouter.createCaller(createAdminContext("organizer"));
    const result = await adminCaller.admin.updateRegistrationStatus({
      registrationId: reg.registrationId,
      status: "confirmed",
    });
    expect(result.success).toBe(true);
  });
});
