# 대회 다중 관리자 지정 + organizer 역할 제거 개발 계획서

## 1. 개요

현재 대회별 관리자는 `tournaments.organizerId` 단일 컬럼으로 1명만 지정 가능하고, `users.role`에 `organizer`라는 별도 역할이 존재한다. 이를 다음과 같이 변경한다:

1. **`tournament_organizers` 다대다 관계 테이블** 신설 → 한 대회에 여러 명의 관리자 지정 가능
2. **`users.role`에서 `organizer` 제거** → 역할 체계를 `user / admin / super_admin` 3단계로 단순화
3. 대회 관리 권한은 오직 `tournament_organizers` 테이블로만 판단

---

## 2. 변경 전후 비교

### 역할 체계

| | 변경 전 | 변경 후 |
|---|---|---|
| 역할 종류 | user, organizer, admin, super_admin | **user, admin, super_admin** |
| 대회 관리 권한 판단 | `users.role = 'organizer'` + `tournaments.organizerId` | **`tournament_organizers` 테이블 등록 여부** |
| /admin 접근 | organizer/admin/super_admin | admin/super_admin + `tournament_organizers`에 1건 이상 등록된 user |

### 역할별 권한 (변경 후)

| 역할 | 대회 관리 | 모든 대회 접근 | 사용자 관리 | 강제 삭제 |
|---|---|---|---|---|
| `user` (일반) | X | X | X | X |
| `user` (대회 관리자 지정됨) | 본인 대회만 | X | X | X |
| `admin` | O | O | X | X |
| `super_admin` | O | O | O | O |

---

## 3. DB 스키마 변경

### 3.1 신규 테이블: `tournament_organizers`

```sql
CREATE TABLE tournament_organizers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournamentId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('owner', 'manager') NOT NULL DEFAULT 'manager',
  assignedAt TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE KEY uq_tournament_user (tournamentId, userId)
);
```

| 컬럼 | 설명 |
|---|---|
| `tournamentId` | 대회 ID (FK → tournaments.id) |
| `userId` | 관리자 사용자 ID (FK → users.id) |
| `role` | `owner` = 대회 생성자(1명, 삭제 불가), `manager` = 추가 관리자(삭제 가능) |
| `assignedAt` | 지정 일시 |

### 3.2 users.role enum 변경

```sql
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'super_admin') NOT NULL DEFAULT 'user';
```

**마이그레이션 순서:**
1. `tournament_organizers` 테이블 생성
2. 기존 `tournaments.organizerId`가 있는 행 → `tournament_organizers`에 `role='owner'`로 이관
3. 기존 `users.role = 'organizer'`인 사용자 → `role = 'user'`로 변경
4. `users.role` enum에서 `organizer` 제거
5. `tournaments.organizerId` 컬럼은 당분간 유지 (레거시 호환), 추후 제거

---

## 4. 백엔드 변경

### 4.1 Drizzle 스키마 추가 (drizzle/schema.ts)

```typescript
export const tournamentOrganizers = mysqlTable("tournament_organizers", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "manager"]).default("manager").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
}, (table) => ({
  uniqueTournamentUser: unique().on(table.tournamentId, table.userId),
}));
```

### 4.2 DB 헬퍼 함수 (server/db.ts)

| 함수명 | 설명 |
|---|---|
| `getTournamentOrganizers(tournamentId)` | 대회의 모든 관리자 목록 반환 (user 정보 JOIN) |
| `isTournamentOrganizer(tournamentId, userId)` | 해당 사용자가 대회 관리자인지 boolean 반환 |
| `addTournamentOrganizer(tournamentId, userId, role)` | 관리자 추가 |
| `removeTournamentOrganizer(tournamentId, userId)` | 관리자 제거 (owner는 제거 불가) |
| `getUserManagedTournaments(userId)` | 사용자가 관리하는 대회 ID 목록 반환 |

### 4.3 소유권 검증 헬퍼 변경 (server/routers.ts)

