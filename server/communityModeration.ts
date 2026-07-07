import { TRPCError } from "@trpc/server";

const BLOCKED_CONTENT_PATTERNS = [
  /카지노/i,
  /도박/i,
  /불법\s*토토/i,
  /성인\s*광고/i,
  /스팸\s*광고/i,
] as const;

export function assertCommunityContentAllowed(
  ...values: readonly string[]
): void {
  const blocked = values.some(value =>
    BLOCKED_CONTENT_PATTERNS.some(pattern => pattern.test(value))
  );
  if (!blocked) return;

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "커뮤니티 이용약관에 따라 등록할 수 없는 내용이 포함되어 있습니다.",
  });
}
