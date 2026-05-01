import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db module ─────────────────────────────────────
vi.mock("./db", () => {
  const mockTournament = {
    id: 1,
    name: "리닝코리아 포항 전국 피클볼 대회",
    description: null,
    startDate: "2026-06-14",
    endDate: "2026-06-14",
    venue: "만인당실내체육관",
    address: "경북 포항시 남구 희망대로 814",
    organizerInfo: JSON.stringify({
      hosts: ["리닝코리아", "포항 전국 피클볼 조직 위원회"],
      sponsors: ["포항시 체육회", "대한피클볼 협회"],
    }),
    registrationStart: null,
    registrationEnd: null,
    feePerTeam: 50000,
    giftDescription: "참가기념 티셔츠",
    sizeType: "alpha" as const,
    sizeOptions: JSON.stringify(["XS", "S", "M", "L", "XL", "2XL", "3XL"]),
    sizeGuideImageUrl: "https://example.com/size-guide.png",
    sizeGuideFileKey: "tournaments/1/size-guide/test.png",
    hasAgeGroup: false,
    hasSingles: true,
    bankName: "국민은행",
    accountNumber: "123-456-789",
    accountHolder: "피클볼조직위",
    paymentNote: "입금자명: 대회명+이름",
    status: "open" as const,
    organizerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvents = [
    { id: 1, tournamentId: 1, eventType: "남복", skillLevel: "오픈부", maxTeams: 40, dayLabel: null, currentTeams: 5, createdAt: new Date() },
    { id: 2, tournamentId: 1, eventType: "여복", skillLevel: "오픈부", maxTeams: 40, dayLabel: null, currentTeams: 3, createdAt: new Date() },
    { id: 3, tournamentId: 1, eventType: "남단", skillLevel: "오픈부", maxTeams: 20, dayLabel: null, currentTeams: 10, createdAt: new Date() },
    { id: 4, tournamentId: 1, eventType: "여단", skillLevel: "오픈부", maxTeams: 20, dayLabel: null, currentTeams: 0, createdAt: new Date() },
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
      { tournamentEventId: 3, count: 10 },
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
    updateEventSortOrders: vi.fn().mockResolvedValue(undefined),
    deleteAgeGroupsByTournament: vi.fn().mockResolvedValue(undefined),
    createAgeGroup: vi.fn().mockResolvedValue(1),
    deletePoster: vi.fn().mockResolvedValue(undefined),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    getAllUsers: vi.fn().mockResolvedValue([
      { id: 1, openId: "owner-1", name: "관리자", email: "admin@test.com", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    ]),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    getUserByPhone: vi.fn().mockImplementation(async (phone: string) => {
      if (phone === "01012345678") return {
        id: 10, openId: "phone_01012345678", name: "테스트유저", phone: "01012345678",
        role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      };
      return undefined;
    }),
    getUserByOpenId: vi.fn().mockImplementation(async (openId: string) => {
      if (openId === "phone_01099998888") return {
        id: 20, openId: "phone_01099998888", name: "신규유저", phone: "01099998888",
        role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      };
      return undefined;
    }),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return {
        id: 1, openId: "owner-1", name: "관리자", phone: "01011112222",
        gender: "male", birthDate: "1990-01-01", role: "admin",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      };
      if (id === 10) return {
        id: 10, openId: "phone_01012345678", name: "테스트유저", phone: "01012345678",
        gender: "male", birthDate: "1995-05-15", role: "user",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      };
      return undefined;
    }),
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
    // KPR functions
    getKprRating: vi.fn().mockResolvedValue({
      id: 1, userId: 10, rating: 1000, ratingDelta: 0, totalMatches: 0, wins: 0, losses: 0,
      winStreak: 0, bestRating: 1000, weeklyRankDelta: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }),
    initKprRating: vi.fn().mockResolvedValue(undefined),
    getKprLeaderboard: vi.fn().mockResolvedValue([
      { userId: 10, rating: 1000, totalMatches: 0, wins: 0, losses: 0, winStreak: 0, userName: "테스트유저" },
    ]),
    getKprTotalParticipants: vi.fn().mockResolvedValue(2),
    getKprRank: vi.fn().mockResolvedValue(1),
    getRecentMatches: vi.fn().mockResolvedValue([]),
    // Phase 38: tournament_organizers
    getTournamentOrganizers: vi.fn().mockResolvedValue([]),
    isTournamentOrganizer: vi.fn().mockImplementation(async (tournamentId: number, userId: number) => {
      // user id=1 is organizer of tournament 1
      return tournamentId === 1 && userId === 1;
    }),
    addTournamentOrganizer: vi.fn().mockResolvedValue(undefined),
    removeTournamentOrganizer: vi.fn().mockResolvedValue(undefined),
    getUserManagedTournaments: vi.fn().mockImplementation(async (userId: number) => {
      // user id=1 manages tournament 1
      if (userId === 1) return [1];
      return [];
    }),
    searchUsers: vi.fn().mockResolvedValue([]),
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

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

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

function createAdminContext(role: "admin" | "super_admin" | "user" = "admin"): TrpcContext {
  return createUserContext({ id: 1, openId: "admin-1", name: "관리자", role });
}

// Phase 38: tournament_organizers에 등록된 일반 user context (id=1, tournament 1의 관리자)
function createTournamentManagerContext(): TrpcContext {
  return createUserContext({ id: 1, openId: "manager-1", name: "대회관리자", role: "user" });
}

// ─── Tournament Router Tests ────────────────────────────
describe("tournament router", () => {
  it("lists all tournaments (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.tournament.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("리닝코리아 포항 전국 피클볼 대회");
  });

  it("returns tournament detail with events (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.tournament.detail({ id: 1 });
    expect(result.name).toBe("리닝코리아 포항 전국 피클볼 대회");
    expect(result.events).toBeDefined();
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.venue).toBe("만인당실내체육관");
  });

  it("throws NOT_FOUND for nonexistent tournament", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.tournament.detail({ id: 9999 })).rejects.toThrow("대회를 찾을 수 없습니다");
  });

  it("returns registration status per event (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.tournament.registrationStatus({ tournamentId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const firstEvent = result[0];
    expect(firstEvent).toHaveProperty("eventId");
    expect(firstEvent).toHaveProperty("eventType");
    expect(firstEvent).toHaveProperty("maxTeams");
    expect(firstEvent).toHaveProperty("currentTeams");
    expect(firstEvent).toHaveProperty("isFull");
  });
});