```typescript
async function verifyTournamentOwnership(user: { id: number; role: string }, tournamentId: number) {
  if (user.role === "admin" || user.role === "super_admin") return;
  const isOrganizer = await db.isTournamentOrganizer(tournamentId, user.id);
  if (!isOrganizer) {
    throw new TRPCError({ code: "FORBIDDEN", message: "본인 대회만 수정할 수 있습니다" });
  }
}
```

### 4.4 adminProcedure 접근 권한 변경 (server/_core/trpc.ts)

```typescript
// 변경 전
const ADMIN_ROLES = ['admin', 'super_admin', 'organizer'] as const;

// 변경 후: organizer 제거, 대회 관리자는 별도 체크
const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) throw new TRPCError({ code: "FORBIDDEN" });

    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);
    const hasManagedTournaments = await db.getUserManagedTournaments(ctx.user.id);

    if (!isAdmin && hasManagedTournaments.length === 0) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
```

### 4.5 신규 API 프로시저

| 프로시저 | 권한 | 설명 |
|---|---|---|
| `admin.getTournamentOrganizers` | admin/super_admin + 본인 대회 관리자 | 대회 관리자 목록 조회 |
| `admin.addTournamentOrganizer` | admin/super_admin만 | 관리자 추가 (userId 지정) |
| `admin.removeTournamentOrganizer` | admin/super_admin만 | 관리자 제거 (owner 제거 불가) |
| `admin.searchUsersForOrganizer` | admin/super_admin만 | 사용자 검색 (이름/전화번호, 관리자 추가용) |

### 4.6 대회 생성 시 변경

```typescript
createTournament: adminProcedure.mutation(async ({ ctx, input }) => {
  const id = await db.createTournament({ ...input, organizerId: ctx.user.id });
  await db.addTournamentOrganizer(id, ctx.user.id, "owner");
  return { id };
});
```

### 4.7 기존 코드에서 organizer 참조 제거

| 파일 | 변경 |
|---|---|
| `server/_core/trpc.ts` | ADMIN_ROLES에서 `organizer` 제거, adminProcedure 로직 변경 |
| `server/routers.ts` | `verifyTournamentOwnership` 수정, role enum에서 organizer 제거 |
| `server/routers.ts` | 접수 취소/수정 권한 체크에서 `'organizer'` 제거 → `isTournamentOrganizer` 사용 |
| `server/db.ts` | `updateUserRole` 파라미터에서 organizer 제거 |
| `drizzle/schema.ts` | users.role enum에서 organizer 제거 |

---

## 5. 프론트엔드 변경

### 5.1 TournamentManagePage - 대회 정보 탭에 관리자 관리 섹션 추가

**위치:** 대회 정보 수정 폼 하단

**UI 구성:**
```
┌─────────────────────────────────────────────┐
│ 👥 대회 관리자                    [+ 추가]  │
├─────────────────────────────────────────────┤
│ 👤 박정우 (010-1234-5678)  [owner]          │
│ 👤 김철수 (010-9876-5432)  [manager] [삭제] │
│ 👤 이영희 (010-5555-1234)  [manager] [삭제] │
└─────────────────────────────────────────────┘
```

- 관리자 목록 표시 (이름, 전화번호, 역할 배지)
- `[+ 추가]` / `[삭제]` 버튼: admin/super_admin만 표시
- 대회 관리자(user)는 목록 조회만 가능

### 5.2 관리자 추가 모달

```
┌─────────────────────────────────────────────┐
│ 대회 관리자 추가                        [X] │
├─────────────────────────────────────────────┤
│ 🔍 [이름 또는 전화번호 검색_________]       │
│                                             │
│ 검색 결과:                                  │
│ ○ 김철수 (010-9876-5432)                    │
│ ○ 이영희 (010-5555-1234)                    │
│                                             │
│              [취소]  [추가]                  │
└─────────────────────────────────────────────┘
```

- **모든 사용자** 검색 가능 (organizer 역할 제한 없음, 일반 user도 추가 가능)
- 이미 등록된 관리자는 비활성화 표시

