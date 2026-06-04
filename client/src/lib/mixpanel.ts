import mixpanel from "mixpanel-browser";

const token = import.meta.env.VITE_APP_ENV === "production"
  ? import.meta.env.VITE_MIXPANEL_TOKEN_PROD
  : import.meta.env.VITE_MIXPANEL_TOKEN_DEV;

export function initMixpanel() {
  if (!token) return;
  mixpanel.init(token, {
    debug: !import.meta.env.PROD,
    track_pageview: false, // 수동으로 추적
    persistence: "localStorage",
  });
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!token) return;
  mixpanel.track(event, props);
}

export function identify(userId: number, props?: { name?: string | null; phone?: string | null; role?: string }) {
  if (!token) return;
  mixpanel.identify(String(userId));
  if (props) {
    mixpanel.people.set({
      ...(props.name && { $name: props.name }),
      ...(props.phone && { $phone: props.phone }),
      ...(props.role && { role: props.role }),
    });
  }
}

export function reset() {
  if (!token) return;
  mixpanel.reset();
}

// 경로 → 읽기 쉬운 페이지명 변환
export function getPageName(path: string): string {
  if (path === "/") return "홈";
  if (path === "/tournament") return "대회 목록";
  if (/^\/tournament\/\d+$/.test(path)) return "대회 상세";
  if (/^\/tournament\/\d+\/register$/.test(path)) return "대회 접수";
  if (/^\/tournament\/\d+\/register\/complete$/.test(path)) return "접수 완료";
  if (/^\/tournaments\/\d+\/bracket$/.test(path)) return "대진표";
  if (path === "/my-registrations") return "내 접수 내역";
  if (path === "/mypage") return "마이페이지";
  if (path === "/login") return "로그인";
  if (path === "/register") return "회원가입";
  if (path === "/social") return "커뮤니티";
  if (path === "/social/write") return "글쓰기";
  if (path === "/social/notifications") return "알림";
  if (/^\/social\/post\/\d+\/edit$/.test(path)) return "글 수정";
  if (/^\/social\/post\/\d+$/.test(path)) return "게시글 상세";
  if (path === "/courts") return "코트 찾기";
  if (path === "/shop") return "샵";
  if (path === "/terms") return "이용약관";
  if (path === "/privacy") return "개인정보처리방침";
  return path;
}
