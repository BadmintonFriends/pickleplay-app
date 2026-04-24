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