### 5.3 AdminPage 접근 권한 변경

```typescript
// 변경 전: role이 organizer/admin/super_admin이면 접근
// 변경 후: role이 admin/super_admin이거나, tournament_organizers에 등록된 user면 접근

// AdminPage에서 대회 목록 표시 로직:
// - admin/super_admin: 모든 대회 표시
// - user(대회 관리자): 본인이 관리자인 대회만 표시
```

### 5.4 AdminPage 사용자 관리 탭 - 역할 변경 드롭다운

```typescript
// 변경 전: user / organizer / admin / super_admin
// 변경 후: user / admin / super_admin
```

### 5.5 기타 프론트엔드 변경

| 파일 | 변경 |
|---|---|
| `AdminPage.tsx` | organizer 관련 필터링 로직 → `tournament_organizers` 기반으로 변경 |
| `TournamentDetailPage.tsx` | 관리 버튼 표시 조건 변경 (isTournamentOrganizer API 활용) |
| `AppHeader.tsx` 또는 네비게이션 | /admin 링크 표시 조건 변경 |

---

## 6. 영향 범위 요약

| 파일 | 변경 내용 |
|---|---|
| `drizzle/schema.ts` | `tournamentOrganizers` 테이블 추가, users.role에서 organizer 제거 |
| `server/db.ts` | 5개 헬퍼 함수 추가 |
| `server/_core/trpc.ts` | ADMIN_ROLES 변경, adminProcedure 로직 수정 |
| `server/routers.ts` | `verifyTournamentOwnership` 수정, 4개 프로시저 추가, organizer 참조 제거 |
| `client/src/pages/TournamentManagePage.tsx` | 관리자 관리 섹션 + 추가 모달 |
| `client/src/pages/AdminPage.tsx` | 접근 권한 변경, 역할 드롭다운 수정 |
| `client/src/pages/TournamentDetailPage.tsx` | 관리 버튼 표시 조건 변경 |
| 마이그레이션 SQL | 테이블 생성 + 데이터 이관 + enum 변경 |

---

## 7. 작업 순서

| 단계 | 작업 | 예상 난이도 |
|---|---|---|
| 1 | DB 스키마 추가 + 마이그레이션 (테이블 생성 + 기존 데이터 이관 + enum 변경) | 중간 |
| 2 | server/db.ts 헬퍼 함수 5개 추가 | 낮음 |
| 3 | server/_core/trpc.ts adminProcedure 수정 (organizer 제거 + 대회 관리자 체크) | 중간 |
| 4 | server/routers.ts 소유권 검증 수정 + 4개 프로시저 추가 + organizer 참조 제거 | 중간 |
| 5 | TournamentManagePage 관리자 관리 UI + 추가 모달 | 중간 |
| 6 | AdminPage 접근 권한 변경 + 역할 드롭다운 수정 | 낮음 |
| 7 | TournamentDetailPage 관리 버튼 조건 변경 | 낮음 |
| 8 | vitest 테스트 추가/수정 (다중 관리자 + organizer 역할 제거 반영) | 중간 |
| 9 | 전체 테스트 실행 + 체크포인트 저장 | 낮음 |

---

## 8. 고려 사항

**하위 호환성:** `tournaments.organizerId` 컬럼은 즉시 제거하지 않고 유지한다. 새 로직은 `tournament_organizers` 테이블만 참조.

**기존 organizer 사용자 처리:** role이 `organizer`인 사용자는 `user`로 변경하되, 해당 사용자가 관리하던 대회는 `tournament_organizers`에 자동 이관되므로 기능 손실 없음.

**owner 보호:** owner 역할은 대회당 1명만 존재하며 삭제 불가. 대회 생성자가 자동으로 owner가 됨.

**일반 user도 관리자 가능:** organizer 역할이 사라지므로, admin/super_admin이 아무 user든 특정 대회의 관리자로 지정할 수 있음. 별도 "승격" 과정 불필요.
