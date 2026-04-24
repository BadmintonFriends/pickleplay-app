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
