import { describe, expect, it } from "vitest";
import {
  calculateQualifyingGroupSizes,
  computeStandings,
  isEffectivelyCompleted,
  isGroupComplete,
  planGroupAdvancement,
  type MainMatchForAdvancement,
} from "./bracketLogic";

const baseMainMatch = (
  overrides: Partial<MainMatchForAdvancement>
): MainMatchForAdvancement => ({
  id: 1,
  isBye: false,
  team1SourceType: null,
  team1SourceGroupId: null,
  team1SourceRank: null,
  team2SourceType: null,
  team2SourceGroupId: null,
  team2SourceRank: null,
  nextMatchId: null,
  nextMatchPosition: null,
  ...overrides,
});

describe("qualifying group size logic", () => {
  it("상황: 4팀을 우선하되 2팀 조가 생기면 만들지 않는다", () => {
    expect(calculateQualifyingGroupSizes(4)).toEqual({
      numGroups: 1,
      groupSizes: [4],
    });
    expect(calculateQualifyingGroupSizes(5)).toEqual({
      numGroups: 1,
      groupSizes: [5],
    });
    expect(calculateQualifyingGroupSizes(6)).toEqual({
      numGroups: 2,
      groupSizes: [3, 3],
    });
    expect(calculateQualifyingGroupSizes(7)).toEqual({
      numGroups: 2,
      groupSizes: [4, 3],
    });
  });

  it("상황: 8팀 이상은 3팀 또는 4팀 조만 사용해서 최대한 4팀 조로 묶는다", () => {
    expect(calculateQualifyingGroupSizes(8).groupSizes).toEqual([4, 4]);
    expect(calculateQualifyingGroupSizes(9).groupSizes).toEqual([3, 3, 3]);
    expect(calculateQualifyingGroupSizes(10).groupSizes).toEqual([4, 3, 3]);
    expect(calculateQualifyingGroupSizes(11).groupSizes).toEqual([4, 4, 3]);
    expect(calculateQualifyingGroupSizes(12).groupSizes).toEqual([4, 4, 4]);
  });
});

