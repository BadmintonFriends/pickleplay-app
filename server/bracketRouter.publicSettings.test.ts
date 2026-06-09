import { beforeEach, describe, expect, it, vi } from "vitest";
import { bracketRouter } from "./bracketRouter";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getTournamentById: vi.fn(),
  getEventsByTournament: vi.fn(),
  getPlayersByRegistration: vi.fn(),
}));

vi.mock("./bracketDb", () => ({
  getBracketSettings: vi.fn(),
  getBracketGroups: vi.fn(),
  getBracketGroupTeamsByGroupIds: vi.fn(),
  getBracketMatches: vi.fn(),
}));

const db = await import("./db");
const bdb = await import("./bracketDb");

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("bracket public settings display data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getTournamentById).mockResolvedValue({
      id: 1,
      name: "테스트 대회",
      status: "bracket_published",
    } as any);
    vi.mocked(db.getEventsByTournament).mockResolvedValue([
      {
        id: 10,
        tournamentId: 1,
        eventType: "남복",
        skillLevel: "오픈부",
      },
    ] as any);
    vi.mocked(db.getPlayersByRegistration).mockResolvedValue([]);
    vi.mocked(bdb.getBracketGroups).mockResolvedValue([]);
    vi.mocked(bdb.getBracketGroupTeamsByGroupIds).mockResolvedValue([]);
  });

  it("includes actual bracket settings summary for public event selection", async () => {
    vi.mocked(bdb.getBracketSettings).mockResolvedValue([
      {
        id: 1,
        tournamentId: 1,
        tournamentEventId: 10,
        qualifyingScore: 15,
        mainScore: 21,
        deuceEnabled: true,
        deuceMaxScore: 25,
        advanceCount: 1,
        hasThirdPlace: false,
        eventOrder: 0,
        matchDate: "2026-06-14",
        status: "qualifying",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);
    vi.mocked(bdb.getBracketGroups).mockResolvedValue([
      {
        id: 201,
        tournamentId: 1,
        tournamentEventId: 10,
        groupNumber: 1,
      },
      {
        id: 202,
        tournamentId: 1,
        tournamentEventId: 10,
        groupNumber: 2,
      },
    ] as any);
    vi.mocked(bdb.getBracketGroupTeamsByGroupIds).mockResolvedValue([
      { id: 1, groupId: 201, registrationId: 1001, finalRank: null },
      { id: 2, groupId: 201, registrationId: 1002, finalRank: null },
      { id: 3, groupId: 201, registrationId: 1003, finalRank: null },
      { id: 4, groupId: 202, registrationId: 1004, finalRank: null },
      { id: 5, groupId: 202, registrationId: 1005, finalRank: null },
      { id: 6, groupId: 202, registrationId: 1006, finalRank: null },
    ] as any);
    vi.mocked(bdb.getBracketMatches).mockResolvedValue([
      {
        id: 100,
        tournamentId: 1,
        tournamentEventId: 10,
        phase: "qualifying",
        roundNumber: 1,
        matchNumber: 1,
        groupId: null,
        team1Id: null,
        team2Id: null,
        team1Score: null,
        team2Score: null,
        winnerId: null,
        isBye: false,
        courtNumber: 1,
        scheduledAt: new Date("2026-06-14T00:00:00.000Z"),
        slotOrder: 1,
        status: "scheduled",
      },
      {
        id: 101,
        tournamentId: 1,
        tournamentEventId: 10,
        phase: "main",
        roundNumber: 1,
        matchNumber: 1,
        groupId: null,
        team1Id: null,
        team2Id: null,
        team1Score: null,
        team2Score: null,
        winnerId: null,
        isBye: false,
        courtNumber: 3,
        scheduledAt: new Date("2026-06-14T00:30:00.000Z"),
        slotOrder: 1,
        status: "scheduled",
      },
    ] as any);

    const caller = bracketRouter.createCaller(createPublicContext());
    const result = await caller.getPublicBracket({ tournamentId: 1 });

    expect(result.events[0].actualSettings).toEqual({
      matchDate: "2026-06-14",
      courtCount: 2,
      courtNumbers: [1, 3],
      qualifyingScore: 15,
      mainScore: 21,
      deuceEnabled: true,
      deuceMaxScore: 25,
      advanceCount: 1,
      teamCount: 6,
      mainAdvanceTeamCount: 2,
    });
  });
});