// ─── Registration Router Tests ──────────────────────────
describe("registration router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated registration", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 1,
        isSelfParticipant: true,
        players: [
          { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678" },
          { name: "김철수", birthDate: "1991-02-02", phone: "01098765432" },
        ],
      })
    ).rejects.toThrow();
  });

  it("creates a doubles registration successfully", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.registration.create({
      tournamentId: 1,
      tournamentEventId: 1, // 남복 오픈부
      isSelfParticipant: true,
      players: [
        { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678", giftSize: "L", affiliation: "OO클럽" },
        { name: "김철수", birthDate: "1991-02-02", phone: "01098765432", giftSize: "XL", affiliation: "XX클럽" },
      ],
    });
    expect(result).toHaveProperty("registrationId");
    expect(result).toHaveProperty("registrationNumber");
    expect(result.paymentAmount).toBe(50000);
    expect(result.bankName).toBe("국민은행");
    expect(result.accountNumber).toBe("123-456-789");
  });

  it("creates a singles registration with 1 player", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.registration.create({
      tournamentId: 1,
      tournamentEventId: 3, // 남단 오픈부
      isSelfParticipant: true,
      players: [
        { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678", giftSize: "M", affiliation: "OO클럽" },
      ],
    });
    expect(result).toHaveProperty("registrationId");
    expect(result.registrationNumber).toBe("R001-0001");
  });

  it("rejects singles registration with 2 players", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 3, // 남단 오픈부
        isSelfParticipant: true,
        players: [
          { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678", affiliation: "A클럽" },
          { name: "김철수", birthDate: "1991-02-02", phone: "01098765432", affiliation: "B클럽" },
        ],
      })
    ).rejects.toThrow("단식 종목은 1명만 등록 가능합니다");
  });

  it("rejects doubles registration with 1 player", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 1, // 남복 오픈부
        isSelfParticipant: true,
        players: [
          { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678", affiliation: "A클럽" },
        ],
      })
    ).rejects.toThrow("복식 종목은 2명을 등록해야 합니다");
  });

  it("rejects registration with invalid gift size", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 1,
        isSelfParticipant: true,
        players: [
          { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678", giftSize: "XXXL", affiliation: "A클럽" },
          { name: "김철수", birthDate: "1991-02-02", phone: "01098765432", giftSize: "M", affiliation: "B클럽" },
        ],
      })
    ).rejects.toThrow("유효하지 않은 사이즈입니다");
  });

  it("rejects registration for nonexistent tournament", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.registration.create({
        tournamentId: 9999,
        tournamentEventId: 1,
        isSelfParticipant: true,
        players: [
          { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678", affiliation: "A클럽" },
          { name: "김철수", birthDate: "1991-02-02", phone: "01098765432", affiliation: "B클럽" },
        ],
      })
    ).rejects.toThrow("대회를 찾을 수 없습니다");
  });

  it("rejects registration for nonexistent event", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 9999,
        isSelfParticipant: true,
        players: [
          { name: "홍길동", birthDate: "1990-01-01", phone: "01012345678", affiliation: "A클럽" },
          { name: "김철수", birthDate: "1991-02-02", phone: "01098765432", affiliation: "B클럽" },
        ],
      })
    ).rejects.toThrow("종목을 찾을 수 없습니다");
  });

  it("returns empty my registrations for new user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.registration.myRegistrations();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("rejects myRegistrations for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.registration.myRegistrations()).rejects.toThrow();
  });

  it("validates player input schema", async () => {
    const caller = appRouter.createCaller(createUserContext());
    // Empty name should fail
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 1,
        isSelfParticipant: true,
        players: [
          { name: "", birthDate: "1990-01-01", phone: "01012345678" },
          { name: "김철수", birthDate: "1991-02-02", phone: "01098765432" },
        ],
      })
    ).rejects.toThrow();
  });

  it("validates birthDate format", async () => {
    const caller = appRouter.createCaller(createUserContext());
    // Invalid date format should fail
    await expect(
      caller.registration.create({
        tournamentId: 1,
        tournamentEventId: 1,
        isSelfParticipant: true,
        players: [
          { name: "홍길동", birthDate: "19900101", phone: "01012345678" },
          { name: "김철수", birthDate: "1991-02-02", phone: "01098765432" },
        ],
      })
    ).rejects.toThrow();
  });

  it("bulk creates registrations", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.registration.bulkCreate({
      tournamentId: 1,
      registrations: [
        {
          tournamentEventId: 1,
          isSelfParticipant: false,
          players: [
            { name: "선수A", birthDate: "1990-01-01", phone: "01011111111", giftSize: "S", affiliation: "A클럽" },
            { name: "선수B", birthDate: "1992-03-03", phone: "01022222222", giftSize: "M", affiliation: "A클럽" },
          ],
        },
        {
          tournamentEventId: 2,
          isSelfParticipant: false,
          players: [
            { name: "선수C", birthDate: "1993-04-04", phone: "01033333333", giftSize: "L", affiliation: "B클럽" },
            { name: "선수D", birthDate: "1994-05-05", phone: "01044444444", giftSize: "XL", affiliation: "B클럽" },
          ],
        },
      ],
    });
    expect(result.count).toBe(2);
    expect(result.registrations.length).toBe(2);
    expect(result.paymentAmount).toBe(100000); // 50000 * 2
    expect(result.bankName).toBe("국민은행");
  });
});

