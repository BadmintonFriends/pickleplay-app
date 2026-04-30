# 대회 정보/상태값 관리 권한 다운그레이드 개발 계획서

**작성일:** 2026-04-30  
**작성자:** Manus AI  
**버전:** v1.0

---

## 1. 개요

현재 대회 정보 수정 및 상태 변경 기능은 `/admin` 페이지에서만 접근 가능하며, `adminProcedure` 미들웨어를 통해 `admin`, `super_admin`, `organizer` 역할을 가진 모든 사용자가 **모든 대회**에 대해 수정 권한을 갖는 구조이다. 이 계획서는 대회별 관리자(organizer)가 **본인이 생성한 대회**에 한해서만 정보 수정 및 상태 변경이 가능하도록 권한을 세분화하고, 해당 기능을 기존 `/tournament/:id/manage` 페이지로 통합 이동하는 방안을 기술한다.

---

## 2. 현재 구조 분석

### 2.1 권한 체계

| 역할 | 대회 생성 | 대회 수정/상태 변경 | 접수 관리 | 사용자 관리 |
|------|-----------|---------------------|-----------|-------------|
| `super_admin` | O (모든 대회) | O (모든 대회) | O (모든 대회) | O |
| `admin` | O (모든 대회) | O (모든 대회) | O (모든 대회) | X |
| `organizer` | X | O (**모든 대회** - 문제점) | O (본인 대회만) | X |
| `user` | X | X | X | X |

> **문제점:** `organizer`가 `adminProcedure`를 통해 모든 대회의 정보를 수정할 수 있는 상태이며, 리소스 수준의 소유권 검증이 없다. 접수 관리는 Phase 36에서 이미 `/tournament/:id/manage`로 이동하며 소유권 체크를 프론트엔드에서 수행하고 있으나, 백엔드에서는 여전히 `adminProcedure`만 적용되어 있다.

### 2.2 영향받는 백엔드 프로시저

| 프로시저 | 기능 | 현재 미들웨어 | 소유권 검증 |
|----------|------|--------------|-------------|
| `admin.updateTournament` | 대회 정보 수정 | `adminProcedure` | 없음 |
| `admin.setEvents` | 종목 설정 | `adminProcedure` | 없음 |
| `admin.setAgeGroups` | 연령대 설정 | `adminProcedure` | 없음 |
| `admin.uploadPoster` | 포스터 업로드 | `adminProcedure` | 없음 |
| `admin.deletePoster` | 포스터 삭제 | `adminProcedure` | 없음 |
| `admin.uploadSizeGuide` | 사이즈표 업로드 | `adminProcedure` | 없음 |
| `admin.deleteSizeGuide` | 사이즈표 삭제 | `adminProcedure` | 없음 |
| `admin.uploadDocument` | 문서 업로드 | `adminProcedure` | 없음 |

### 2.3 영향받는 프론트엔드

| 페이지 | 현재 기능 | 변경 필요 |
|--------|-----------|-----------|
| `AdminPage.tsx` | 대회 목록 + 생성/수정 폼 + 상태 변경 버튼 | 수정/상태 변경을 `/tournament/:id/manage`로 이동 |
| `TournamentManagePage.tsx` | 접수 관리만 | 대회 정보 수정 + 상태 변경 탭 추가 |

---

## 3. 변경 계획

### 3.1 백엔드: 소유권 검증 미들웨어 추가

기존 `adminProcedure`를 유지하되, 대회 관련 mutation에 **리소스 수준 소유권 검증 로직**을 추가한다.

**방안: 각 프로시저 내부에서 소유권 검증**

```typescript
// server/routers.ts - updateTournament 예시
updateTournament: adminProcedure
  .input(z.object({ id: z.number(), data: z.object({...}) }))
  .mutation(async ({ ctx, input }) => {
    // organizer인 경우 본인 대회만 수정 가능
    if (ctx.user.role === "organizer") {
      const tournament = await db.getTournamentById(input.id);
      if (!tournament || tournament.organizerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "본인 대회만 수정할 수 있습니다" });
      }
    }
    await db.updateTournament(input.id, input.data);
    return { success: true };
  }),
```

이 패턴을 다음 프로시저에 동일하게 적용한다:

- `updateTournament` (tournamentId = `input.id`)
- `setEvents` (tournamentId = `input.tournamentId`)
- `setAgeGroups` (tournamentId = `input.tournamentId`)
- `uploadPoster` (tournamentId = `input.tournamentId`)
- `deletePoster` (포스터 → 대회 역추적 필요)
- `uploadSizeGuide` (tournamentId = `input.tournamentId`)
- `deleteSizeGuide` (tournamentId = `input.tournamentId`)
- `uploadDocument` (tournamentId = `input.tournamentId`)

**`deletePoster` 특수 처리:** 현재 입력이 `{ id: z.number() }` (포스터 ID)이므로, 포스터에서 대회를 역추적하거나 입력 스키마에 `tournamentId`를 추가해야 한다.