describe("bracket advancement logic", () => {
  it("상황: 조별 예선 경기가 하나라도 미완료이면 본선 진출 계산을 시작하지 않는다", () => {
    expect(
      isGroupComplete([{ status: "completed" }, { status: "scheduled" }])
    ).toBe(false);
  });

  it("상황: advanceCount=1이면 각 조 1위만 해당 group_rank 본선 슬롯에 들어간다", () => {
    const plan = planGroupAdvancement({
      groupId: 10,
      groupTeams: [
        { id: 1, registrationId: 101 },
        { id: 2, registrationId: 102 },
        { id: 3, registrationId: 103 },
      ],
      standings: [
        { registrationId: 101 },
        { registrationId: 102 },
        { registrationId: 103 },
      ],
      advanceCount: 1,
      mainMatches: [
        baseMainMatch({
          id: 1001,
          team1SourceType: "group_rank",
          team1SourceGroupId: 10,
          team1SourceRank: 1,
        }),
        baseMainMatch({
          id: 1002,
          team2SourceType: "group_rank",
          team2SourceGroupId: 20,
          team2SourceRank: 1,
        }),
      ],
    });

    expect(plan.rankUpdates).toEqual([
      { groupTeamId: 1, finalRank: 1 },
      { groupTeamId: 2, finalRank: 2 },
      { groupTeamId: 3, finalRank: 3 },
    ]);
    expect(plan.matchUpdates).toEqual([
      { matchId: 1001, patch: { team1Id: 101 } },
    ]);
  });

  it("상황: advanceCount=2이면 각 조 1위와 2위가 각각 sourceRank 1, 2 슬롯에 들어간다", () => {
    const plan = planGroupAdvancement({
      groupId: 10,
      groupTeams: [
        { id: 1, registrationId: 101 },
        { id: 2, registrationId: 102 },
        { id: 3, registrationId: 103 },
      ],
      standings: [
        { registrationId: 101 },
        { registrationId: 102 },
        { registrationId: 103 },
      ],
      advanceCount: 2,
      mainMatches: [
        baseMainMatch({
          id: 1001,
          team1SourceType: "group_rank",
          team1SourceGroupId: 10,
          team1SourceRank: 1,
        }),
        baseMainMatch({
          id: 1002,
          team2SourceType: "group_rank",
          team2SourceGroupId: 10,
          team2SourceRank: 2,
        }),
      ],
    });

    expect(plan.matchUpdates).toEqual([
      { matchId: 1001, patch: { team1Id: 101 } },
      { matchId: 1002, patch: { team2Id: 102 } },
    ]);
  });

  it("상황: 진출 팀의 본선 첫 경기가 부전승이면 해당 경기 완료와 다음 라운드 슬롯 배정까지 계획한다", () => {
    const plan = planGroupAdvancement({
      groupId: 10,
      groupTeams: [{ id: 1, registrationId: 101 }],
      standings: [{ registrationId: 101 }],
      advanceCount: 1,
      mainMatches: [
        baseMainMatch({
          id: 1001,
          isBye: true,
          team1SourceType: "group_rank",
          team1SourceGroupId: 10,
          team1SourceRank: 1,
          nextMatchId: 2001,
          nextMatchPosition: 2,
        }),
      ],
    });

    expect(plan.matchUpdates).toEqual([
      { matchId: 1001, patch: { team1Id: 101 } },
      { matchId: 1001, patch: { winnerId: 101, status: "completed" } },
      { matchId: 2001, patch: { team2Id: 101 } },
    ]);
  });

  it("상황: 3팀이 서로 1승 1패로 물리면 승수와 H2H 다음 기준인 득실차로 순위를 정한다", () => {
    const standings = computeStandings(
      [1, 2, 3],
      [
        {
          team1Id: 1,
          team2Id: 2,
          team1Score: 15,
          team2Score: 10,
          status: "completed",
        },
        {
          team1Id: 2,
          team2Id: 3,
          team1Score: 15,
          team2Score: 10,
          status: "completed",
        },
        {
          team1Id: 3,
          team2Id: 1,
          team1Score: 15,
          team2Score: 5,
          status: "completed",
        },
      ],
      new Map([
        [1, 3980],
        [2, 3980],
        [3, 3980],
      ])
    );

    expect(standings.map(s => s.registrationId)).toEqual([3, 2, 1]);
  });

  it("상황: 승수, H2H, 득실차가 같으면 다득점으로 순위를 정한다", () => {
    const standings = computeStandings(
      [1, 2, 3],
      [
        {
          team1Id: 1,
          team2Id: 2,
          team1Score: 21,
          team2Score: 10,
          status: "completed",
        },
        {
          team1Id: 2,
          team2Id: 3,
          team1Score: 20,
          team2Score: 9,
          status: "completed",
        },
        {
          team1Id: 3,
          team2Id: 1,
          team1Score: 11,
          team2Score: 0,
          status: "completed",
        },
      ],
      new Map([
        [1, 3980],
        [2, 3980],
        [3, 3980],
      ])
    );

    expect(standings.map(s => s.registrationId)).toEqual([2, 1, 3]);
  });

  it("상황: 다득점까지 같으면 birthYear 합이 작은, 더 나이가 많은 팀을 우선한다", () => {
    const standings = computeStandings(
      [1, 2, 3],
      [
        {
          team1Id: 1,
          team2Id: 2,
          team1Score: 15,
          team2Score: 14,
          status: "completed",
        },
        {
          team1Id: 2,
          team2Id: 3,
          team1Score: 15,
          team2Score: 14,
          status: "completed",
        },
        {
          team1Id: 3,
          team2Id: 1,
          team1Score: 15,
          team2Score: 14,
          status: "completed",
        },
      ],
      new Map([
        [1, 3980],
        [2, 3970],
        [3, 3990],
      ])
    );

    expect(standings.map(s => s.registrationId)).toEqual([2, 1, 3]);
  });

  it("상황: 예선 결과 수정으로 순위가 바뀌면 같은 본선 슬롯에 새 진출 팀을 다시 계획한다", () => {
    const mainMatches = [
      baseMainMatch({
        id: 1001,
        team1SourceType: "group_rank",
        team1SourceGroupId: 10,
        team1SourceRank: 1,
      }),
      baseMainMatch({
        id: 1002,
        team2SourceType: "group_rank",
        team2SourceGroupId: 10,
        team2SourceRank: 2,
      }),
    ];

    const firstPlan = planGroupAdvancement({
      groupId: 10,
      groupTeams: [
        { id: 1, registrationId: 101 },
        { id: 2, registrationId: 102 },
        { id: 3, registrationId: 103 },
      ],
      standings: [
        { registrationId: 101 },
        { registrationId: 102 },
        { registrationId: 103 },
      ],
      advanceCount: 2,
      mainMatches,
    });
    const changedPlan = planGroupAdvancement({
      groupId: 10,
      groupTeams: [
        { id: 1, registrationId: 101 },
        { id: 2, registrationId: 102 },
        { id: 3, registrationId: 103 },
      ],
      standings: [
        { registrationId: 103 },
        { registrationId: 101 },
        { registrationId: 102 },
      ],
      advanceCount: 2,
      mainMatches,
    });

    expect(firstPlan.matchUpdates).toEqual([
      { matchId: 1001, patch: { team1Id: 101 } },
      { matchId: 1002, patch: { team2Id: 102 } },
    ]);
    expect(changedPlan.matchUpdates).toEqual([
      { matchId: 1001, patch: { team1Id: 103 } },
      { matchId: 1002, patch: { team2Id: 101 } },
    ]);
  });

  it("상황: 승수가 같은 두 팀은 H2H(직접 대결) 결과로 순위를 정한다", () => {
    // 4팀: 팀1·팀3이 2W 1L 동률. 팀3이 팀1을 직접 이겼으므로 H2H로 팀3 > 팀1
    // 팀2·팀4도 1W 2L 동률. 팀4가 팀2를 직접 이겼으므로 H2H로 팀4 > 팀2
    const standings = computeStandings(
      [1, 2, 3, 4],
      [
        { team1Id: 1, team2Id: 2, team1Score: 15, team2Score: 10, status: "completed" }, // 1 beats 2
        { team1Id: 3, team2Id: 1, team1Score: 15, team2Score: 10, status: "completed" }, // 3 beats 1 (H2H)
        { team1Id: 1, team2Id: 4, team1Score: 15, team2Score: 10, status: "completed" }, // 1 beats 4
        { team1Id: 2, team2Id: 3, team1Score: 15, team2Score: 10, status: "completed" }, // 2 beats 3
        { team1Id: 4, team2Id: 2, team1Score: 15, team2Score: 10, status: "completed" }, // 4 beats 2 (H2H)
        { team1Id: 3, team2Id: 4, team1Score: 15, team2Score: 10, status: "completed" }, // 3 beats 4
      ],
      new Map([[1, 3980], [2, 3980], [3, 3980], [4, 3980]])
    );

    expect(standings.map((s) => s.registrationId)).toEqual([3, 1, 4, 2]);
  });

  it("상황: 상위 라운드 경기가 완료된 경우 하위 라운드 결과 변경이 차단되어야 함을 감지한다", () => {
    const allMatches = [
      { id: 1, isBye: false, status: "completed", nextMatchId: 2 }, // 하위 경기
      { id: 2, isBye: false, status: "completed", nextMatchId: null }, // 상위 경기 (완료)
    ];
    expect(isEffectivelyCompleted(2, allMatches)).toBe(true);

    const pendingMatches = [
      { id: 1, isBye: false, status: "completed", nextMatchId: 2 },
      { id: 2, isBye: false, status: "scheduled", nextMatchId: null },
    ];
    expect(isEffectivelyCompleted(2, pendingMatches)).toBe(false);
  });

  it("상황: 부전승 너머 실제 완료된 상위 경기가 있으면 변경 차단을 감지한다", () => {
    const allMatches = [
      { id: 1, isBye: false, status: "completed", nextMatchId: 2 }, // 하위 경기
      { id: 2, isBye: true, status: "completed", nextMatchId: 3 }, // 부전승 (건너뜀)
      { id: 3, isBye: false, status: "completed", nextMatchId: null }, // 실제 상위 경기 완료
    ];
    expect(isEffectivelyCompleted(2, allMatches)).toBe(true);

    const pendingMatches = [
      { id: 1, isBye: false, status: "completed", nextMatchId: 2 },
      { id: 2, isBye: true, status: "completed", nextMatchId: 3 },
      { id: 3, isBye: false, status: "scheduled", nextMatchId: null },
    ];
    expect(isEffectivelyCompleted(2, pendingMatches)).toBe(false);
  });
});