// ─── Admin Router Tests ─────────────────────────────────
describe("admin router", () => {
  it("rejects non-admin access to tournamentRegistrations", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.tournamentRegistrations({ tournamentId: 1 })
    ).rejects.toThrow();
  });

  it("allows admin to view tournament registrations", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.tournamentRegistrations({ tournamentId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows tournament manager (user in tournament_organizers) to view registrations", async () => {
    const caller = appRouter.createCaller(createTournamentManagerContext());
    const result = await caller.admin.tournamentRegistrations({ tournamentId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to update payment status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.updatePaymentStatus({
      registrationId: 1,
      paymentStatus: "paid",
    });
    expect(result.success).toBe(true);
  });

  it("allows admin to create tournament", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createTournament({
      name: "테스트 대회",
      startDate: "2026-07-01",
      endDate: "2026-07-01",
      venue: "테스트 체육관",
      address: "서울시 강남구",
      feePerTeam: 30000,
      status: "draft",
    });
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(100);
  });

  it("allows admin to update tournament", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.updateTournament({
      id: 1,
      data: { name: "수정된 대회명", status: "closed" },
    });
    expect(result.success).toBe(true);
  });

  it("allows admin to set events", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.setEvents({
      tournamentId: 1,
      events: [
        { eventType: "남복", skillLevel: "오픈부", maxTeams: 32 },
        { eventType: "여복", skillLevel: "오픈부", maxTeams: 24 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("allows admin to reorder events", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.reorderEvents({
      tournamentId: 1,
      eventIds: [2, 1],
    });
    expect(result.success).toBe(true);
    const db = await import("./db");
    expect(db.updateEventSortOrders).toHaveBeenCalledWith([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ]);
  });

  it("rejects non-admin from reordering events", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.reorderEvents({ tournamentId: 1, eventIds: [2, 1] })
    ).rejects.toThrow();
  });

  it("allows admin to set age groups", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.setAgeGroups({
      tournamentId: 1,
      ageGroups: [
        { code: "2026", label: "20~26세", minAge: 20, maxAge: 26 },
        { code: "2733", label: "27~33세", minAge: 27, maxAge: 33 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin from creating tournament", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.createTournament({
        name: "테스트",
        startDate: "2026-07-01",
        endDate: "2026-07-01",
        venue: "테스트",
        address: "테스트",
      })
    ).rejects.toThrow();
  });

  it("rejects non-super_admin from listing users", async () => {
    // tournament manager (user role) should not be able to list users (superAdminProcedure)
    const caller = appRouter.createCaller(createTournamentManagerContext());
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });

  it("allows super_admin to list users", async () => {
    const caller = appRouter.createCaller(createAdminContext("super_admin"));
    const result = await caller.admin.listUsers();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("rejects admin from listing users (only super_admin allowed)", async () => {
    const caller = appRouter.createCaller(createAdminContext("admin"));
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });

  it("allows super_admin to update user role", async () => {
    const caller = appRouter.createCaller(createAdminContext("super_admin"));
    const result = await caller.admin.updateUserRole({
      userId: 10,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Auth Router Tests ─────────// ─── Auth Router Tests ──────────────────────
describe("auth router", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user info for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("테스트유저");
    expect(result?.role).toBe("user");
  });
});

// ─── SMS Auth Router Tests ──────────────────
describe("smsAuth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends verification code successfully", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.smsAuth.sendCode({ phone: "01012345678" });
    expect(result.success).toBe(true);
    expect(result.isExistingUser).toBe(true);
  });

  it("sends code for new phone number (not existing user)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.smsAuth.sendCode({ phone: "01099998888" });
    expect(result.success).toBe(true);
    expect(result.isExistingUser).toBe(false);
  });

  it("handles phone with dashes", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.smsAuth.sendCode({ phone: "010-1234-5678" });
    expect(result.success).toBe(true);
  });

  it("logs in existing user with correct code", async () => {
    const ctx = {
      ...createPublicContext(),
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.smsAuth.login({ phone: "01012345678", code: "123456" });
    expect(result.success).toBe(true);
    expect(result.user.name).toBe("테스트유저");
    expect(ctx.res.cookie).toHaveBeenCalled();
  });

  it("rejects login with wrong code", async () => {
    const ctx = {
      ...createPublicContext(),
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.smsAuth.login({ phone: "01012345678", code: "999999" })).rejects.toThrow("인증번호가 올바르지 않습니다");
  });

  it("rejects login for unregistered phone", async () => {
    const ctx = {
      ...createPublicContext(),
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.smsAuth.login({ phone: "01099998888", code: "123456" })).rejects.toThrow("가입되지 않은");
  });

  it("registers new user with correct code", async () => {
    const ctx = {
      ...createPublicContext(),
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.smsAuth.register({
      phone: "01099998888",
      code: "123456",
      name: "신규유저",
      gender: "male",
      birthDate: "1990-01-01",
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(result.success).toBe(true);
    expect(result.user.name).toBe("신규유저");
    expect(ctx.res.cookie).toHaveBeenCalled();
  });

  it("rejects registration with wrong code", async () => {
    const ctx = {
      ...createPublicContext(),
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.smsAuth.register({
      phone: "01099998888",
      code: "000000",
      name: "신규",
      gender: "female",
      birthDate: "1995-06-15",
      termsAccepted: true,
      privacyAccepted: true,
    })).rejects.toThrow("인증번호가 올바르지 않습니다");
  });

  it("rejects registration for already registered phone", async () => {
    const ctx = {
      ...createPublicContext(),
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.smsAuth.register({
      phone: "01012345678",
      code: "123456",
      name: "중복",
      gender: "male",
      birthDate: "1990-01-01",
      termsAccepted: true,
      privacyAccepted: true,
    })).rejects.toThrow("이미 가입된");
  });

  it("rejects registration without terms acceptance", async () => {
    const ctx = {
      ...createPublicContext(),
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.smsAuth.register({
      phone: "01099998888",
      code: "123456",
      name: "신규",
      gender: "male",
      birthDate: "1990-01-01",
      termsAccepted: false,
      privacyAccepted: true,
    })).rejects.toThrow();
  });
});
// ─── User Router Tests ─────────────────────────────────
describe("user router", () => {
  const userCtx: TrpcContext = {
    user: { id: 10, name: "테스트유저", role: "user", openId: "phone_01012345678" },
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
    req: {} as any,
  };

  const adminCtx: TrpcContext = {
    user: { id: 1, name: "관리자", role: "admin", openId: "owner-1" },
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
    req: {} as any,
  };

  const anonCtx: TrpcContext = {
    user: null,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
    req: {} as any,
  };

  const caller = appRouter.createCaller;

  it("profile - 인증된 사용자의 프로필을 반환한다", async () => {
    const result = await caller(userCtx).user.profile();
    expect(result).toBeDefined();
    expect(result.id).toBe(10);
    expect(result.name).toBe("테스트유저");
    expect(result.phone).toBe("01012345678");
    expect(result.gender).toBe("male");
    expect(result.birthDate).toBe("1995-05-15");
  });

  it("profile - 비인증 사용자는 에러를 반환한다", async () => {
    await expect(caller(anonCtx).user.profile()).rejects.toThrow();
  });

  it("updateProfile - 이름을 수정할 수 있다", async () => {
    const result = await caller(userCtx).user.updateProfile({ name: "새이름" });
    expect(result.success).toBe(true);
  });

  it("updateProfile - 성별을 수정할 수 있다", async () => {
    const result = await caller(userCtx).user.updateProfile({ gender: "female" });
    expect(result.success).toBe(true);
  });

  it("updateProfile - 생년월일을 수정할 수 있다", async () => {
    const result = await caller(userCtx).user.updateProfile({ birthDate: "2000-12-25" });
    expect(result.success).toBe(true);
  });

  it("updateProfile - 잘못된 생년월일 형식은 에러를 반환한다", async () => {
    await expect(
      caller(userCtx).user.updateProfile({ birthDate: "20001225" })
    ).rejects.toThrow();
  });

  it("updateProfile - 비인증 사용자는 에러를 반환한다", async () => {
    await expect(
      caller(anonCtx).user.updateProfile({ name: "해커" })
    ).rejects.toThrow();
  });

  it("profile - 관리자도 프로필을 조회할 수 있다", async () => {
    const result = await caller(adminCtx).user.profile();
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.role).toBe("admin");
  });
});


// ─── KPR Router Tests ──────────────────────────────────
describe("kpr router", () => {
  const caller = appRouter.createCaller;

  const userCtx = {
    user: {
      id: 10, openId: "test-user-1", email: "user@test.com", name: "테스트유저",
      phone: "01012345678", loginMethod: "manus" as const, role: "user" as const,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };

  const anonCtx = {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };

  it("myDashboard - 로그인 사용자의 KPR 대시보드를 반환한다", async () => {
    const result = await caller(userCtx).kpr.myDashboard();
    expect(result).toBeDefined();
    expect(result.rating).toBe(1000);
    expect(result.isUnranked).toBe(true); // totalMatches === 0
    expect(result.rank).toBe(0); // Unranked이므로 0
    expect(result.totalParticipants).toBe(2);
    expect(result.winRate).toBe(0);
    expect(typeof result.ratingDelta).toBe("number");
    expect(typeof result.bestRating).toBe("number");
    expect(result.bestRating).toBe(1000);
    expect(Array.isArray(result.recentMatches)).toBe(true);
  });

  it("myDashboard - 비인증 사용자는 에러를 반환한다", async () => {
    await expect(caller(anonCtx).kpr.myDashboard()).rejects.toThrow();
  });

  it("leaderboard - 대회 전적 없는 사용자는 리더보드에 표시되지 않는다", async () => {
    const result = await caller(anonCtx).kpr.leaderboard();
    expect(Array.isArray(result)).toBe(true);
    // mock에서 totalMatches: 0이므로 필터링됨
    expect(result.length).toBe(0);
  });

  it("leaderboard - limit 파라미터를 지원한다", async () => {
    const result = await caller(anonCtx).kpr.leaderboard({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats - 공개 통계를 반환한다", async () => {
    const result = await caller(anonCtx).kpr.stats();
    expect(result.totalParticipants).toBe(2);
  });
});
