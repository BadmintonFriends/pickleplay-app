/** 경기의 목표 점수를 반환합니다.
 *  - 예선: qualifyingScore
 *  - 본선 준결승·결승·3·4위전: mainFinalsScore ?? mainScore
 *  - 본선 나머지: mainScore
 */
export function getTargetScore(
  match: { phase: string; roundNumber: number; matchNumber: number },
  settings: {
    qualifyingScore: number;
    mainScore: number;
    mainFinalsScore?: number | null;
    totalMainRounds?: number | null;
  }
): number {
  if (match.phase === "qualifying") return settings.qualifyingScore;

  const { mainFinalsScore, totalMainRounds } = settings;
  if (mainFinalsScore != null && totalMainRounds != null && totalMainRounds >= 2) {
    const isFinals =
      match.matchNumber === 0 ||                          // 3·4위전
      match.roundNumber >= totalMainRounds - 1;           // 준결승(마지막-1) + 결승(마지막)
    if (isFinals) return mainFinalsScore;
  }

  return settings.mainScore;
}
