/** 경기의 목표 점수를 반환합니다.
 *
 * mainFinalsScore 적용 범위 (finalsFromRound):
 *   null → 전체 본선
 *   0    → 결승 + 3·4위전
 *   1    → 준결승(4강) 이상
 *   2    → 8강 이상
 *   ...  (숫자가 클수록 더 넓은 범위)
 *
 * mainFinalsScore가 null이면 항상 mainScore 사용 (기능 비활성화).
 * totalMainRounds가 null이면 결승권 판단 불가 → mainScore fallback.
 */
export function getTargetScore(
  match: { phase: string; roundNumber: number; matchNumber: number },
  settings: {
    qualifyingScore: number;
    mainScore: number;
    mainFinalsScore?: number | null;
    finalsFromRound?: number | null;
    totalMainRounds?: number | null;
  }
): number {
  if (match.phase === "qualifying") return settings.qualifyingScore;

  const { mainFinalsScore, finalsFromRound, totalMainRounds } = settings;

  if (mainFinalsScore != null && totalMainRounds != null) {
    const isFinals =
      match.matchNumber === 0 ||              // 3·4위전 (항상 포함)
      finalsFromRound === null ||             // 전체 본선
      match.roundNumber >= totalMainRounds - finalsFromRound;
    if (isFinals) return mainFinalsScore;
  }

  return settings.mainScore;
}
