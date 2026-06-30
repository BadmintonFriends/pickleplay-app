# PicklePlay Flutter iOS/Android 전환 고려사항

작성일: 2026-06-30  
대상: 현재 `pickleplay-app` 웹/서버 앱을 iOS/Android Flutter 앱으로 배포하는 경우

## 1. 결론

출시 목적만 빠르게 보면 **Flutter WebView 셸**이 가장 작다. 현재 앱이 이미 모바일 폭 `480px` 기준 UI, 하단 탭, 심판 PIN, 대회 접수, 대진표, 커뮤니티까지 웹에서 동작하므로 앱 껍데기만 씌우면 초기 비용은 낮다.

다만 App Store/Play Store 제출까지 생각하면 단순 웹사이트 포장만으로는 리젝 리스크가 있다. Flutter 앱으로 가치를 만들려면 최소한 다음 중 일부는 네이티브로 가져가야 한다.

- 푸시 알림
- 앱 딥링크/유니버설 링크/앱 링크
- 로그인 세션 안정화
- 파일 다운로드/공유
- 심판용 빠른 경기 입력 UX
- 오프라인/약한 네트워크 대응
- 스토어용 개인정보/계정 삭제/UGC 신고 흐름

권장 순서는 **1차 WebView 셸 + 네이티브 기능 최소 추가**, 이후 핵심 화면부터 Flutter 네이티브 재작성이다.

## 2. 현재 앱 기준 사실

현재 앱은 React/Vite 클라이언트와 Express/tRPC 서버가 한 repo에 있다.

| 영역 | 현재 상태 | Flutter 영향 |
| --- | --- | --- |
| 클라이언트 | `client/src` React, `wouter`, `@tanstack/react-query`, `@trpc/react-query` | 네이티브 Flutter로 재작성 시 화면/상태/라우팅 전부 새로 작성 |
| API | `/api/trpc` tRPC + `superjson`; 파일 다운로드용 `/api/tournaments/:id/bracket/export` REST | Dart에서 tRPC 타입을 직접 재사용할 수 없음 |
| 인증 | `app_session_id` httpOnly cookie JWT, `credentials: "include"` | WebView는 쿠키 기반 유지 가능. 네이티브 HTTP는 쿠키 저장/전송 구현 필요 |
| 권한 | `protectedProcedure`, `adminProcedure`, `superAdminProcedure`, 대회 관리자 소유권 체크 | Flutter 앱도 서버 권한 모델을 그대로 따라야 함 |
| 핵심 route | `/`, `/tournament`, `/tournament/:id`, `/tournament/:id/register`, `/tournament/:id/manage`, `/tournaments/:id/bracket`, `/tournament/:id/referee/*`, `/social/*`, `/mypage` | 딥링크 매핑 필요 |
| 심판 흐름 | 로그인 세션 + `sessionStorage`의 `referee_<id>`, `referee_pin_<id>` | WebView는 유지 가능. 네이티브는 secure storage로 옮겨야 함 |
| 디자인 | `client/src/index.css`, `AppLayout`, `BusinessFooter`, event color helper | Flutter ThemeData로 토큰 변환 필요 |
| 배포 | EB/Docker, dev/prod compose, Vite build-time env와 server runtime env 분리 | 모바일 앱은 API base URL/env flavor를 별도로 관리 |
| 분석 | Mixpanel, `VITE_APP_ENV` 기준 dev/prod token 선택 | Flutter용 Mixpanel SDK와 이벤트명 재정의 필요 |

## 3. 선택지

### A. Flutter WebView 셸

**내용**

- Flutter 앱은 `webview_flutter`로 `https://피클플레이.com` 또는 dev/prod URL을 연다.
- 기존 React 앱과 `/api/trpc`는 거의 그대로 둔다.
- Flutter는 앱 시작, 네이티브 딥링크, 푸시, 파일 다운로드, 외부 브라우저 열기, 스플래시 정도만 담당한다.

**장점**

- 가장 빠르다.
- tRPC, cookie auth, React 화면, 기존 QA 자산을 대부분 유지한다.
- 심판/대회 운영처럼 현장 사용 흐름을 빠르게 앱으로 배포할 수 있다.

**단점**

