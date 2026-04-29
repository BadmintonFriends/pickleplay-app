# PicklePlay 커뮤니티(소셜) 기능 개발 기획서

**작성일:** 2026-04-29  
**작성자:** Manus AI  
**버전:** v3.0

## 1. 개요

PicklePlay 앱의 하단 탭 중 "샵" 탭을 **"소셜"** 탭으로 교체하여, 회원 간 소통이 가능한 커뮤니티 기능을 도입한다. 게시글(포스트) 작성, 이미지 첨부, 댓글, 좋아요, 공지 고정, 신고, 검색, 공유 등 종합적인 커뮤니티 기능을 제공하며, 닉네임 기반의 표시 체계를 적용한다. 업로드되는 이미지는 서버사이드에서 자동 리사이징하여 용량을 최적화하고, 내 글에 댓글/좋아요가 달리면 푸시 알림을 발송한다. 관리자(admin)는 부적절한 콘텐츠를 비공개 처리할 수 있으며, 슈퍼어드민(super_admin)은 게시글/댓글을 완전 삭제할 수 있다.

### 1.1 핵심 요구사항 요약

| 항목 | 내용 |
|------|------|
| **하단 탭 변경** | 샵(ShoppingBag) → 소셜(MessageSquare) |
| **공지글** | 관리자(admin/super_admin)만 작성 가능, 피드 상단 고정 |
| **포스트** | 제목 + 본문 텍스트 + 이미지(최대 10장, 자동 리사이징) |
| **댓글** | 텍스트만 가능, 대댓글 불가 (1단 댓글) |
| **좋아요** | 게시글에 좋아요/취소 토글, 좋아요 수 표시 |
| **검색** | 게시글 제목/내용 키워드 검색 |
| **공유** | 게시글 외부 링크 공유 (Web Share API + OG 메타태그) |
| **신고** | 부적절한 글/댓글 신고, 관리자 검토/처리 |
| **비공개 처리** | 관리자가 부적절한 글/댓글을 비공개 처리 (원문 보존, "관리자가 비공개처리한 게시글/댓글입니다" 표시) |
| **슈퍼어드민 삭제** | 슈퍼어드민만 게시글/댓글 완전 삭제 가능 |
| **푸시 알림** | 내 글에 댓글/좋아요 시 알림 발송 |
| **이미지 리사이징** | 업로드 시 서버사이드 자동 리사이징 (최대 1200px, WebP 변환) |
| **작성 권한** | 로그인(회원가입 완료) 사용자만 글/댓글 작성 가능 |
| **닉네임** | 닉네임 표시, 미설정 시 닉네임 설정 후 작성 가능 |

### 1.2 역할(Role) 체계

PicklePlay의 사용자 역할은 3단계로 구분되며, 커뮤니티 기능에서 각 역할별 권한이 다르다.

| 역할 | DB 값 | 설명 |
|------|-------|------|
| **일반 회원** | `user` | 글/댓글 작성, 좋아요, 신고 가능. 본인 글/댓글만 수정/삭제 |
| **관리자** | `admin` | 회원 기능 + 공지 작성/고정, 글/댓글 **비공개 처리**, 신고 관리 |
| **슈퍼어드민** | `super_admin` | 관리자 기능 + 글/댓글 **완전 삭제** (DB에서 물리 삭제) |

> **비공개 처리 vs 삭제의 차이:** 비공개 처리는 원문 데이터를 보존하면서 일반 사용자에게 "관리자가 비공개처리한 게시글/댓글입니다"라고 표시하는 것이며, 관리자/슈퍼어드민은 원문을 계속 확인할 수 있다. 삭제는 DB에서 물리적으로 제거하는 것으로 슈퍼어드민만 가능하다.

## 2. DB 스키마 설계

### 2.1 users 테이블 변경

기존 `users` 테이블에 닉네임 및 알림 설정 컬럼을 추가한다.

