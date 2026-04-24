# PicklePlay 대회 참가 접수 시스템 개발 TODO

## Phase 1: 인프라 + 인증
- [x] web-db-user 업그레이드
- [x] DB 스키마 생성 (users, tournaments, tournament_events, tournament_age_groups, tournament_posters, tournament_documents, registrations, players)
- [x] Manus OAuth 인증 적용 (Twilio SMS 대신)
- [x] 대회 시드 데이터 입력 (리닝코리아 포항 전국 피클볼 대회 + 12개 종목)

## Phase 2: 대회 상세 화면 확장
- [x] 포스터 캐러셀 (4:5 비율, 다중 이미지)
- [x] 공문 PDF 뷰어/다운로드 링크
- [x] 접수 현황 요약 카드 (종목별 Progress)
- [x] CTA 영역 (접수 버튼, 참가비 안내)
- [x] 주최/주관/후원 정보 표시
- [x] 네이버 지도 장소 보기 연결

## Phase 3: 핵심 접수 기능
- [x] 직접 입력 폼 (종목/급수/연령대 선택 → 선수 정보)
- [x] 접수 완료 시 참가비 안내 (인라인 계좌 안내)
- [x] 내 접수 내역 화면
- [x] 접수 취소 기능
- [x] 대리 신청 기능
- [x] 단식/복식 자동 처리 (선수 수 자동 조절)
- [x] 참가기념품 사이즈 선택 및 검증

## Phase 4: 엑셀 기능
- [x] 클라이언트 엑셀 파싱 (xlsx 패키지)
- [x] 행 단위 검증 (종목, 선수 이름, 전화번호, 사이즈)
- [x] 일괄 접수 제출 (bulkCreate)
- [ ] 엑셀 양식 다운로드 버튼 구현

## Phase 5: 관리자 기능
- [x] 대회 관리자 대시보드 (대회 목록 조회)
- [x] 참가 관리 테이블 (검색/필터)
- [x] 입금 확인 기능 (입금 상태 변경)
- [x] 접수 상태 변경 기능
- [x] 사용자 관리 (역할 변경)
- [x] 관리자 접근 권한 제어 (admin/organizer/super_admin)
- [ ] 대회 생성/수정 UI (서버 API 구현 완료, 프론트 UI 미연결)
- [ ] 포스터/공문 업로드 UI (서버 API 구현 완료, 프론트 UI 미연결)
- [ ] 참가자 명단 엑셀 내보내기