- 단순 웹 포장으로 보이면 App Store 4.2 최소 기능성 리스크가 있다.
- WebView 쿠키, 파일 다운로드, 카메라/사진 권한, 뒤로가기, 푸시 이동은 플랫폼별로 따로 잡아야 한다.
- 앱스토어 스크린샷/메타데이터가 실제 앱 경험과 맞아야 한다.

**최소 네이티브 기능**

- Universal Links/App Links: 대회 상세, 대진표, 심판, 커뮤니티 글 링크를 앱으로 열기.
- Push: 대회 공지, 접수/입금 상태, 심판 코트 배정, 커뮤니티 알림.
- 파일 처리: 대진표 XLSX, 공문 PDF 다운로드/공유.
- 네트워크 에러 화면: 서버 점검/오프라인/세션 만료를 앱 단에서 분리.
- 앱 버전/환경 표시: dev/prod 혼동 방지.

### B. Flutter 네이티브 앱

**내용**

- React 화면을 Flutter 위젯으로 재작성한다.
- 서버는 유지하되 Flutter 전용 API 계층을 둔다.
- 대회/접수/심판/커뮤니티 화면을 Dart 모델과 state management로 구현한다.

**권장 API 방식**

tRPC를 Dart에서 그대로 흉내 내지 말고, 서버에 얇은 `/api/mobile/*` REST/JSON façade를 추가한다. tRPC는 TypeScript 클라이언트와 결합이 강하고, 현재 `superjson`/batch link/React Query 흐름에 맞춰져 있다. Flutter에서 직접 호출하면 초반 코드는 적어 보여도 오류 포맷, 세션, 타입 변경, 배치 호출, 날짜 직렬화에서 계속 비용이 생긴다.

**최소 mobile API 후보**