```sql
ALTER TABLE users ADD COLUMN nickname VARCHAR(30) UNIQUE;
ALTER TABLE users ADD COLUMN pushEnabled BOOLEAN DEFAULT TRUE NOT NULL;
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `nickname` | `varchar(30)`, UNIQUE, nullable | 커뮤니티에서 표시되는 닉네임. 미설정 시 NULL |
| `pushEnabled` | `boolean`, default true | 푸시 알림 수신 여부 |

**Drizzle 스키마 변경:**

```ts
// drizzle/schema.ts - users 테이블에 추가
nickname: varchar("nickname", { length: 30 }).unique(),
pushEnabled: boolean("pushEnabled").default(true).notNull(),
```

### 2.2 posts 테이블 (신규)

```ts
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),           // FK → users.id
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isNotice: boolean("isNotice").default(false).notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),    // 관리자 비공개 처리
  hiddenBy: int("hiddenBy"),                                  // 비공개 처리한 관리자 ID
  hiddenAt: timestamp("hiddenAt"),                            // 비공개 처리 일시
  hiddenReason: text("hiddenReason"),                         // 비공개 처리 사유
  commentCount: int("commentCount").default(0).notNull(),
  likeCount: int("likeCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `int`, PK, auto | 게시글 고유 ID |
| `authorId` | `int`, NOT NULL | 작성자 ID (FK → users.id) |
| `title` | `varchar(200)`, NOT NULL | 게시글 제목 |
| `content` | `text`, NOT NULL | 게시글 본문 |
| `isPinned` | `boolean`, default false | 상단 고정 여부 (관리자 전용) |
| `isNotice` | `boolean`, default false | 공지글 여부 (관리자 전용) |
| `isHidden` | `boolean`, default false | 비공개 처리 여부 (관리자 전용) |
| `hiddenBy` | `int`, nullable | 비공개 처리한 관리자 ID (FK → users.id) |
| `hiddenAt` | `timestamp`, nullable | 비공개 처리 일시 |
| `hiddenReason` | `text`, nullable | 비공개 처리 사유 |
| `commentCount` | `int`, default 0 | 댓글 수 (비정규화) |
| `likeCount` | `int`, default 0 | 좋아요 수 (비정규화) |
| `createdAt` | `timestamp` | 작성일시 |
| `updatedAt` | `timestamp` | 수정일시 |

### 2.3 post_images 테이블 (신규)

```ts
export const postImages = mysqlTable("post_images", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  thumbnailFileKey: varchar("thumbnailFileKey", { length: 500 }).notNull(),
  width: int("width"),
  height: int("height"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `int`, PK, auto | 이미지 고유 ID |
| `postId` | `int`, NOT NULL | 게시글 ID (FK → posts.id) |
| `imageUrl` | `varchar(1000)`, NOT NULL | 리사이징된 이미지 URL (최대 1200px) |
| `thumbnailUrl` | `varchar(1000)`, NOT NULL | 썸네일 URL (400px, 목록용) |
| `fileKey` | `varchar(500)`, NOT NULL | S3 파일 키 (삭제용) |
| `thumbnailFileKey` | `varchar(500)`, NOT NULL | S3 썸네일 파일 키 |
| `width` | `int`, nullable | 원본 이미지 너비 (레이아웃 계산용) |
| `height` | `int`, nullable | 원본 이미지 높이 |
| `sortOrder` | `int`, default 0 | 이미지 순서 |
| `createdAt` | `timestamp` | 업로드 일시 |

### 2.4 comments 테이블 (신규)

```ts
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),    // 관리자 비공개 처리
  hiddenBy: int("hiddenBy"),                                  // 비공개 처리한 관리자 ID
  hiddenAt: timestamp("hiddenAt"),                            // 비공개 처리 일시
  hiddenReason: text("hiddenReason"),                         // 비공개 처리 사유
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `int`, PK, auto | 댓글 고유 ID |
| `postId` | `int`, NOT NULL | 게시글 ID (FK → posts.id) |
| `authorId` | `int`, NOT NULL | 작성자 ID (FK → users.id) |
| `content` | `text`, NOT NULL | 댓글 내용 (텍스트만) |
| `isHidden` | `boolean`, default false | 비공개 처리 여부 |
| `hiddenBy` | `int`, nullable | 비공개 처리한 관리자 ID |
| `hiddenAt` | `timestamp`, nullable | 비공개 처리 일시 |
| `hiddenReason` | `text`, nullable | 비공개 처리 사유 |
| `createdAt` | `timestamp` | 작성일시 |
| `updatedAt` | `timestamp` | 수정일시 |

### 2.5 post_likes 테이블 (신규)

