import { describe, expect, it } from "vitest";
import { findPotentialBracketConflicts } from "../client/src/lib/bracketConflictPotential";

describe("findPotentialBracketConflicts", () => {
  it("lists mixed qualifying matches that share a slot with possible men or women main players", () => {
    const conflicts = findPotentialBracketConflicts({
      events: [
        { id: 1, label: "남복 오픈부", matchDate: "2026-06-14" },
        { id: 2, label: "혼복 오픈부", matchDate: "2026-06-14" },
      ],
      groups: [
        {
          id: 101,
          tournamentEventId: 1,
          groupNumber: 1,
          teams: [
            { registrationId: 11, playerNames: "김철수, 이민호" },
            { registrationId: 12, playerNames: "박준호, 최태민" },
          ],
          matches: [],
        },
        {
          id: 201,
          tournamentEventId: 2,
          groupNumber: 1,
          teams: [
            { registrationId: 21, playerNames: "김철수, 한지민" },
            { registrationId: 22, playerNames: "오세훈, 정다은" },
          ],
          matches: [
            {
              id: 301,
              courtNumber: 2,
              timeStr: "15:00",
              team1Name: "혼복1",
              team1Players: "김철수, 한지민",
              team2Name: "혼복2",
              team2Players: "오세훈, 정다은",
              status: "scheduled",
            },
          ],
        },
      ],
      mainByEvent: [
        {
          eventId: 1,
          matches: [
            {
              id: 401,
              isBye: false,
              courtNumber: 1,
              timeStr: "15:00",
              team1Label: "1조 1위",
              team1Players: "",
              team2Label: "1조 2위",
              team2Players: "",
              status: "scheduled",
            },
          ],
        },
      ],
    });

    expect(conflicts).toEqual([
      expect.objectContaining({
        timeStr: "15:00",
        mixedMatchId: 301,
        mainMatchId: 401,
        mixedEventLabel: "혼복 오픈부",
        mainEventLabel: "남복 오픈부",
        overlappingPlayers: ["김철수"],
      }),
    ]);
  });
});