- `POST /api/mobile/auth/send-code`
- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/auth/me`
- `GET /api/mobile/tournaments`
- `GET /api/mobile/tournaments/:id`
- `POST /api/mobile/tournaments/:id/registrations`
- `GET /api/mobile/my/registrations`
- `POST /api/mobile/registrations/:id/cancel`
- `POST /api/mobile/referee/check-pin`
- `GET /api/mobile/referee/tournaments/:id/courts`
- `GET /api/mobile/referee/matches/:id`
- `POST /api/mobile/referee/matches/:id/result`
- `GET /api/mobile/community/posts`
- `POST /api/mobile/community/posts`
- `POST /api/mobile/community/reports`
- `GET /api/mobile/notifications`

## 4. 기능별 전환 범위

| 기능 | WebView 셸 | 네이티브 Flutter |
| --- | --- | --- |
| 홈/하단 탭 | 기존 유지 | `go_router` shell route 또는 bottom navigation |
| 대회 목록/상세 | 기존 유지 | 서버 public API + 캐시/새로고침 |
| 대회 접수 | 기존 유지 | 폼 검증, 선수 1/2명, 연령대, 사이즈, 결제 안내 재구현 |
| 내 접수 내역 | 기존 유지 | 접수자/참가자 구분, 상태/입금 상태 표시 |
| 대진표 공개 | 기존 유지 | 복잡도 높음. 초반에는 WebView 또는 이미지/표 view부터 |
| 일정표 | 기존 유지 | 날짜/코트 필터, KST 시간 표시 확인 |
| 심판 PIN/코트/경기 결과 | 기존 유지 가능 | 네이티브로 우선 전환 가치 큼 |
| 대회 관리 | 기존 유지 권장 | 화면이 크고 mutation이 많아 후순위 |
| 커뮤니티 | 기존 유지 | UGC 신고/차단/알림/이미지 업로드까지 함께 필요 |
| 코트/샵 | 현재 준비 중 화면 | 출시 전 실제 기능 여부 결정 |
| 약관/개인정보 | 기존 유지 | 앱 내부 접근 경로 필수 |

## 5. 인증/세션

현재 서버 인증은 `app_session_id` httpOnly cookie 기반이다.

### WebView

- 동일 도메인에서 웹을 열면 로그인 쿠키 흐름은 대체로 유지 가능하다.
- iOS `WKWebView`, Android WebView의 쿠키 저장/삭제 동작을 실제 기기에서 확인해야 한다.
- 로그아웃 시 WebView cookie/localStorage/sessionStorage 정리 정책을 맞춘다.
- 앱 삭제/재설치 후 세션 유지 여부를 기대하지 않는다.

### 네이티브 Flutter

- 가장 단순한 방식은 HTTP 클라이언트에서 cookie jar를 유지하는 것이다.
- refresh token 구조가 없으므로 1개월 JWT 만료 후에는 다시 SMS 로그인이 필요하다.
- 앱 내부 저장소에 PIN을 둘 경우 `flutter_secure_storage` 같은 secure storage를 써야 한다.
- `app_session_id`를 Dart 코드가 직접 읽어 JS처럼 다루는 구조는 피한다. httpOnly 보안 의도를 깨뜨린다.

## 6. SMS 로그인

- 현재 Twilio Verify 기반이고 데모 계정은 `01000000000` / `132400`이다.
- iOS/Android 앱에서는 SMS 자동 읽기 권한을 기본 전제로 잡지 않는다.
- 인증번호 입력 UX는 숫자 키패드, 붙여넣기, 재전송 타이머, 실패 횟수 제한을 넣는다.
- 심사 계정은 App Review/Play Review가 접근 가능한 데모 계정으로 준비한다.
- 계정 생성이 앱 안에서 가능하므로 계정 삭제 요청 경로도 앱 안과 웹 둘 다 필요하다.

## 7. 딥링크

Flutter 공식 문서는 Android App Links와 iOS Universal Links를 별도로 설정하도록 안내한다. 현재 웹 route를 그대로 앱 route와 매핑해야 한다.

| 웹 route | 앱 진입 |
| --- | --- |
| `/tournament` | 대회 목록 |
| `/tournament/:id` | 대회 상세 |
| `/tournament/:id/register` | 대회 접수 |
| `/tournaments/:id/bracket` | 공개 대진표 |
| `/tournament/:id/schedule` | 일정표 |
| `/tournament/:id/referee/login` | 심판 PIN |
| `/tournament/:id/referee` | 심판 코트 목록 |
| `/tournament/:id/referee/court/:court?date=YYYY-MM-DD` | 코트별 경기 |
| `/tournament/:id/referee/match/:matchId?date=YYYY-MM-DD` | 경기 결과 입력 |
| `/social/post/:id` | 커뮤니티 글 상세 |

필요 작업:

- iOS: Associated Domains, `apple-app-site-association`
- Android: intent filter, Digital Asset Links `assetlinks.json`
- 웹 fallback: 앱 미설치 시 현재 웹 route로 정상 접근
- 푸시 payload: `route`, `entityId`, `tournamentId`, `matchId`처럼 앱이 해석 가능한 데이터 포함

## 8. 푸시 알림

초기 앱 가치로 푸시는 우선순위가 높다.

후보 이벤트:

- 대회 접수 완료/취소
- 입금 확인/상태 변경
- 대진표 공개
- 경기 시작 전 심판/선수 알림
- 심판 코트 배정/경기 결과 저장 완료
- 커뮤니티 댓글/공지

고려사항:

- Firebase Cloud Messaging을 쓰면 iOS APNs 설정도 같이 필요하다.
- iOS는 알림 권한 요청 타이밍이 중요하다. 첫 실행 즉시보다 기능 맥락에서 요청한다.
- Android 13+ 알림 권한 요청이 필요하다.
- 푸시 payload는 웹 URL만 넣지 말고 앱 route 데이터도 넣는다.
- 알림 클릭 시 인증 필요 route라면 로그인 후 원래 route로 복귀해야 한다.

## 9. 파일/이미지/문서

현재 서버는 storage proxy로 포스터/문서/이미지를 업로드하고, 대진표 XLSX는 REST download endpoint로 내려준다.

### WebView

- WebView 안에서 XLSX/PDF 다운로드가 제대로 동작하는지 iOS/Android 각각 확인한다.
- 안 되면 Flutter 쪽에서 다운로드 URL을 intercept해서 외부 브라우저, 공유 sheet, 파일 저장으로 처리한다.

### 네이티브 Flutter

- 공문 PDF: 앱 내 viewer 또는 외부 앱 열기.
- 대진표 XLSX: 일반 사용자는 공유/다운로드, 운영자는 저장/전달이 필요.
- 커뮤니티 이미지: picker 권한, 업로드 진행률, 이미지 압축, 실패 재시도.
- 개인정보가 포함된 파일은 캐시 만료와 공유 범위를 신경 쓴다.

## 10. 결제/입금

현재 대회 접수는 계좌 입금 안내와 입금 상태 관리 중심이다.

- 앱 내에서 디지털 상품을 판매하지 않으면 IAP 대상은 아니다.
- 실물 상품/오프라인 대회 참가비 결제는 외부 PG/계좌이체 흐름이 가능하나, 스토어 심사 메모에 설명하는 편이 안전하다.
- 앱에 결제 기능을 추가하면 Apple Pay/Google Pay/PG SDK, 영수증, 취소/환불 정책, 개인정보 처리방침이 함께 필요하다.
- 현재 `paymentStatus`는 `unpaid`, `paid`, `refunded`이므로 앱 문구도 이 상태와 맞춘다.

## 11. 개인정보/약관/계정 삭제

현재 앱은 이름, 전화번호, 생년월일, 성별, 대회 접수 선수 정보, 소속, 커뮤니티 글/댓글/이미지, 알림 설정을 다룬다.

필수 체크:

- 개인정보처리방침 URL이 앱 내부와 스토어 메타데이터에 모두 존재.
- 이용약관/개인정보 동의 기록 유지.
- 계정 생성이 가능하므로 앱 내부에서 계정 삭제 요청 경로 제공.
- Google Play Data safety와 App Store Privacy Nutrition Label에 실제 수집 항목 반영.
- Mixpanel, Twilio, storage proxy, Firebase/FCM 등 SDK/서버 제공자도 개인정보 처리 고지에 포함.
- 생년월일/전화번호/선수정보는 최소 수집 원칙에 맞는지 재확인.

## 12. UGC/커뮤니티 심사 리스크

현재 커뮤니티에는 글, 댓글, 좋아요, 신고, 숨김, 공지/고정, 알림이 있다. 앱 출시 시 UGC 정책 대응이 필요하다.

필수:

- 신고 기능
- 관리자 숨김/삭제 처리
- 차단 또는 최소한 사용자 단위 제재 정책
- 운영자 연락처/고객지원 경로
- 이용약관에 금지 콘텐츠와 처리 정책 명시
- 앱 심사용 데모 계정에서 커뮤니티 신고/관리 흐름 설명

## 13. iOS 고려사항

- App Store Connect 앱 생성, Bundle ID, Team, Signing 설정.
- Flutter iOS 배포는 macOS/Xcode가 필요하다.
- 최소 iOS 버전은 Flutter 기본 지원 범위와 사용하는 plugin 요구사항을 확인한다.
- Associated Domains로 Universal Links 설정.
- APNs 인증키/FCM 연결.
- `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` 등 권한 문구는 실제 기능을 넣을 때만 추가.
- ATS 때문에 API/이미지/파일 URL은 HTTPS가 기본이어야 한다.
- TestFlight 심사용 데모 계정과 backend 접근 가능 상태 필요.
- 단순 WebView 앱은 "repackaged website" 리스크가 있으므로 네이티브 기능/앱다운 UX를 명확히 한다.

## 14. Android 고려사항

- package name/applicationId 확정.
- upload keystore 생성 및 보관. repo에 커밋 금지.
- Play App Signing 사용.
- 앱 번들 `.aab`로 배포.
- Android App Links와 `assetlinks.json` 설정.
- Android 13+ 알림 권한, 사진 선택기/파일 권한 정책 확인.
- 뒤로가기: WebView history와 Flutter navigator back stack을 함께 처리.
- cleartext HTTP 금지. dev 서버 테스트를 제외하고 HTTPS 사용.
- Play Console Data safety, 개인정보처리방침, 계정 삭제 URL 입력.

## 15. 환경/flavor

현재 웹 배포는 dev/prod EB와 Docker compose가 분리되어 있고, `VITE_APP_ENV`로 Mixpanel token이 갈린다. 모바일도 같은 원칙이 필요하다.

권장:

- `dev`, `prod` flavor 분리.
- 앱 이름도 `PicklePlay Dev`, `PicklePlay`처럼 분리.
- API base URL을 build-time dart define 또는 flavor config로 주입.
- dev 앱이 prod API를 때리지 않도록 앱 시작 화면/설정에 환경 표시.
- Firebase project도 dev/prod 분리.
- Mixpanel token도 dev/prod 분리.

## 16. Flutter 구현 권장 스택

새 네이티브 앱을 만든다면 과하게 시작하지 않는다.

- Routing: `go_router`
- State/API cache: Riverpod `AsyncNotifier` 또는 단순 `FutureProvider`부터
- HTTP: `dio` + cookie jar 또는 `http` + 직접 cookie 관리
- JSON: `json_serializable`
- Secure storage: referee PIN, device token 등 민감 로컬 값
- WebView shell: `webview_flutter`
- Analytics: Mixpanel Flutter SDK
- Push: Firebase Messaging
- Crash: Firebase Crashlytics 또는 Sentry 중 하나

초기에는 Bloc, clean architecture full layer, GraphQL 전환, offline DB, codegen 과다 도입은 피한다.

## 17. 네이티브 UI 전환 순서

1. Flutter shell 생성, flavor/dev-prod, WebView, splash/icon, 딥링크 기본 처리
2. 푸시 수신/클릭 route 처리
3. 심판 PIN/코트/경기 결과 입력을 네이티브화
4. 대회 목록/상세/접수 네이티브화
5. 내 접수/마이페이지 네이티브화
6. 커뮤니티 네이티브화
7. 대회 관리 화면은 마지막. 현재 `TournamentManagePage`가 너무 크고 mutation이 많아 초반 이식 대상이 아니다.

## 18. QA 체크리스트

### 공통

- 로그인/회원가입/SMS 인증
- 로그아웃 후 쿠키/세션 정리
- 세션 만료 후 원래 화면 복귀
- 대회 목록/상세/접수/접수 완료
- 내 접수 내역/접수 취소
- 대진표/일정표 표시
- 심판 PIN/코트 선택/경기 결과 저장/수정
- 커뮤니티 목록/상세/글쓰기/댓글/신고
- 파일 다운로드/공유
- 알림 수신/클릭 이동
- 딥링크 앱 설치/미설치 fallback
- 네트워크 끊김/느림/서버 500
- KST 날짜/시간 표시

### iOS

- iPhone 작은 화면/큰 화면
- iPad에서 최소 대응
- Safe Area, 키보드, 숫자 입력
- Universal Links
- TestFlight 설치/업데이트
- APNs/FCM foreground/background/terminated 상태

### Android

- 물리 back 버튼
- App Links
- Android 13+ 알림 권한
- 파일 다운로드 provider/share sheet
- 다양한 제조사 WebView
- Play internal testing `.aab`

## 19. 출시 전 필수 산출물

- 앱 아이콘/스플래시
- 스토어 스크린샷 iOS/Android
- 개인정보처리방침 URL
- 이용약관 URL
- 계정 삭제 URL
- 고객지원 URL/이메일
- 심사용 데모 계정
- 심사용 대회/심판 PIN/샘플 데이터
- 개인정보 수집 항목 표
- 푸시 알림 권한 요청 문구
- 앱 버전 정책
- dev/prod 배포/롤백 절차

## 20. 외부 공식 참고

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Spam policy: https://support.google.com/googleplay/android-developer/answer/9899034
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Flutter deep linking: https://docs.flutter.dev/ui/navigation/deep-linking
- Flutter iOS release: https://docs.flutter.dev/deployment/ios
- Flutter Android release: https://docs.flutter.dev/deployment/android
- `webview_flutter`: https://pub.dev/packages/webview_flutter

## 21. 지금 결정해야 하는 것

1. **초기 출시 전략**: WebView 셸로 먼저 갈지, 네이티브 재작성으로 시작할지.
2. **앱의 네이티브 가치**: 푸시/딥링크/심판 UX 중 무엇을 1차 출시 범위로 넣을지.
3. **API 전략**: WebView 유지인지, `/api/mobile/*` façade를 추가할지.
4. **스토어 계정/법무 준비**: Apple Developer, Google Play Console, 개인정보/계정 삭제/UGC 정책.
5. **dev/prod 운영**: 앱 flavor와 서버 환경이 절대 섞이지 않도록 배포 키/URL/토큰 분리.

