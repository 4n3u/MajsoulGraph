export type SniperRecordPlayer = {
  accountId: number;
};

export type SniperRecord = {
  startTime: number;
  players: readonly SniperRecordPlayer[];
};

export type SniperMatch = {
  startTime: number;
  nearestDifferenceSeconds: number;
  metTargetTwo: boolean;
};

export type SniperAnalysisResult = {
  suspiciousCount: number;
  successfulCount: number;
  matches: SniperMatch[];
};

export function analyzeSniperRecords(
  targetOneRecords: readonly SniperRecord[],
  targetTwoRecords: readonly SniperRecord[],
  targetTwoAccountId: number,
  thresholdSeconds: number
): SniperAnalysisResult {
  const targetOneChronological = [...targetOneRecords].sort((left, right) => left.startTime - right.startTime);
  const targetTwoChronological = [...targetTwoRecords].sort((left, right) => left.startTime - right.startTime);
  const matches: SniperMatch[] = [];
  let targetTwoIndex = 0;

  for (const targetOneRecord of targetOneChronological) {
    while (
      targetTwoIndex + 1 < targetTwoChronological.length &&
      targetTwoChronological[targetTwoIndex + 1]!.startTime <= targetOneRecord.startTime
    ) {
      targetTwoIndex += 1;
    }

    const previous = targetTwoChronological[targetTwoIndex];
    const next = targetTwoChronological[targetTwoIndex + 1];
    const nearest =
      previous === undefined
        ? next
        : next === undefined ||
            Math.abs(targetOneRecord.startTime - previous.startTime) <=
              Math.abs(next.startTime - targetOneRecord.startTime)
          ? previous
          : next;

    if (nearest === undefined) continue;

    const nearestDifferenceSeconds = Math.abs(targetOneRecord.startTime - nearest.startTime);
    if (nearestDifferenceSeconds >= thresholdSeconds) continue;

    matches.push({
      startTime: targetOneRecord.startTime,
      nearestDifferenceSeconds,
      metTargetTwo: targetOneRecord.players.some((player) => player.accountId === targetTwoAccountId)
    });
  }

  return {
    suspiciousCount: matches.length,
    successfulCount: matches.filter((match) => match.metTargetTwo).length,
    matches
  };
}