### 3.2 프론트엔드: TournamentManagePage 확장

`/tournament/:id/manage` 페이지에 **탭 구조**를 추가하여 접수 관리 외에 대회 정보 수정 기능을 통합한다.

**탭 구조:**

| 탭 | 기능 | 접근 권한 |
|----|------|-----------|
| 접수 관리 | 기존 접수 목록/상태 변경/엑셀 내보내기 | organizer(본인) / admin / super_admin |
| 대회 정보 | 기본 정보 수정 (이름, 날짜, 장소, 참가비 등) | organizer(본인) / admin / super_admin |
| 종목/연령대 | 종목 추가/삭제, 연령대 설정 | organizer(본인) / admin / super_admin |
| 포스터/문서 | 포스터 업로드/삭제, 사이즈표, 문서 관리 | organizer(본인) / admin / super_admin |
| 상태 변경 | 대회 상태 변경 (준비중/접수중/마감/취소) | organizer(본인) / admin / super_admin |

**UI 흐름:**
1. 대회 상세 페이지(`/tournament/:id`) → "대회 관리" 버튼 → `/tournament/:id/manage`
2. `/tournament/:id/manage` 상단에 탭 네비게이션 표시
3. 기본 탭은 "접수 관리" (기존 기능 유지)
4. "대회 정보" 탭에서 AdminPage의 대회 수정 폼을 재활용

### 3.3 AdminPage 변경

`/admin` 페이지에서 대회 관련 기능을 축소한다.

**유지하는 기능:**
- 대회 **생성** (새 대회 만들기) → `super_admin` / `admin` 전용
- 대회 **목록** 조회 (전체 대회 한눈에 보기)
- 사용자 관리 탭 → `super_admin` 전용

**제거/이동하는 기능:**
- 대회 **수정** 폼 → `/tournament/:id/manage`로 이동
- 대회 **상태 변경** 버튼 → `/tournament/:id/manage`로 이동
- 접수 관리 탭 → 이미 `/tournament/:id/manage`로 이동 완료

**변경 후 AdminPage 대회 카드:**
```
┌─────────────────────────────────────────┐
│ 리닝코리아 포항 전국 피클볼 대회  [접수중] │
│ 2026-07-01 ~ 2026-07-01 · 포항 체육관    │
│                                          │
│ [상세 보기]  [대회 관리]                  │
└─────────────────────────────────────────┘
```

### 3.4 권한 매트릭스 (변경 후)

| 역할 | 대회 생성 | 본인 대회 수정 | 모든 대회 수정 | 접수 관리 | 사용자 관리 |
|------|-----------|---------------|---------------|-----------|-------------|
| `super_admin` | O | O | O | O (모든 대회) | O |
| `admin` | O | O | O | O (모든 대회) | X |
| `organizer` | X | **O** | **X** | O (본인 대회만) | X |
| `user` | X | X | X | X | X |

---

## 4. 구현 상세

### 4.1 백엔드 변경 사항

**파일: `server/routers.ts`**

1. 소유권 검증 헬퍼 함수 추가:
```typescript
async function verifyTournamentOwnership(user: { id: number; role: string }, tournamentId: number) {
  if (user.role === "admin" || user.role === "super_admin") return; // 전체 접근 허용
  const tournament = await db.getTournamentById(tournamentId);
  if (!tournament || tournament.organizerId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "본인 대회만 수정할 수 있습니다" });
  }
}
```

2. 다음 프로시저에 `verifyTournamentOwnership` 호출 추가:
   - `updateTournament`: `await verifyTournamentOwnership(ctx.user, input.id)`
   - `setEvents`: `await verifyTournamentOwnership(ctx.user, input.tournamentId)`
   - `setAgeGroups`: `await verifyTournamentOwnership(ctx.user, input.tournamentId)`
   - `uploadPoster`: `await verifyTournamentOwnership(ctx.user, input.tournamentId)`
   - `deletePoster`: 입력 스키마에 `tournamentId` 추가 후 검증
   - `uploadSizeGuide`: `await verifyTournamentOwnership(ctx.user, input.tournamentId)`
   - `deleteSizeGuide`: `await verifyTournamentOwnership(ctx.user, input.tournamentId)`
   - `uploadDocument`: `await verifyTournamentOwnership(ctx.user, input.tournamentId)`

3. `tournamentRegistrations`, `updatePaymentStatus`, `updateRegistrationStatus`에도 동일 패턴 적용 (현재 프론트엔드에서만 체크 중)

**파일: `server/db.ts`**

- `getPosterById(id)` 헬퍼 추가 (deletePoster에서 대회 역추적용)

### 4.2 프론트엔드 변경 사항

**파일: `client/src/pages/TournamentManagePage.tsx`**

1. 탭 네비게이션 추가 (`registrations` | `info` | `events` | `media` | `status`)
2. "대회 정보" 탭: AdminPage의 기본 정보 수정 폼 이식
3. "종목/연령대" 탭: AdminPage의 종목/연령대 설정 폼 이식
4. "포스터/문서" 탭: 포스터 업로드/삭제, 사이즈표, 문서 관리 UI 이식
5. "상태 변경" 탭: 상태 변경 버튼 그룹 (준비중/접수중/마감/취소)

