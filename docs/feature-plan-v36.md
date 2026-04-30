# PicklePlay 기능 개선 기획서 v36

**작성일:** 2026-04-30  
**작성자:** Manus AI  
**대상 프로젝트:** PicklePlay (pickleplay-app)

---

## 목차

1. [대회 참가신청 시 소속 필드 추가](#1-대회-참가신청-시-소속-필드-추가)
2. [웹사이트 하단 사업자 정보 추가](#2-웹사이트-하단-사업자-정보-추가)
3. [내 접수 내역에 종목/급수 표시](#3-내-접수-내역에-종목급수-표시)
4. [대회 접수 관리 권한 다운그레이드 및 화면 이동](#4-대회-접수-관리-권한-다운그레이드-및-화면-이동)
5. [입금 안내 문구 변경 (팀 단위 입금 + 파트너 2명 이름 기재)](#5-입금-안내-문구-변경)

---

## 1. 대회 참가신청 시 소속 필드 추가

### 1.1 개요

대회 참가 신청 시 각 선수별로 **소속(클럽명)**을 입력하는 텍스트 필드를 추가한다. **필수 입력(required)**으로 처리하며, 예시 플레이스홀더로 "예) OO클럽"을 표시한다. 미입력 시 제출이 불가하도록 검증한다.

### 1.2 현재 구조

현재 `players` 테이블의 컬럼 구성은 다음과 같다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int (PK) | 자동 증가 |
| registrationId | int | 접수 FK |
| playerOrder | int | 선수 순서 (1, 2) |
| name | varchar(100) | 선수 이름 |
| birthDate | varchar(10) | 생년월일 |
| phone | varchar(20) | 전화번호 |
| giftSize | varchar(20) | 기념품 사이즈 |
| createdAt | timestamp | 생성일 |

소속 정보를 저장할 컬럼이 존재하지 않는다.

### 1.3 변경 사항

#### DB 스키마

`players` 테이블에 `affiliation` 컬럼을 추가한다.

```sql
ALTER TABLE players ADD COLUMN affiliation VARCHAR(100) NOT NULL DEFAULT '' AFTER giftSize;
```

> **주의:** 필수값이므로 `NOT NULL`로 설정한다. 기존 데이터가 있을 경우 빈 문자열('')을 기본값으로 마이그레이션한다.

#### 백엔드 (server/routers.ts)

`registration.create` 및 `registration.bulkCreate` 프로시저의 players 입력 스키마에 `affiliation` 필드를 추가한다.

```typescript
players: z.array(z.object({
  name: z.string().min(1),
  birthDate: z.string(),
  phone: z.string(),
  giftSize: z.string().optional(),
  affiliation: z.string().min(1, "소속을 입력해주세요").max(100), // 필수
}))
```

`admin.tournamentRegistrations` 응답에도 `affiliation` 필드를 포함하여 관리자가 확인할 수 있도록 한다.

#### 프론트엔드 (RegistrationPage.tsx)

`PlayerForm` 인터페이스에 `affiliation` 필드를 추가하고, 각 선수 입력 폼에 소속 입력란을 배치한다.

```typescript
interface PlayerForm {
  name: string;
  birthDate: string;
  phone: string;
  giftSize: string;
  affiliation: string; // 필수 입력
}
```

UI 배치는 이름 입력란 바로 아래(생년월일 위)에 위치시키며, 플레이스홀더는 `"예) OO클럽"`으로 설정한다. 빈 값일 경우 빨간색 에러 메시지를 표시하고 제출을 차단한다.

#### 검증 로직 (validateDirect 함수)

```typescript
if (!p.affiliation.trim()) return `${label} 소속을 입력해주세요`;
```

#### 엑셀 업로드

엑셀 양식에 "소속" 컬럼을 추가한다. 각 선수의 이름 옆에 배치하며, **빈 값이면 에러로 처리**하여 업로드를 차단한다.

```typescript
// 엑셀 검증 추가
if (!p1Affiliation) errors.push({ row: i + 1, field: "선수1 소속", message: "소속 필수", severity: "error" });
if (isDoubles && !p2Affiliation) errors.push({ row: i + 1, field: "선수2 소속", message: "소속 필수", severity: "error" });
```

#### 관리자 화면 / 엑셀 내보내기

접수 관리 테이블 및 엑셀 내보내기에 "소속" 컬럼을 추가하여 관리자가 선수별 소속을 확인할 수 있도록 한다.

### 1.4 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `drizzle/schema.ts` | players 테이블에 affiliation 컬럼 추가 |
| `server/routers.ts` | registration.create, bulkCreate 입력 스키마 수정 |
| `server/db.ts` | createPlayer 헬퍼에 affiliation 파라미터 추가 |
| `client/src/pages/RegistrationPage.tsx` | PlayerForm에 소속 입력 UI 추가 |
| `client/src/pages/AdminPage.tsx` | 접수 관리 테이블에 소속 컬럼 추가, 엑셀 내보내기 헤더 추가 |

---

## 2. 웹사이트 하단 사업자 정보 추가

### 2.1 개요

전자상거래법 및 통신판매업 관련 법규에 따라 웹사이트 하단에 **사업자 정보**를 상시 노출한다. 모든 페이지에서 접근 가능한 공통 푸터 영역에 배치한다.

### 2.2 표시 정보

| 항목 | 내용 |
|------|------|
| 법인명 | 주식회사 이음플레이 (IUMPlay Co.,Ltd.) |
| 대표자 | 박정우 |
| 사업자등록번호 | 694-86-04159 |
| 법인등록번호 | 284111-0050150 |
| 개업연월일 | 2026년 01월 15일 |
| 사업장 소재지 | 경기도 남양주시 별내면 청학로응달길 51-10, 1층, 2층 |

### 2.3 현재 구조

현재 `AppLayout.tsx`는 하단 탭 네비게이션만 존재하며, 별도의 푸터 영역이 없다. 메인 콘텐츠 영역(`<main>`)은 `pb-22`로 탭바 높이만큼 패딩이 적용되어 있다.

### 2.4 변경 사항

#### 구현 방식

`AppLayout.tsx`의 `<main>` 영역 하단(탭바 위)에 사업자 정보 푸터 컴포넌트를 삽입한다. 스크롤 최하단에 도달했을 때만 보이는 구조로, 탭바와 겹치지 않도록 한다.

#### 디자인 가이드

- 배경: `bg-background` (페이지 배경과 동일)
- 상단 구분선: `border-t border-line` (미세한 구분)
- 텍스트: `text-muted-foreground text-[10px]` (최소 크기, 보조 정보 톤)
- 패딩: `px-6 py-6`
- 정렬: 좌측 정렬, 항목 간 줄바꿈

#### 코드 구조

별도 컴포넌트 `client/src/components/BusinessFooter.tsx`를 생성하여 재사용성을 확보한다.

```tsx
export default function BusinessFooter() {
  return (
    <footer className="border-t border-line px-6 py-6 mt-8">
      <div className="text-[10px] text-muted-foreground space-y-0.5 leading-relaxed">
        <p className="font-medium text-xs text-muted-foreground/80 mb-1">주식회사 이음플레이</p>
        <p>대표자: 박정우 | 사업자등록번호: 694-86-04159</p>
        <p>법인등록번호: 284111-0050150</p>
        <p>개업연월일: 2026.01.15</p>
        <p>소재지: 경기도 남양주시 별내면 청학로응달길 51-10, 1층, 2층</p>
      </div>
    </footer>
  );
}
```

#### AppLayout 적용

`<main>` 태그 내부 `{children}` 아래에 `<BusinessFooter />`를 배치한다. 하단 탭바의 `pb-22` 패딩 내에 자연스럽게 포함되도록 한다.

### 2.5 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `client/src/components/BusinessFooter.tsx` | 신규 생성 |
| `client/src/components/AppLayout.tsx` | BusinessFooter import 및 삽입 |

---

## 3. 내 접수 내역에 종목/급수 표시

### 3.1 개요

마이페이지(`/mypage`)의 대회 접수 내역 카드에 **종목(eventType)**과 **급수(skillLevel)**를 명확하게 표시한다.

### 3.2 현재 문제

백엔드 `registration.myRegistrations` API는 이미 `eventType`과 `skillLevel`을 반환하고 있다. 그러나 프론트엔드 `MyPage.tsx`에서는 다음과 같이 잘못된 매핑을 사용하고 있다.

```tsx
{reg.eventType && (
  <Badge>
    {reg.eventType === "doubles" ? "복식" : "단식"}
  </Badge>
)}
```

실제 API 응답의 `eventType`은 `"남복"`, `"여복"`, `"혼복"`, `"남단"`, `"여단"` 등 한국어 값이며, `skillLevel`은 `"오픈부"`, `"2부"`, `"3부"`, `"신인부"` 등의 값이다. 현재 코드는 이를 올바르게 표시하지 못하고 있다.

### 3.3 변경 사항

#### MyPage.tsx 수정

접수 내역 카드의 배지 영역을 다음과 같이 수정한다.

```tsx
<div className="flex items-center gap-2 mb-3">
  <Badge className={`${status.color} ...`}>{status.label}</Badge>
  <Badge className={`${payment.color} ...`}>{payment.label}</Badge>
  {reg.eventType && (
    <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-primary/30 text-primary">
      {reg.eventType} {reg.skillLevel}
    </Badge>
  )}
</div>
```

종목별 색상 시스템(`getEventColor`)을 활용하여 종목 유형에 따라 배지 색상을 차별화할 수도 있다 (혼복: 보라, 여복: 분홍, 남복: 파랑).

#### MyRegistrationsPage.tsx 동기화

`/my-registrations` 페이지에도 동일한 종목/급수 배지를 추가하여 일관성을 유지한다.

### 3.4 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `client/src/pages/MyPage.tsx` | eventType/skillLevel 배지 렌더링 수정 |
| `client/src/pages/MyRegistrationsPage.tsx` | 동일 수정 적용 |

---

## 4. 대회 접수 관리 권한 다운그레이드 및 화면 이동

### 4.1 개요

현재 `/admin` 페이지의 "접수 관리" 탭을 **대회별 관리자(organizer) 전용 화면**으로 분리하고, 접근 권한을 다운그레이드한다. 대회의 `organizerId`와 일치하는 사용자(organizer)가 자신의 대회 접수만 관리할 수 있도록 한다.

### 4.2 현재 구조

- `/admin` 페이지는 `admin`, `super_admin`, `organizer` 역할 모두 접근 가능
- "접수 관리" 탭에서 모든 대회의 접수를 조회/관리 가능
- 서버 `admin.tournamentRegistrations` 프로시저는 `adminProcedure`로 보호됨 (admin, super_admin, organizer 허용)
- `tournaments` 테이블에 `organizerId` 컬럼이 이미 존재

### 4.3 변경 사항

#### 새로운 화면: 대회 관리자 페이지

`/tournament/:id/manage` 경로에 대회별 관리자 화면을 신규 생성한다. 이 화면에서는 해당 대회의 접수 현황 조회, 입금 확인, 상태 변경, 엑셀 내보내기를 수행할 수 있다.

#### 접근 권한 체계

| 역할 | `/admin` 접근 | `/tournament/:id/manage` 접근 |
|------|:---:|:---:|
| super_admin | 전체 기능 | 모든 대회 |
| admin | 전체 기능 | 모든 대회 |
| organizer | 대회 생성/수정만 | 본인 대회만 (`organizerId` 일치) |
| user | 불가 | 불가 |

#### 서버 변경

새로운 프로시저 `tournament.manage` (또는 기존 `admin.tournamentRegistrations` 수정)를 추가한다. 이 프로시저는 다음 조건을 검증한다.

```typescript
// organizer는 본인 대회만 접근 가능
if (ctx.user.role === 'organizer') {
  const tournament = await db.getTournamentById(input.tournamentId);
  if (tournament.organizerId !== ctx.user.id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '해당 대회의 관리 권한이 없습니다' });
  }
}
```

#### `/admin` 페이지 변경

- "접수 관리" 탭을 `/admin`에서 제거
- 대신 대회 목록의 각 대회 카드에 "접수 관리" 버튼을 배치하여 `/tournament/:id/manage`로 이동
- `super_admin`과 `admin`은 모든 대회의 관리 버튼이 활성화됨
- `organizer`는 본인 대회만 관리 버튼이 활성화됨

#### 대회 상세 페이지에서의 진입점

`TournamentDetailPage`에서 해당 대회의 organizer 또는 admin인 경우, "접수 관리" 버튼을 노출하여 `/tournament/:id/manage`로 이동할 수 있도록 한다.

### 4.4 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `client/src/pages/TournamentManagePage.tsx` | 신규 생성 (대회별 접수 관리 화면) |
| `client/src/pages/AdminPage.tsx` | "접수 관리" 탭 제거, 대회 카드에 관리 버튼 추가 |
| `client/src/pages/TournamentDetailPage.tsx` | organizer/admin용 관리 버튼 추가 |
| `client/src/App.tsx` | `/tournament/:id/manage` 라우트 등록 |
| `server/routers.ts` | 대회별 권한 검증 로직 추가 |

---

## 5. 입금 안내 문구 변경

### 5.1 개요

참가비 입금 안내를 **팀 단위 입금**으로 명확히 하고, 입금자명에 **파트너 2명의 이름을 모두 기재**하도록 안내 문구를 변경한다.

### 5.2 현재 문구

현재 `RegistrationCompletePage.tsx`의 입금 안내 문구는 다음과 같다.

> 참가비 입금 후 관리자 확인이 완료되면 참가가 확정됩니다.  
> 입금 시 **참가자 이름**으로 입금해주세요.

### 5.3 변경 문구

다음과 같이 수정한다.

> 참가비는 **팀 단위**로 입금해주세요.  
> 입금자명에 **파트너 2명의 이름을 모두 기재**해주세요.  
> (예: 홍길동김철수)  
> 입금 확인 후 관리자가 참가를 확정합니다.

단식 종목의 경우 파트너가 없으므로, 종목 유형에 따라 분기 처리한다.

```tsx
{isDoubles ? (
  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
    참가비는 <span className="font-medium text-foreground">팀 단위</span>로 입금해주세요.<br/>
    입금자명에 <span className="font-medium text-foreground">파트너 2명의 이름을 모두 기재</span>해주세요.<br/>
    <span className="text-muted-foreground/70">(예: 홍길동김철수)</span><br/>
    입금 확인 후 관리자가 참가를 확정합니다.
  </p>
) : (
  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
    참가비 입금 후 관리자 확인이 완료되면 참가가 확정됩니다.<br/>
    입금 시 <span className="font-medium text-foreground">참가자 이름</span>으로 입금해주세요.
  </p>
)}
```

### 5.4 적용 위치

입금 안내 문구가 노출되는 모든 화면에 일관되게 적용한다.

| 화면 | 파일 | 현재 문구 | 변경 |
|------|------|-----------|------|
| 접수 완료 페이지 | `RegistrationCompletePage.tsx` | "참가자 이름으로 입금" | 팀 단위 + 2명 이름 |
| 대회 상세 페이지 (참가비 영역) | `TournamentDetailPage.tsx` | "팀당 60,000원" | "팀당" 유지 + 입금자명 안내 추가 |
| 대회 DB `paymentNote` 필드 | tournaments 테이블 | (현재 비어있거나 기본값) | 입금 안내 기본 문구 저장 |

### 5.5 추가 고려사항

대회 생성/수정 시 관리자가 `paymentNote` 필드에 커스텀 입금 안내를 작성할 수 있으므로, 기본 문구는 `paymentNote`가 비어있을 때만 표시하고, 관리자가 직접 입력한 문구가 있으면 해당 문구를 우선 표시하는 방식으로 구현한다.

### 5.6 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `client/src/pages/RegistrationCompletePage.tsx` | 입금 안내 문구 변경 (복식/단식 분기) |
| `client/src/pages/TournamentDetailPage.tsx` | 참가비 영역에 입금자명 안내 추가 |
| `client/src/pages/RegistrationPage.tsx` | 제출 전 입금 안내 표시 (선택) |

---

## 개발 우선순위 및 일정 제안

| 순번 | 항목 | 난이도 | 예상 작업량 | 의존성 |
|:---:|------|:---:|:---:|------|
| 1 | 소속 필드 추가 | 중 | DB 마이그레이션 + 프론트/백 수정 | 없음 |
| 2 | 사업자 정보 푸터 | 하 | 컴포넌트 1개 생성 + 레이아웃 삽입 | 없음 |
| 3 | 종목/급수 표시 | 하 | 프론트엔드 배지 렌더링 수정 | 없음 |
| 4 | 접수 관리 권한 이동 | 상 | 신규 페이지 + 권한 로직 + 라우트 | 없음 |
| 5 | 입금 안내 문구 | 하 | 텍스트 변경 + 조건 분기 | 없음 |

모든 항목은 상호 의존성이 없으므로 병렬 개발이 가능하다. 난이도가 낮은 항목(2, 3, 5)을 먼저 처리하고, 구조 변경이 큰 항목(1, 4)을 순차적으로 진행하는 것을 권장한다.

---

## 테스트 계획

각 항목별로 다음 vitest 테스트를 추가/수정한다.

| 항목 | 테스트 내용 |
|------|-------------|
| 1. 소속 필드 | registration.create에 affiliation 포함 제출 → DB 저장 확인, affiliation 미입력 시 에러 반환 확인 |
| 3. 종목/급수 | myRegistrations 응답에 eventType/skillLevel 포함 확인 (기존 통과) |
| 4. 권한 이동 | organizer가 타인 대회 접수 조회 시 FORBIDDEN 에러 확인 |
| 5. 입금 안내 | 프론트엔드 단위 테스트 (선택) |
