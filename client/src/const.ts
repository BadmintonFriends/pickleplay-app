export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * 로그인 페이지 URL을 반환합니다.
 * @param returnPath - 로그인 후 돌아갈 경로 (기본: 현재 경로)
 */
export function getLoginUrl(returnPath?: string): string {
  const returnTo = returnPath || window.location.pathname + window.location.search;
  if (returnTo === "/" || returnTo === "/login" || returnTo === "/register") {
    return "/login";
  }
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * 회원가입 페이지 URL을 반환합니다.
 */
export function getRegisterUrl(): string {
  return "/register";
}