```ts
export const postLikes = mysqlTable("post_likes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
// UNIQUE 제약: (postId, userId) 조합
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `int`, PK, auto | 좋아요 고유 ID |
| `postId` | `int`, NOT NULL | 게시글 ID (FK → posts.id) |
| `userId` | `int`, NOT NULL | 좋아요 누른 사용자 ID (FK → users.id) |
| `createdAt` | `timestamp` | 좋아요 일시 |

`(postId, userId)` 복합 유니크 인덱스를 설정하여 한 사용자가 같은 게시글에 중복 좋아요를 방지한다.

### 2.6 reports 테이블 (신규)

```ts
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  targetType: mysqlEnum("targetType", ["post", "comment"]).notNull(),
  targetId: int("targetId").notNull(),
  reason: mysqlEnum("reason", [
    "spam",           // 스팸/광고
    "abuse",          // 욕설/비방
    "inappropriate",  // 부적절한 내용
    "misinformation", // 허위 정보
    "other",          // 기타
  ]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"])
    .default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `int`, PK, auto | 신고 고유 ID |
| `reporterId` | `int`, NOT NULL | 신고자 ID (FK → users.id) |
| `targetType` | `enum('post','comment')` | 신고 대상 유형 |
| `targetId` | `int`, NOT NULL | 신고 대상 ID (posts.id 또는 comments.id) |
| `reason` | `enum(...)` | 신고 사유 |
| `description` | `text`, nullable | 상세 설명 (기타 선택 시) |
| `status` | `enum(...)`, default 'pending' | 처리 상태 |
| `reviewedBy` | `int`, nullable | 처리한 관리자 ID |
| `reviewedAt` | `timestamp`, nullable | 처리 일시 |
| `reviewNote` | `text`, nullable | 관리자 처리 메모 |
| `createdAt` | `timestamp` | 신고 일시 |

### 2.7 notifications 테이블 (신규)

```ts
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["comment", "like", "notice", "report_result", "hidden"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  relatedPostId: int("relatedPostId"),
  relatedCommentId: int("relatedCommentId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `int`, PK, auto | 알림 고유 ID |
| `userId` | `int`, NOT NULL | 알림 수신자 ID |
| `type` | `enum(...)` | 알림 유형 (댓글, 좋아요, 공지, 신고결과, 비공개처리) |
| `title` | `varchar(200)` | 알림 제목 |
| `body` | `text` | 알림 본문 |
| `relatedPostId` | `int`, nullable | 관련 게시글 ID |
| `relatedCommentId` | `int`, nullable | 관련 댓글 ID |
| `isRead` | `boolean`, default false | 읽음 여부 |
| `createdAt` | `timestamp` | 알림 생성 일시 |

### 2.8 ER 다이어그램

```
users (1) ──── (N) posts ──── (N) post_images
  │                  │
  │                  ├── (N) comments ──── (N) reports
  │                  │
  │                  ├── (N) post_likes
  │                  │
  │                  └── (N) reports
  │
  ├── (N) notifications
  │
  └── (N) reports (as reporter)
```

## 3. 서버 API 설계 (tRPC 라우터)

### 3.1 닉네임 관련

| Procedure | 타입 | 인증 | 설명 |
|-----------|------|------|------|
| `user.setNickname` | mutation | protected | 닉네임 설정/변경 (중복 체크 포함) |
| `user.checkNickname` | query | protected | 닉네임 사용 가능 여부 확인 |

**닉네임 규칙:**

- 2~15자, 한글/영문/숫자/밑줄(_)만 허용
- 중복 불가 (UNIQUE 제약)
- 욕설/비속어 필터링 (기본 금칙어 목록 적용)

### 3.2 게시글(Post) 관련

| Procedure | 타입 | 인증 | 설명 |
|-----------|------|------|------|
| `community.listPosts` | query | public | 게시글 목록 (커서 페이지네이션, 공지 분리, 비공개글 필터링) |
| `community.getPost` | query | public | 게시글 상세 (이미지, 댓글, 좋아요 여부 포함) |
| `community.createPost` | mutation | protected | 게시글 작성 (닉네임 필수) |
| `community.updatePost` | mutation | protected | 게시글 수정 (본인 글만) |
| `community.deletePost` | mutation | super_admin | 게시글 완전 삭제 (슈퍼어드민만) |
| `community.hidePost` | mutation | admin | 게시글 비공개 처리 (관리자 이상) |
| `community.unhidePost` | mutation | admin | 게시글 비공개 해제 (관리자 이상) |
| `community.uploadImage` | mutation | protected | 이미지 업로드 (S3, 자동 리사이징) |
| `community.togglePin` | mutation | admin | 공지글 상단 고정/해제 |
| `community.searchPosts` | query | public | 게시글 검색 (제목+내용 키워드) |

**listPosts 응답 구조:**

```ts
{
  pinnedPosts: Post[],       // isPinned=true인 공지글 (항상 상단)
  posts: Post[],             // 일반 게시글 (최신순)
  nextCursor: number | null,
}
```

비공개 처리된 게시글(`isHidden=true`)은 일반 사용자에게 제목/내용 대신 "관리자가 비공개처리한 게시글입니다"로 표시된다. 관리자/슈퍼어드민에게는 원문이 표시되며 비공개 상태 배지가 함께 노출된다.

**searchPosts 요청/응답:**

```ts
// 요청
{ query: string, cursor?: number, limit?: number }

// 응답
{ posts: Post[], nextCursor: number | null, totalCount: number }
```

### 3.3 댓글(Comment) 관련

| Procedure | 타입 | 인증 | 설명 |
|-----------|------|------|------|
| `community.listComments` | query | public | 특정 게시글의 댓글 목록 (오래된순, 비공개 댓글 필터링) |
| `community.createComment` | mutation | protected | 댓글 작성 (닉네임 필수, 알림 발송) |
| `community.deleteComment` | mutation | super_admin | 댓글 완전 삭제 (본인 또는 슈퍼어드민) |
| `community.hideComment` | mutation | admin | 댓글 비공개 처리 (관리자 이상) |
| `community.unhideComment` | mutation | admin | 댓글 비공개 해제 (관리자 이상) |

비공개 처리된 댓글(`isHidden=true`)은 일반 사용자에게 "관리자가 비공개처리한 댓글입니다"로 표시된다.

### 3.4 좋아요(Like) 관련

| Procedure | 타입 | 인증 | 설명 |
|-----------|------|------|------|
| `community.toggleLike` | mutation | protected | 좋아요 토글 (추가/취소, 알림 발송) |

**toggleLike 동작:**

좋아요가 없으면 추가하고, 이미 있으면 취소한다. `posts.likeCount`를 트랜잭션으로 동기화하며, 좋아요 추가 시 게시글 작성자에게 알림을 발송한다. 본인 글에 본인이 좋아요를 누른 경우에는 알림을 발송하지 않는다.

```ts
// 응답
{ liked: boolean, likeCount: number }
```

### 3.5 신고(Report) 관련

| Procedure | 타입 | 인증 | 설명 |
|-----------|------|------|------|
| `community.reportContent` | mutation | protected | 글/댓글 신고 |
| `community.listReports` | query | admin | 신고 목록 조회 (관리자) |
| `community.reviewReport` | mutation | admin | 신고 처리 (관리자) |

**reportContent 요청:**

```ts
{
  targetType: "post" | "comment",
  targetId: number,
  reason: "spam" | "abuse" | "inappropriate" | "misinformation" | "other",
  description?: string,  // reason이 "other"일 때 필수
}
```

**신고 처리 흐름:**

1. 사용자가 글/댓글에서 "신고" 버튼 클릭
2. 신고 사유 선택 모달 표시 (5가지 사유 + 기타 상세 입력)
3. 서버에서 `reports` 레코드 생성, 동일 대상에 대한 중복 신고 방지 (같은 사용자가 같은 대상을 재신고 불가)
4. 관리자 페이지에서 신고 목록 확인 및 처리 (비공개 처리, 삭제, 또는 신고 기각)
5. 처리 완료 시 신고자에게 결과 알림 발송

### 3.6 비공개 처리 (관리자) 관련

| Procedure | 타입 | 인증 | 설명 |
|-----------|------|------|------|
| `community.hidePost` | mutation | admin | 게시글 비공개 처리 + 작성자에게 알림 |
| `community.unhidePost` | mutation | admin | 게시글 비공개 해제 |
| `community.hideComment` | mutation | admin | 댓글 비공개 처리 + 작성자에게 알림 |
| `community.unhideComment` | mutation | admin | 댓글 비공개 해제 |

**비공개 처리 요청:**

```ts
{
  targetId: number,
  reason?: string,  // 비공개 처리 사유 (선택)
}
```

**비공개 처리 동작:**

1. 관리자가 게시글/댓글의 ⋯ 메뉴에서 "비공개 처리" 클릭
2. 선택적으로 비공개 사유 입력
3. 서버에서 `isHidden=true`, `hiddenBy`, `hiddenAt`, `hiddenReason` 업데이트
4. 작성자에게 "회원님의 게시글/댓글이 관리자에 의해 비공개 처리되었습니다" 알림 발송
5. 일반 사용자에게는 "관리자가 비공개처리한 게시글/댓글입니다" 메시지 표시
6. 관리자/슈퍼어드민에게는 원문이 표시되며 [비공개] 배지 + 비공개 해제 버튼 노출

### 3.7 게시글 공유 관련

게시글 공유는 별도 API 없이 **클라이언트사이드**에서 처리한다. 각 게시글은 고유 URL(`/social/posts/:id`)을 가지며, Web Share API와 클립보드 복사를 활용한다.

**서버사이드 OG 메타태그:**

게시글 상세 페이지 접근 시 서버에서 동적으로 OG 메타태그를 생성하여, 카카오톡/라인/인스타그램 등에서 링크 미리보기가 표시되도록 한다.

```ts
// server에서 /social/posts/:id 요청 시 HTML에 주입
<meta property="og:title" content="{게시글 제목}" />
<meta property="og:description" content="{본문 미리보기 100자}" />
<meta property="og:image" content="{첫 번째 이미지 썸네일 URL}" />
<meta property="og:url" content="https://pickleplay.manus.space/social/posts/{id}" />
<meta property="og:type" content="article" />
```

**클라이언트 공유 동작:**

```ts
// Web Share API 지원 시 (모바일 브라우저 대부분)
if (navigator.share) {
  await navigator.share({
    title: post.title,
    text: post.content.slice(0, 100),
    url: `${window.location.origin}/social/posts/${post.id}`,
  });
} else {
  // 폴백: 클립보드에 URL 복사
  await navigator.clipboard.writeText(
    `${window.location.origin}/social/posts/${post.id}`
  );
  toast("링크가 복사되었습니다");
}
```

### 3.8 알림(Notification) 관련

| Procedure | 타입 | 인증 | 설명 |
|-----------|------|------|------|
| `notification.list` | query | protected | 내 알림 목록 (최신순, 페이지네이션) |
| `notification.markRead` | mutation | protected | 알림 읽음 처리 (단건/전체) |
| `notification.unreadCount` | query | protected | 읽지 않은 알림 수 |
| `notification.updateSettings` | mutation | protected | 알림 설정 변경 (on/off) |

**알림 발송 트리거:**

| 이벤트 | 수신자 | 알림 내용 |
|--------|--------|----------|
| 내 글에 댓글 | 게시글 작성자 | "{닉네임}님이 댓글을 남겼습니다" |
| 내 글에 좋아요 | 게시글 작성자 | "{닉네임}님이 좋아요를 눌렀습니다" |
| 새 공지글 등록 | 전체 회원 | "새 공지가 등록되었습니다: {제목}" |
| 신고 처리 완료 | 신고자 | "신고하신 내용이 처리되었습니다" |
| 글/댓글 비공개 처리 | 작성자 | "회원님의 게시글/댓글이 관리자에 의해 비공개 처리되었습니다" |

알림은 인앱 알림(notifications 테이블)으로 저장하며, `notifyOwner` 헬퍼를 활용하여 앱 소유자에게도 주요 이벤트(다수 신고 접수 등)를 전달한다. 사용자가 `pushEnabled`를 false로 설정한 경우 인앱 알림은 저장하되 푸시 발송은 생략한다.

### 3.9 권한 매트릭스

| 기능 | 비로그인 | 회원 (닉네임 X) | 회원 (닉네임 O) | 관리자 (admin) | 슈퍼어드민 (super_admin) |
|------|---------|---------------|---------------|---------------|------------------------|
| 글 목록 조회 | O | O | O | O | O |
| 글 상세 조회 | O | O | O | O (비공개 원문 열람) | O (비공개 원문 열람) |
| 글 검색 | O | O | O | O | O |
| 글 작성 | X | X (닉네임 설정 유도) | O | O | O |
| 글 수정 | X | X | O (본인만) | O (본인만) | O (본인만) |
| 글 비공개 처리 | X | X | X | **O** | **O** |
| 글 비공개 해제 | X | X | X | **O** | **O** |
| 글 완전 삭제 | X | X | O (본인만) | X | **O (모든 글)** |
| 댓글 작성 | X | X (닉네임 설정 유도) | O | O | O |
| 댓글 비공개 처리 | X | X | X | **O** | **O** |
| 댓글 비공개 해제 | X | X | X | **O** | **O** |
| 댓글 완전 삭제 | X | X | O (본인만) | X | **O (모든 댓글)** |
| 좋아요 | X | O | O | O | O |
| 게시글 공유 | O | O | O | O | O |
| 신고 | X | O | O | O | O |
| 공지 작성 | X | X | X | O | O |
| 공지 고정/해제 | X | X | X | O | O |
| 신고 목록/처리 | X | X | X | O | O |
| 알림 조회 | X | O | O | O | O |

## 4. 이미지 리사이징 설계

### 4.1 리사이징 전략

이미지 업로드 시 서버사이드에서 **sharp** 라이브러리를 사용하여 자동 리사이징한다. 원본은 저장하지 않고, 리사이징된 버전만 S3에 저장하여 스토리지 비용을 절감한다.

| 버전 | 최대 크기 | 포맷 | 품질 | 용도 |
|------|----------|------|------|------|
| **메인 이미지** | 1200px (긴 변 기준) | WebP | 80% | 게시글 상세 보기 |
| **썸네일** | 400px (긴 변 기준) | WebP | 70% | 피드 목록 미리보기 |

### 4.2 업로드 플로우

```
[클라이언트]                    [서버]                         [S3]
    |                            |                              |
    |-- 이미지 선택 -->          |                              |
    |-- POST /uploadImage -->    |                              |
    |   (multipart/form-data)    |                              |
    |                            |-- sharp 리사이징 -->         |
    |                            |   (1200px WebP + 400px 썸네일)|
    |                            |-- storagePut(main) ------>   |
    |                            |-- storagePut(thumbnail) -->  |
    |                            |<-- { imageUrl, thumbnailUrl } |
    |<-- { imageUrl, thumbUrl }  |                              |
    |                            |                              |
    |-- createPost({ images }) -->                              |
    |                            |-- post_images INSERT -->     |
```

### 4.3 클라이언트 사전 검증

서버 부하를 줄이기 위해 클라이언트에서 업로드 전 사전 검증을 수행한다.

| 항목 | 제한 |
|------|------|
| 파일 크기 | 최대 10MB per image |
| 파일 형식 | JPEG, PNG, WebP, HEIC |
| 이미지 수 | 최대 10장 per post |

HEIC 포맷(iPhone 기본)은 서버에서 sharp를 통해 WebP로 변환한다.

## 5. 검색 기능 설계

### 5.1 검색 방식

MySQL의 `FULLTEXT INDEX`를 활용한 전문 검색을 기본으로 하되, 한글 검색 특성을 고려하여 `LIKE` 기반 폴백을 함께 지원한다.

**인덱스 설정:**

```sql
ALTER TABLE posts ADD FULLTEXT INDEX ft_posts_search (title, content) WITH PARSER ngram;
```

MySQL의 `ngram` 파서는 한글을 포함한 CJK 문자를 2-gram 단위로 분리하여 인덱싱하므로, "피클볼"을 검색하면 "피클", "클볼" 토큰으로 매칭된다.

### 5.2 검색 UI

```
+---------------------------+
|  검색 게시글 검색...       |  <-- 소셜 피드 상단 검색바
+---------------------------+
|  최근 검색어               |  <-- 로컬 스토리지 저장 (최대 10개)
|  피클볼  대회  포항        |
+---------------------------+
|  검색 결과 (12건)          |
|  +---------------------+  |
|  | 제목 (키워드 하이라이트)|
|  | 본문 미리보기...     |  |
|  +---------------------+  |
|  ...                      |
+---------------------------+
```

**검색 동작:**

- 최소 2자 이상 입력 시 검색 실행 (디바운스 300ms)
- 검색 결과는 관련도순으로 정렬, 커서 기반 페이지네이션
- 검색 키워드는 제목/내용에서 하이라이트 표시
- 최근 검색어는 클라이언트 로컬 스토리지에 저장 (최대 10개)

## 6. 신고 기능 설계

### 6.1 신고 사유 분류

| 코드 | 한글 라벨 | 설명 |
|------|----------|------|
| `spam` | 스팸/광고 | 상업적 광고, 도배 |
| `abuse` | 욕설/비방 | 욕설, 인신공격, 혐오 발언 |
| `inappropriate` | 부적절한 내용 | 선정적, 폭력적 콘텐츠 |
| `misinformation` | 허위 정보 | 거짓 정보, 사기 |
| `other` | 기타 | 직접 입력 (description 필수) |

### 6.2 신고 처리 플로우

```
[사용자]              [서버]              [관리자/슈퍼어드민]
   |                    |                    |
   |-- 신고 접수 -->    |                    |
   |                    |-- reports INSERT -->|
   |                    |                    |
   |                    |                    |-- 신고 목록 확인
   |                    |                    |-- 처리 결정
   |                    |                    |   +- 비공개 처리 (admin)
   |                    |                    |   +- 완전 삭제 (super_admin만)
   |                    |                    |   +- 신고 기각
   |                    |<-- reviewReport ---|
   |<-- 결과 알림 ------|                    |
```

### 6.3 관리자 신고 관리 UI

기존 AdminPage에 "신고 관리" 탭을 추가한다.

| 표시 정보 | 설명 |
|----------|------|
| 신고 일시 | 신고 접수 시간 |
| 신고자 | 신고한 사용자 닉네임 |
| 대상 | 게시글 또는 댓글 (클릭 시 원문 보기) |
| 사유 | 신고 사유 + 상세 설명 |
| 상태 | pending / reviewed / resolved / dismissed |
| 처리 버튼 | "비공개 처리" (admin) / "완전 삭제" (super_admin만) / "기각" / "원문 보기" |

## 7. 비공개 처리 설계

### 7.1 비공개 처리 개요

관리자(admin) 이상 권한을 가진 사용자가 부적절한 게시글이나 댓글을 **비공개 처리**할 수 있다. 비공개 처리는 원문 데이터를 DB에 보존하면서 일반 사용자에게는 대체 메시지를 표시하는 소프트 히든(soft-hide) 방식이다.

### 7.2 비공개 처리 시 표시 방식

**일반 사용자 (비로그인 포함) 화면:**

```
+---------------------------+
| [비공개]                   |
| 관리자가 비공개처리한       |
| 게시글입니다.              |
|                           |
| 이 게시글은 커뮤니티       |
| 운영정책에 따라 비공개     |
| 처리되었습니다.            |
+---------------------------+
```

댓글의 경우:

```
+---------------------------+
| [비공개] 관리자가          |
| 비공개처리한 댓글입니다.   |
+---------------------------+
```

**관리자/슈퍼어드민 화면:**

```
+---------------------------+
| [비공개] 원래 제목         |  <-- 비공개 배지 + 원문 표시
| 원래 본문 내용...          |
|                           |
| 비공개 사유: 욕설 포함     |
| 처리자: 관리자닉네임       |
| 처리일: 2026.04.29        |
|                           |
| [비공개 해제]              |  <-- 관리자 전용 버튼
+---------------------------+
```

### 7.3 비공개 처리 vs 삭제 비교

| 항목 | 비공개 처리 (admin) | 완전 삭제 (super_admin) |
|------|-------------------|----------------------|
| 실행 권한 | admin, super_admin | super_admin만 |
| DB 데이터 | 보존 (isHidden=true) | 물리 삭제 (DELETE) |
| 일반 사용자 표시 | "관리자가 비공개처리한 게시글/댓글입니다" | 표시되지 않음 |
| 관리자 표시 | 원문 + [비공개] 배지 | 표시되지 않음 |
| 복구 가능 | O (비공개 해제) | X (복구 불가) |
| 관련 데이터 | 좋아요/댓글 유지 | 이미지/좋아요/댓글 함께 삭제 |
| 사용 시나리오 | 경미한 위반, 임시 조치 | 심각한 위반, 법적 문제 |

## 8. 게시글 공유 설계

### 8.1 공유 방식

게시글 공유는 **Web Share API**를 우선 사용하고, 미지원 브라우저에서는 **클립보드 복사**로 폴백한다.

| 환경 | 공유 방식 | 설명 |
|------|----------|------|
| 모바일 (Chrome, Safari) | Web Share API | OS 네이티브 공유 시트 (카카오톡, 라인, 메시지 등) |
| 데스크톱 (Chrome 93+) | Web Share API | 브라우저 공유 다이얼로그 |
| 미지원 브라우저 | 클립보드 복사 | URL 복사 + 토스트 "링크가 복사되었습니다" |

### 8.2 OG 메타태그 (링크 미리보기)

외부 메신저/SNS에서 게시글 링크를 공유할 때 미리보기가 표시되도록 서버사이드에서 동적 OG 메타태그를 생성한다.

**서버 미들웨어 (Express):**

```ts
// /social/posts/:id 경로에 대한 OG 태그 주입
app.get("/social/posts/:id", async (req, res, next) => {
  const post = await getPostById(Number(req.params.id));
  if (!post) return next();
  
  // HTML에 OG 메타태그 주입
  const ogTags = `
    <meta property="og:title" content="${escapeHtml(post.title)}" />
    <meta property="og:description" content="${escapeHtml(post.content.slice(0, 100))}" />
    <meta property="og:image" content="${post.images[0]?.thumbnailUrl || defaultOgImage}" />
    <meta property="og:url" content="${req.protocol}://${req.get('host')}/social/posts/${post.id}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="PicklePlay" />
  `;
  // index.html의 <head>에 주입 후 응답
});
```

### 8.3 공유 UI

게시글 상세 페이지와 피드 카드에 공유 버튼을 배치한다.

**게시글 상세 페이지:**

```
+---------------------------+
| <- 뒤로가기   [공유] [메뉴]|  <-- 헤더에 공유 버튼 (Share2 아이콘)
+---------------------------+
```

**피드 카드:**

```
+---------------------------+
| 좋아요 5  댓글 12  [공유]  |  <-- 하단 액션 바에 공유 버튼
+---------------------------+
```

## 9. 푸시 알림 설계

### 9.1 알림 아키텍처

PicklePlay는 PWA가 아닌 웹앱이므로, 브라우저 Push API 대신 **인앱 알림 시스템**을 구현한다. 알림은 `notifications` 테이블에 저장되며, 사용자가 앱에 접속할 때 읽지 않은 알림을 표시한다.

### 9.2 알림 표시 UI

```
+---------------------------+
|  AppHeader    알림(3)      |  <-- 헤더에 알림 아이콘 + 읽지 않은 수 배지
+---------------------------+

-- 알림 아이콘 클릭 시 --

+---------------------------+
|  알림                      |
|  +---------------------+  |
|  | * 피클러님이 댓글을   |  <-- 읽지 않은 알림은 파란 점
|  |    남겼습니다         |
|  |    3분 전             |
|  +---------------------+  |
|  +---------------------+  |
|  |    피클러님이 좋아요를 |  <-- 읽은 알림은 점 없음
|  |    눌렀습니다         |
|  |    1시간 전           |
|  +---------------------+  |
|                           |
|  [모두 읽음 처리]          |
+---------------------------+
```

### 9.3 알림 폴링 전략

실시간 WebSocket 대신 **폴링 방식**을 사용한다. 앱이 포그라운드에 있을 때 30초 간격으로 `notification.unreadCount`를 호출하여 새 알림 여부를 확인한다. 알림 목록 페이지에 진입하면 전체 알림을 로드한다.

```ts
// 클라이언트 폴링 (React Query refetchInterval)
const { data: unreadCount } = trpc.notification.unreadCount.useQuery(
  undefined,
  { refetchInterval: 30_000 }  // 30초마다 갱신
);
```

## 10. 프론트엔드 UI 설계

### 10.1 네비게이션 변경

**하단 탭바 변경사항:**

| 기존 | 변경 후 |
|------|---------|
| 홈 / 대회 / 코트예약 / **샵** / 프로필 | 홈 / 대회 / 코트예약 / **소셜** / 프로필 |
| ShoppingBag 아이콘 | MessageSquare 아이콘 |
| `/shop` 경로 | `/social` 경로 |

**AppLayout.tsx 수정:**

```ts
// 변경 전
{ path: "/shop", label: "샵", icon: ShoppingBag },

// 변경 후
{ path: "/social", label: "소셜", icon: MessageSquare },
```

### 10.2 소셜 피드 페이지 (SocialPage)

```
+---------------------------+
|  AppHeader        알림(3)  |
+---------------------------+
|  소셜 / 피클볼 커뮤니티    |
|  검색 게시글 검색...       |  <-- 검색바
+---------------------------+
|  공지글 영역               |  <-- isPinned=true, 접힘/펼침
|  +---------------------+  |
|  | [공지] 대회 안내...  |  |
|  +---------------------+  |
+---------------------------+
|  일반 게시글 피드          |  <-- 무한 스크롤
|  +---------------------+  |
|  | 닉네임 . 3시간 전    |  |
|  | 제목                 |  |
|  | 본문 미리보기...      |  |
|  | (썸네일 이미지)       |  |
|  | 좋아요5 댓글12 [공유] |  |
|  +---------------------+  |
|  ...                      |
+---------------------------+
|  [글쓰기 FAB 버튼]        |  <-- 우하단 플로팅 버튼
+---------------------------+
```

**게시글 카드 구성요소:**

- 작성자 닉네임 + 작성 시간 (상대 시간)
- 게시글 제목 (굵게, 1줄 말줄임)
- 본문 미리보기 (최대 2줄 말줄임)
- 이미지 썸네일 (있을 경우, 가로 스크롤)
- 좋아요 수 + 댓글 수 + 공유 버튼
- 비공개 게시글: "관리자가 비공개처리한 게시글입니다" 표시 (회색 배경)

### 10.3 게시글 상세 페이지 (PostDetailPage)

```
+---------------------------+
|  <- 뒤로가기  [공유] [메뉴]|  <-- 메뉴: 수정(본인), 비공개(관리자), 삭제(슈퍼어드민/본인), 신고(타인)
+---------------------------+
|  [공지] 배지 (공지일 때)   |
|  [비공개] 배지 (비공개일 때)|  <-- 관리자에게만 표시
|  제목                      |
|  닉네임 . 2026.04.29      |
+---------------------------+
|  본문 텍스트               |
|                           |
|  이미지 슬라이더           |  <-- 좌우 스와이프, 인디케이터
|  [1] [2] [3] ... [10]    |
+---------------------------+
|  좋아요 5  댓글 12  [공유] |  <-- 좋아요 토글 + 공유 버튼
+---------------------------+
|  댓글 12개                 |
|  +---------------------+  |
|  | 닉네임 . 1시간 전 [.]|  <-- [.] 메뉴: 삭제(본인/슈퍼어드민), 비공개(관리자), 신고(타인)
|  | 댓글 내용            |  |
|  +---------------------+  |
|  +---------------------+  |
|  | [비공개] 관리자가     |  <-- 비공개 댓글 (일반 사용자 화면)
|  | 비공개처리한 댓글입니다|
|  +---------------------+  |
|  ...                      |
+---------------------------+
|  [댓글 입력창]  [전송]     |  <-- 하단 고정
+---------------------------+
```

### 10.4 글쓰기 페이지 (CreatePostPage)

```
+---------------------------+
|  <- 취소        [등록]     |
+---------------------------+
|  제목 입력                 |
|  -------------------------+
|  본문 입력                 |
|                           |
+---------------------------+
|  이미지 첨부 (0/10)       |
|  [+] [img1] [img2] ...   |  <-- 가로 스크롤, 삭제 가능, 업로드 진행률
+---------------------------+
|  [ ] 공지로 등록 (관리자)  |  <-- 관리자에게만 표시
+---------------------------+
```

### 10.5 닉네임 설정 모달

```
+---------------------------+
|                           |
|   닉네임을 설정해주세요    |
|   커뮤니티에서 사용할      |
|   닉네임을 입력하세요      |
|                           |
|   [닉네임 입력]            |
|   2~15자, 한글/영문/숫자   |
|                           |
|   [사용 가능]              |  <-- 실시간 중복 체크 (디바운스 500ms)
|                           |
|   [설정 완료]              |
+---------------------------+
```

### 10.6 신고 모달

```
+---------------------------+
|   신고하기                 |
|                           |
|   ( ) 스팸/광고            |
|   ( ) 욕설/비방            |
|   ( ) 부적절한 내용        |
|   ( ) 허위 정보            |
|   ( ) 기타                 |
|     [상세 설명 입력]       |  <-- 기타 선택 시 표시
|                           |
|   [신고 접수]              |
+---------------------------+
```

### 10.7 비공개 처리 확인 모달 (관리자 전용)

```
+---------------------------+
|   비공개 처리              |
|                           |
|   이 게시글/댓글을         |
|   비공개 처리하시겠습니까? |
|                           |
|   비공개 사유 (선택):      |
|   [사유 입력]              |
|                           |
|   비공개 처리 시 일반      |
|   사용자에게 "관리자가     |
|   비공개처리한 게시글/     |
|   댓글입니다"로 표시됩니다.|
|                           |
|   [취소]  [비공개 처리]    |
+---------------------------+
```

### 10.8 알림 페이지 (NotificationsPage)

```
+---------------------------+
|  <- 뒤로가기  [모두 읽음]  |
+---------------------------+
|  오늘                      |
|  +---------------------+  |
|  | * 피클러님이 댓글을   |  <-- 클릭 시 해당 게시글로 이동
|  |    남겼습니다         |
|  |    3분 전             |
|  +---------------------+  |
|  +---------------------+  |
|  | * 피클러님이 좋아요를  |
|  |    눌렀습니다         |
|  |    1시간 전           |
|  +---------------------+  |
|  +---------------------+  |
|  |   회원님의 게시글이   |  <-- 비공개 처리 알림
|  |   비공개 처리되었습니다|
|  |    2시간 전           |
|  +---------------------+  |
+---------------------------+
|  이번 주                   |
|  +---------------------+  |
|  |    새 공지가          |
|  |    등록되었습니다      |
|  |    3일 전             |
|  +---------------------+  |
+---------------------------+
```

## 11. 구현 단계 (Phase 계획)

### Phase A: 기반 작업 (DB + 닉네임)

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | `users` 테이블 변경 | `nickname`, `pushEnabled` 컬럼 추가 (마이그레이션) |
| 2 | 커뮤니티 테이블 생성 | `posts`, `post_images`, `comments`, `post_likes`, `reports`, `notifications` 6개 테이블 (isHidden, hiddenBy 등 비공개 컬럼 포함) |
| 3 | 닉네임 API | `user.setNickname`, `user.checkNickname` 구현 |
| 4 | 닉네임 설정 모달 | UI 구현 + 실시간 중복 체크 |
| 5 | 프로필 페이지 | 닉네임 표시/수정 기능 추가 |
| 6 | vitest | 닉네임 관련 테스트 |

### Phase B: 게시글 CRUD + 이미지 리사이징

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | sharp 설치 | `pnpm add sharp` |
| 2 | 이미지 업로드 API | `community.uploadImage` (리사이징 + S3 업로드) |
| 3 | 게시글 CRUD API | `listPosts`, `getPost`, `createPost`, `updatePost` |
| 4 | 비공개/삭제 API | `hidePost`, `unhidePost` (admin), `deletePost` (super_admin/본인) |
| 5 | vitest | 게시글 CRUD + 이미지 업로드 + 비공개/삭제 권한 테스트 |

### Phase C: 댓글 + 좋아요

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | 댓글 API | `listComments`, `createComment`, `deleteComment` (super_admin/본인) |
| 2 | 댓글 비공개 API | `hideComment`, `unhideComment` (admin) |
| 3 | 좋아요 API | `toggleLike` (트랜잭션, 비정규화 동기화) |
| 4 | vitest | 댓글 + 좋아요 + 비공개 권한 테스트 |

### Phase D: 신고 기능

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | 신고 API | `reportContent`, `listReports`, `reviewReport` (비공개 처리/삭제/기각 옵션) |
| 2 | 관리자 신고 관리 UI | AdminPage에 신고 탭 추가 (비공개 처리 버튼 + 슈퍼어드민 삭제 버튼) |
| 3 | vitest | 신고 관련 테스트 |

### Phase E: 알림 시스템

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | 알림 API | `notification.list`, `markRead`, `unreadCount`, `updateSettings` |
| 2 | 알림 발송 로직 | 댓글/좋아요/공지/신고결과/비공개처리 시 알림 생성 |
| 3 | 알림 UI | AppHeader 배지 + 알림 페이지 |
| 4 | vitest | 알림 관련 테스트 |

### Phase F: 검색 + 공유 기능

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | FULLTEXT INDEX | ngram 파서 기반 인덱스 생성 |
| 2 | 검색 API | `community.searchPosts` |
| 3 | 검색 UI | 검색바 + 결과 목록 + 최근 검색어 |
| 4 | 공유 기능 | Web Share API + 클립보드 폴백 |
| 5 | OG 메타태그 | 서버 미들웨어로 동적 OG 태그 생성 |
| 6 | vitest | 검색 + 공유 관련 테스트 |

### Phase G: 프론트엔드 UI 통합

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | 하단 탭바 변경 | 샵 → 소셜 |
| 2 | SocialPage | 피드 목록 (무한 스크롤, 검색바, 공지 고정, 비공개 표시) |
| 3 | PostDetailPage | 이미지 슬라이더, 댓글, 좋아요, 공유, 신고, 비공개 배지 |
| 4 | CreatePostPage | 이미지 첨부 (리사이징 진행률), 공지 체크 |
| 5 | NotificationsPage | 알림 목록, 읽음 처리, 비공개 알림 |
| 6 | 관리자 기능 UI | 비공개 처리 모달, 슈퍼어드민 삭제 확인 |
| 7 | App.tsx 라우트 | 신규 페이지 라우트 등록 |

### Phase H: 테스트 및 마무리

| 순서 | 작업 | 상세 |
|------|------|------|
| 1 | 전체 vitest | 모든 테스트 실행 및 통과 확인 |
| 2 | 권한 테스트 | admin 비공개 처리, super_admin 삭제 권한 검증 |
| 3 | 체크포인트 | 최종 체크포인트 저장 |

## 12. 예상 일정

| Phase | 작업 | 예상 소요 |
|-------|------|----------|
| A | 기반 작업 (DB + 닉네임) | 1회 세션 |
| B | 게시글 CRUD + 이미지 리사이징 + 비공개/삭제 | 1~2회 세션 |
| C | 댓글 + 좋아요 + 비공개 | 1회 세션 |
| D | 신고 기능 | 1회 세션 |
| E | 알림 시스템 | 1회 세션 |
| F | 검색 + 공유 기능 | 1회 세션 |
| G | 프론트엔드 UI 통합 | 2~3회 세션 |
| H | 테스트 및 마무리 | 0.5회 세션 |
| **합계** | | **약 9~11회 세션** |

각 Phase는 독립적으로 체크포인트를 저장하여 롤백이 가능하도록 한다.

## 13. 향후 확장 가능성

현재 기획에는 포함하지 않지만, 추후 확장 가능한 기능 목록이다.

| 기능 | 설명 |
|------|------|
| 대댓글 | 댓글에 대한 답글 (2단 댓글) |
| 카테고리/태그 | 게시글 분류 (자유, 대회후기, 장비리뷰 등) |
| 사용자 차단 | 특정 사용자의 글/댓글 숨기기 |
| 인기글 | 좋아요/댓글 수 기반 인기글 섹션 |
| WebSocket 실시간 알림 | 폴링 대신 WebSocket으로 즉시 알림 |
| 이미지 갤러리 뷰 | 핀치 줌, 전체화면 갤러리 |
| 게시글 북마크 | 관심 게시글 저장 기능 |
| 작성자 프로필 | 닉네임 클릭 시 작성자 프로필 페이지 이동 |