**파일: `client/src/pages/AdminPage.tsx`**

1. 대회 수정 폼(`formMode === "edit"`) 제거
2. 상태 변경 버튼(`handleQuickStatusChange`) 제거
3. 대회 카드에서 "수정" 버튼 → "대회 관리" 버튼으로 통합 (navigate to `/tournament/:id/manage`)
4. 대회 생성 폼(`formMode === "create"`)은 유지 (`admin`/`super_admin` 전용)

---

## 5. organizer 대회 목록 접근 경로

organizer는 `/admin` 페이지에 접근할 수 있지만, 대회 목록에서 **본인 대회만** 표시하도록 필터링한다.

**변경 방안:**
- 프론트엔드: organizer인 경우 `tournamentList`를 `tournament.organizerId === user.id`로 필터링
- 또는 별도 "내 대회" 페이지를 프로필/마이페이지에 추가

**권장안:** `/admin`에서 organizer는 본인 대회만 보이도록 필터링 + 대회 카드에서 "대회 관리" 버튼으로 `/tournament/:id/manage`로 이동

---

## 6. 테스트 계획

### 6.1 백엔드 vitest

| 테스트 케이스 | 예상 결과 |
|--------------|-----------|
| organizer가 본인 대회 updateTournament 호출 | 성공 |
| organizer가 타인 대회 updateTournament 호출 | FORBIDDEN 에러 |
| organizer가 본인 대회 setEvents 호출 | 성공 |
| organizer가 타인 대회 setEvents 호출 | FORBIDDEN 에러 |
| organizer가 본인 대회 uploadPoster 호출 | 성공 |
| organizer가 타인 대회 uploadPoster 호출 | FORBIDDEN 에러 |
| admin이 모든 대회 updateTournament 호출 | 성공 |
| super_admin이 모든 대회 updateTournament 호출 | 성공 |

### 6.2 프론트엔드 확인 사항

- organizer 로그인 → `/tournament/:id/manage` → 본인 대회 정보 수정 가능
- organizer 로그인 → 타인 대회 `/tournament/:id/manage` → "접근 권한 없음" 표시
- admin 로그인 → 모든 대회 `/tournament/:id/manage` → 정보 수정 가능
- `/admin` → organizer는 본인 대회만 목록에 표시

---

## 7. 구현 순서

| 단계 | 작업 | 예상 난이도 |
|------|------|------------|
| 1 | `verifyTournamentOwnership` 헬퍼 추가 + 기존 프로시저에 적용 | 낮음 |
| 2 | `deletePoster` 입력 스키마 변경 + `getPosterById` 헬퍼 추가 | 낮음 |
| 3 | `TournamentManagePage`에 탭 구조 추가 | 중간 |
| 4 | AdminPage 대회 수정 폼을 TournamentManagePage로 이식 | 중간 |
| 5 | AdminPage에서 수정/상태 변경 기능 제거 + 대회 관리 버튼으로 대체 | 낮음 |
| 6 | AdminPage organizer 대회 필터링 | 낮음 |
| 7 | vitest 소유권 검증 테스트 추가 | 낮음 |
| 8 | 전체 테스트 실행 + 체크포인트 저장 | 낮음 |

---

## 8. 영향 범위 요약

| 구분 | 파일 | 변경 내용 |
|------|------|-----------|
| 백엔드 | `server/routers.ts` | 소유권 검증 로직 추가 (8개 프로시저) |
| 백엔드 | `server/db.ts` | `getPosterById` 헬퍼 추가 |
| 프론트엔드 | `TournamentManagePage.tsx` | 탭 구조 + 대회 정보/종목/포스터/상태 관리 UI |
| 프론트엔드 | `AdminPage.tsx` | 수정 폼 제거, 상태 변경 제거, organizer 필터링 |
| 테스트 | `server/phase37.test.ts` | 소유권 검증 테스트 8건 이상 |

---

## 9. 리스크 및 고려사항

1. **기존 organizer 사용자 영향:** 현재 organizer가 타인 대회를 수정한 이력이 있다면, 이번 변경 후 해당 작업이 차단됨. 사전 공지 필요.
2. **deletePoster 스키마 변경:** 기존 프론트엔드에서 `deletePoster({ id })` 형태로 호출 중이므로, `tournamentId`를 추가하면 프론트엔드도 동시 수정 필요.
3. **대회 생성 권한:** organizer에게 대회 생성 권한을 부여할지 여부는 별도 논의 필요 (현재 계획에서는 admin/super_admin만 생성 가능으로 유지).
4. **AdminPage 코드 축소:** 대회 수정 폼이 약 400줄 분량이므로, TournamentManagePage로 이식 시 별도 컴포넌트로 분리하여 재사용성을 확보하는 것이 바람직함.