## Phase 6: 디자인 시스템
- [x] 차트러스 라임 (#C8E632) + 다크 슬레이트 (#1a1a2e) 컬러
- [x] DM Sans 폰트 적용
- [x] framer-motion 애니메이션
- [x] 피클볼 로고 (구멍 3개 미니멀 디자인)
- [x] 하단 5탭 네비게이션 (홈/대회/코트예약/샵/소셜)
- [x] 커밍쑨 페이지 (홈, 코트예약, 샵, 소셜)

## Phase 7: 테스트 & QA
- [x] TypeScript 에러 없음 (npx tsc --noEmit 통과)
- [x] vitest 테스트 작성 (tournament, registration, admin 라우터) - 33개 테스트 통과

## Phase 8: 신규 요청 (2026-04-24)
- [x] 상단 커밍쑨 배지를 로그인/회원가입 버튼으로 교체
- [x] 참가 신청 시 비로그인 사용자에게 로그인 안내 UX 개선
- [x] 대회 탭 정식 오픈 (커밍쑨 아님)
- [x] 나머지 탭(홈/코트예약/샵/소셜) 2026년 중 오픈 예정으로 변경
- [x] 관리자 대회 생성/수정 UI 연결 (AdminPage에 폼 추가)
- [x] 참가자 명단 엑셀 내보내기 기능 (AdminPage 접수관리 탭에 구현)
- [x] 엑셀 양식 다운로드 버튼 (접수 페이지 엑셀 탭)
- [x] vitest 테스트 업데이트 - 33개 테스트 통과

## Phase 9: Twilio 기반 핸드폰 번호 로그인/회원가입 전환

- [x] Twilio 환경변수 3개 등록 (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID)
- [x] twilio 패키지 설치
- [x] DB 스키마 마이그레이션 (users 테이블에 phone, gender, birthDate, termsAcceptedAt, privacyAcceptedAt 추가)
- [x] server/sms.ts 생성 (Twilio Verify API 래퍼)
- [x] server/_core/sdk.ts JWT 세션 생성/검증 수정 (OAuth 메서드 제거)
- [x] smsAuth 라우터 추가 (sendCode, login, register)
- [x] register 라우터 추가 (smsAuth.register 내 통합)
- [x] OAuth 관련 코드 제거/비활성화
- [x] Login 페이지 구현 (전화번호 → 인증번호 2단계)
- [x] Register 페이지 구현 (전화번호 인증 → 개인정보+약관)
- [x] AppHeader 로그인/회원가입 버튼 Twilio 연동
- [x] const.ts getLoginUrl() 수정 (내부 /login 라우트로 변경)
- [x] main.tsx 전역 에러 핸들러 수정
- [x] 데모 계정 지원 (010-0000-0000 / 1324) - sms.ts에 이미 구현됨
- [x] vitest 테스트 업데이트 - 46개 테스트 통과 (smsAuth 10개 추가)
- [x] OAuth 관련 코드 완전 제거 (oauth.ts → no-op, sdk.ts OAuth 메서드 제거)

## Phase 10: 인증번호 UX 개선 (2026-04-24)
- [x] 인증번호 입력창 4자리 → 6자리로 변경 (Login/Register 페이지)
- [x] 인증번호 화면에 국제발신(+1 760-647-8528) 차단 확인 알림 추가
- [x] SMS 발송 시 피클플레이 인증번호 메시지 커스텀 (customFriendlyName + locale:ko)

## Phase 11: 비로그인 참가신청 안내 개선 (2026-04-24)
- [x] 대회 상세 페이지 - 비로그인 시 참가신청 버튼 클릭 시 로그인/회원가입 안내
- [x] 참가신청 페이지(RegistrationPage) - 비로그인 시 로그인/회원가입 안내 화면 표시
- [x] 대회 목록 페이지 - 비로그인 시 참가신청 버튼 로그인 안내

## Phase 12: 인증 UX 추가 개선 (2026-04-24)
- [x] 데모 계정 코드 6자리 통일 (1324 → 132400)
- [x] 인증번호 입력창에 autocomplete="one-time-code" 속성 추가 (Login/Register)
- [x] 로그인 후 returnTo 경로 복원 검증 및 개선 (로그인↔회원가입 간 returnTo 전달)
- [x] RegistrationPage 비로그인 시 로그인 안내 화면 표시

## Phase 13: 이용약관, 마이페이지, 접수완료 페이지 (2026-04-24)
- [x] 이용약관 페이지 (/terms)
- [x] 개인정보처리방침 페이지 (/privacy)
- [x] 회원가입 페이지에서 약관 링크 연결
- [x] 마이페이지 (/mypage) - 프로필 정보 표시 및 수정
- [x] 마이페이지 - 접수 내역 통합 표시
- [x] 서버 프로필 수정 API (updateProfile)
- [x] 참가 신청 완료 확인 페이지 (/tournament/:id/register/complete)
- [x] RegistrationPage에서 접수 완료 시 확인 페이지로 이동
- [x] App.tsx에 새 라우트 등록 (MyPage, Terms, Privacy, RegistrationComplete)
- [x] vitest 테스트 업데이트 - 54개 테스트 통과 (user 라우터 8개 추가)

## Phase 14: 포스터 업로드, 입금/환불 관리, SMS 알림 (2026-04-24)
- [x] 서버: 포스터 업로드 API (S3 storagePut 활용) - 이미 구현됨
- [x] 서버: 입금 완료 시 SMS 알림 전송 기능 (sendSmsMessage 추가)
- [x] 서버: 환불 처리 API 개선 (환불 시 팀 카운트 감소 + 상태 자동 변경)
- [x] 프론트: 관리자 포스터 업로드 UI (인스타 4:5 비율)
- [x] 프론트: 관리자 입금/환불 관리 UI 개선 (버튼식 상태 변경 + SMS 알림 표시)
- [x] 프론트: 대회 상세 페이지에 포스터 표시 (이미 구현됨 - 캐러셀 UI)
- [x] 프론트: 관리자 대회 상태값 관리 UI (접수 받기/마감/취소 등)
- [x] vitest 테스트 업데이트 - 54개 테스트 통과 (sendSmsMessage mock 추가)

## Phase 15: 인증번호 6자리 스키마 버그 수정 및 로그인/회원가입 사이드이펙트 검증 (2026-04-24)
- [x] 서버 zod 스키마 인증번호 4자리→6자리 수정 (login + register)
- [x] 프론트엔드 인증번호 관련 코드 전수 검사 (이미 6자리로 정상)
- [x] 로그인/회원가입 전체 플로우 사이드이펙트 검증
- [x] vitest 테스트 업데이트 - 54개 통과 (6자리 코드 반영)

## Phase 16: 로그인 시 미가입 번호 회원가입 안내 (2026-04-24)
- [x] 로그인 페이지에서 미가입 번호 에러 시 회원가입 안내 배너 + 버튼 표시 (전화번호 자동 전달)

## Phase 17: 회원가입 전화번호 자동 채움 + 비로그인 참가신청 안내 개선 (2026-04-24)
- [x] RegisterPage에서 URL 파라미터 phone 자동 채움
- [x] TournamentDetailPage 비로그인 시 로그인+회원가입 버튼 분리 안내 (2칼럼 그리드)

## Phase 18: 디자인 시스템 v1.0 변경 (핸드오프 기반)
- [x] 로고 CDN 업로드 (pasted_file_wNuLjp_04_logo_full_lockup.webp)
- [x] Google Fonts CDN 추가 (Pretendard + Archivo Black)
- [x] index.css 글로벌 테마 토큰 전면 교체 (다크 테마 기본, Optic Yellow #D4FF3D)
- [x] ThemeContext defaultTheme을 dark로 변경
- [x] AppHeader 디자인 업데이트 (로고, 다크 테마)
- [x] AppLayout 하단 탭 네비게이션 디자인 업데이트
- [x] HomePage 디자인 업데이트 (다크 테마, 새 타이포그래피)
- [x] TournamentPage 디자인 업데이트
- [x] TournamentDetailPage 디자인 업데이트
- [x] LoginPage 디자인 업데이트
- [x] RegisterPage 디자인 업데이트
- [x] MyPage 디자인 업데이트
- [x] RegistrationPage 디자인 업데이트
- [x] RegistrationCompletePage 디자인 업데이트
- [x] AdminPage 디자인 업데이트
- [x] 커밍쑨 페이지들 (CourtsPage, ShopPage, SocialPage) 디자인 업데이트
- [x] NotFound 페이지 디자인 업데이트
- [x] TermsPage, PrivacyPage 디자인 업데이트
- [x] vitest 54개 테스트 통과 확인

## Phase 19: 다크모드/라이트모드 전환 기능 (2026-04-24)
- [x] 라이트 테마 CSS 변수 정의 (index.css :root 블록)
- [x] ThemeContext 전환 로직 구현 (localStorage 저장, 시스템 설정 감지)
- [x] AppHeader에 다크/라이트 토글 버튼 추가
- [x] 라이트 모드에서 전체 페이지 가독성 확인
- [x] vitest 54개 테스트 통과 확인
