import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { storagePut } from "./storage";
import type { TrpcContext } from "./_core/context";

// Mock data constants for use in test assertions (outside vi.mock factory)
const mockPost = {
  id: 1, title: "테스트 게시글", content: "테스트 내용입니다", authorId: 10,
  isNotice: false, isPinned: false, isHidden: false,
  hiddenBy: null, hiddenAt: null, hiddenReason: null,
  commentCount: 2, likeCount: 3, createdAt: new Date(), updatedAt: new Date(),
};
const mockUser = {
  id: 10, openId: "test-user-1", name: "테스트유저", nickname: "테스터",
  phone: "01012345678", gender: "male", birthDate: "1995-05-15",
  role: "user" as const, pushEnabled: true,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const mockAdminUser = {
  id: 1, openId: "admin-1", name: "관리자", nickname: "관리자닉",
  phone: "01011112222", gender: "male", birthDate: "1990-01-01",
  role: "admin" as const, pushEnabled: true,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

// ─── Mock db module ─────────────────────────────────────
vi.mock("./db", () => {
  const _mockPost = {
    id: 1, title: "테스트 게시글", content: "테스트 내용입니다", authorId: 10,
    isNotice: false, isPinned: false, isHidden: false,
    hiddenBy: null, hiddenAt: null, hiddenReason: null,
    commentCount: 2, likeCount: 3, createdAt: new Date(), updatedAt: new Date(),
  };
  const _mockUser = {
    id: 10, openId: "test-user-1", name: "테스트유저", nickname: "테스터",
    phone: "01012345678", gender: "male", birthDate: "1995-05-15",
    role: "user" as const, pushEnabled: true,
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  const _mockAdminUser = {
    id: 1, openId: "admin-1", name: "관리자", nickname: "관리자닉",
    phone: "01011112222", gender: "male", birthDate: "1990-01-01",
    role: "admin" as const, pushEnabled: true,
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  const _mockComment = {
    id: 1, postId: 1, authorId: 10, content: "테스트 댓글",
    isHidden: false, hiddenBy: null, hiddenAt: null, hiddenReason: null,
    createdAt: new Date(),
  };
  return {
    // User helpers
    getUserById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 10) return { ..._mockUser };
      if (id === 1) return { ..._mockAdminUser };
      return undefined;
    }),
    getUserByPhone: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
    getAllUsers: vi.fn().mockResolvedValue([]),
    updateUserRole: vi.fn().mockResolvedValue(undefined),

    // Nickname
    isNicknameAvailable: vi.fn().mockResolvedValue(true),
    updateNickname: vi.fn().mockResolvedValue(undefined),

    // Posts
    listPosts: vi.fn().mockResolvedValue({
      items: [{ ..._mockPost }],
      nextCursor: null,
    }),
    getPostById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return { ..._mockPost };
      if (id === 999) return null;
      return { ..._mockPost, id };
    }),
    createPost: vi.fn().mockResolvedValue(100),
    updatePost: vi.fn().mockResolvedValue(undefined),
    deletePost: vi.fn().mockResolvedValue(undefined),

    // Images
    createPostImage: vi.fn().mockResolvedValue(1),
    getImagesByPost: vi.fn().mockResolvedValue([
      {
        id: 1,
        postId: 1,
        imageUrl: "https://cdn.example.com/img.webp",
        thumbnailUrl: "https://cdn.example.com/thumb.webp",
        fileKey: "community/10/img-123.webp",
        thumbnailFileKey: "community/10/thumb-123.webp",
        width: 800,
        height: 600,
        sortOrder: 0,
      },
    ]),
    deletePostImage: vi.fn().mockResolvedValue(undefined),
    deletePostImagesByPost: vi.fn().mockResolvedValue(undefined),

    // Likes
    toggleLike: vi.fn().mockResolvedValue(true),
    hasUserLiked: vi.fn().mockResolvedValue(false),
    getLikedPostIds: vi.fn().mockResolvedValue([]),

    // Comments
    getCommentsByPost: vi.fn().mockResolvedValue({
      items: [{ ..._mockComment }],
      nextCursor: null,
    }),
    getCommentById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return { ..._mockComment };
      return null;
    }),
    createComment: vi.fn().mockResolvedValue(50),
    deleteComment: vi.fn().mockResolvedValue(undefined),

    blockUser: vi.fn().mockResolvedValue(undefined),
    getBlockedUserIds: vi.fn().mockResolvedValue([]),
    isUserBlocked: vi.fn().mockResolvedValue(false),

    // Reports
    createReport: vi.fn().mockResolvedValue(1),
    listReports: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    updateReport: vi.fn().mockResolvedValue(undefined),

    // Notifications
    createNotification: vi.fn().mockResolvedValue(undefined),
    listNotifications: vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          userId: 10,
          type: "comment",
          title: "새 댓글",
          body: "테스터님이 댓글을 남겼습니다",
          relatedPostId: 1,
          relatedCommentId: 50,
          isRead: false,
          createdAt: new Date(),
        },
      ],
      nextCursor: null,
    }),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
    getUnreadNotificationCount: vi.fn().mockResolvedValue(3),
    updatePushEnabled: vi.fn().mockResolvedValue(undefined),

    // Tournament stubs (needed because appRouter includes tournament router)
    getAllTournaments: vi.fn().mockResolvedValue([]),
    getTournamentById: vi.fn().mockResolvedValue(undefined),
    getFullTournamentData: vi.fn().mockResolvedValue(null),
    getEventsByTournament: vi.fn().mockResolvedValue([]),
    getEventRegistrationCounts: vi.fn().mockResolvedValue([]),
    getAgeGroupsByTournament: vi.fn().mockResolvedValue([]),
    getPostersByTournament: vi.fn().mockResolvedValue([]),
    getDocumentsByTournament: vi.fn().mockResolvedValue([]),
    generateRegistrationNumber: vi.fn().mockResolvedValue("R001-0001"),
    createRegistration: vi.fn().mockResolvedValue(1),
    createPlayer: vi.fn().mockResolvedValue(1),
    incrementEventTeamCount: vi.fn().mockResolvedValue(undefined),
    decrementEventTeamCount: vi.fn().mockResolvedValue(undefined),
    getRegistrationsByUser: vi.fn().mockResolvedValue([]),
    getRegistrationById: vi.fn().mockResolvedValue(undefined),
    getRegistrationWithPlayers: vi.fn().mockResolvedValue(null),
    getPlayersByRegistration: vi.fn().mockResolvedValue([]),
    deletePlayersByRegistration: vi.fn().mockResolvedValue(undefined),
    updateRegistration: vi.fn().mockResolvedValue(undefined),
    getRegistrationsWithPlayers: vi.fn().mockResolvedValue([]),
    createTournament: vi.fn().mockResolvedValue(100),
    updateTournament: vi.fn().mockResolvedValue(undefined),
    deleteEventsByTournament: vi.fn().mockResolvedValue(undefined),
    createTournamentEvent: vi.fn().mockResolvedValue(1),
    updateEventSortOrders: vi.fn().mockResolvedValue(undefined),
    deleteAgeGroupsByTournament: vi.fn().mockResolvedValue(undefined),
    createAgeGroup: vi.fn().mockResolvedValue(1),
    deletePoster: vi.fn().mockResolvedValue(undefined),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    getKprRating: vi.fn().mockResolvedValue(null),
    initKprRating: vi.fn().mockResolvedValue(undefined),
    getKprLeaderboard: vi.fn().mockResolvedValue([]),
    getKprTotalParticipants: vi.fn().mockResolvedValue(0),
    getKprRank: vi.fn().mockResolvedValue(1),
    getRecentMatches: vi.fn().mockResolvedValue([]),
    getPlayerById: vi.fn().mockResolvedValue({ id: 1, registrationId: 1, name: "테스트선수", phone: "01012345678", giftSize: "L" }),
    getDb: vi.fn().mockResolvedValue(null),
    // Phase 38: tournament_organizers
    getTournamentOrganizers: vi.fn().mockResolvedValue([]),
    isTournamentOrganizer: vi.fn().mockResolvedValue(false),
    addTournamentOrganizer: vi.fn().mockResolvedValue(undefined),
    removeTournamentOrganizer: vi.fn().mockResolvedValue(undefined),
    getUserManagedTournaments: vi.fn().mockResolvedValue([]),
    searchUsers: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.jpg", key: "test-key" }),
}));

vi.mock("./sms", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  verifyCode: vi.fn().mockResolvedValue({ success: true }),
  normalizePhoneToDigits: vi.fn().mockImplementation((phone: string) => phone.replace(/\D/g, "")),
  sendSmsMessage: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  },
}));

vi.mock("sharp", () => {
  const mockSharp = () => ({
    resize: () => mockSharp(),
    webp: () => mockSharp(),
    toBuffer: () => Promise.resolve(Buffer.from("mock")),
    metadata: () => Promise.resolve({ width: 800, height: 600 }),
  });
  return { default: mockSharp };
});

// ─── Context helpers ────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 10,
    openId: "test-user-1",
    email: "user@test.com",
    name: "테스트유저",
    phone: "01012345678",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(role: "admin" | "super_admin" | "user" = "admin"): TrpcContext {
  return createUserContext({ id: 1, openId: "admin-1", name: "관리자", role });
}

// ─── Import mocked db for assertions ────────────────────
import * as db from "./db";

// ─── Tests ──────────────────────────────────────────────

describe("community.nickname", () => {
  it("checks nickname availability (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.community.nickname.check({ nickname: "테스터" });
    expect(result.available).toBe(true);
    expect(db.isNicknameAvailable).toHaveBeenCalledWith("테스터");
  });

  it("sets nickname (authenticated)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.nickname.set({ nickname: "새닉네임" });
    expect(result.success).toBe(true);
    expect(db.updateNickname).toHaveBeenCalledWith(10, "새닉네임");
  });

  it("rejects nickname with special chars", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.nickname.set({ nickname: "bad@name!" }))
      .rejects.toThrow("닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다");
  });

  it("rejects duplicate nickname", async () => {
    vi.mocked(db.isNicknameAvailable).mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.nickname.set({ nickname: "중복닉" }))
      .rejects.toThrow("이미 사용 중인 닉네임입니다");
  });

  it("requires auth for set", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.community.nickname.set({ nickname: "테스트" }))
      .rejects.toThrow();
  });
});

describe("community.post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations
    vi.mocked(db.getPostById).mockImplementation(async (id: number) => {
      if (id === 1) return { ...mockPost };
      if (id === 999) return null;
      return { ...mockPost, id };
    });
    vi.mocked(db.getUserById).mockImplementation(async (id: number) => {
      if (id === 10) return { ...mockUser } as any;
      if (id === 1) return { ...mockAdminUser } as any;
      return undefined;
    });
  });

  it("lists posts (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.community.post.list({ limit: 20 });
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(db.listPosts).toHaveBeenCalled();
  });

  it("gets post detail (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.community.post.detail({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.title).toBe("테스트 게시글");
    expect(result.images).toBeDefined();
    expect(result.images.length).toBeGreaterThan(0);
    expect(result.images[0].fileKey).toBe("community/10/img-123.webp");
  });

  it("returns storage keys when uploading images", async () => {
    vi.mocked(storagePut)
      .mockResolvedValueOnce({
        url: "https://cdn.example.com/dev/community/10/img.webp",
        key: "dev/community/10/img.webp",
      })
      .mockResolvedValueOnce({
        url: "https://cdn.example.com/dev/community/10/thumb.webp",
        key: "dev/community/10/thumb.webp",
      });

    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.image.upload({
      base64: Buffer.from("image").toString("base64"),
      mimeType: "image/png",
      fileName: "image.png",
    });

    expect(result.fileKey).toBe("dev/community/10/img.webp");
    expect(result.thumbnailFileKey).toBe("dev/community/10/thumb.webp");
  });

  it("returns 404 for non-existent post", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.community.post.detail({ id: 999 }))
      .rejects.toThrow("게시글을 찾을 수 없습니다");
  });

  it("creates post (authenticated with nickname)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.post.create({
      title: "새 게시글",
      content: "새 내용",
      images: [],
    });
    expect(result.id).toBe(100);
    expect(db.createPost).toHaveBeenCalled();
  });

  it("rejects blocked community content", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.post.create({
      title: "카지노 홍보",
      content: "새 내용",
      images: [],
    })).rejects.toThrow("커뮤니티 이용약관에 따라 등록할 수 없는 내용이 포함되어 있습니다.");
  });

  it("rejects post creation without nickname", async () => {
    vi.mocked(db.getUserById).mockResolvedValueOnce({
      ...mockUser,
      nickname: null,
    } as any);
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.post.create({
      title: "새 게시글",
      content: "새 내용",
      images: [],
    })).rejects.toThrow("닉네임을 먼저 설정해주세요");
  });

  it("updates post (author only)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.post.update({
      id: 1,
      title: "수정된 제목",
      content: "수정된 내용",
    });
    expect(result.success).toBe(true);
    expect(db.updatePost).toHaveBeenCalledWith(1, { title: "수정된 제목", content: "수정된 내용" });
  });

  it("updates post with images", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.post.update({
      id: 1,
      title: "수정된 제목",
      content: "수정된 내용",
      images: [
        {
          imageUrl: "https://cdn.example.com/new.webp",
          thumbnailUrl: "https://cdn.example.com/new-thumb.webp",
          fileKey: "community/10/new.webp",
          thumbnailFileKey: "community/10/new-thumb.webp",
          width: 1200,
          height: 900,
          sortOrder: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
    expect(db.deletePostImagesByPost).toHaveBeenCalledWith(1);
    expect(db.createPostImage).toHaveBeenCalled();
  });

  it("rejects update by non-author", async () => {
    vi.mocked(db.getPostById).mockResolvedValueOnce({ ...mockPost, authorId: 999 });
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.post.update({
      id: 1,
      title: "수정",
      content: "내용",
    })).rejects.toThrow("본인의 글만 수정할 수 있습니다");
  });

  it("deletes post (author)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.post.delete({ id: 1 });
    expect(result.success).toBe(true);
    expect(db.deletePost).toHaveBeenCalledWith(1);
  });

  it("rejects delete by non-author non-admin", async () => {
    vi.mocked(db.getPostById).mockResolvedValueOnce({ ...mockPost, authorId: 999 });
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.post.delete({ id: 1 }))
      .rejects.toThrow("삭제 권한이 없습니다");
  });

  it("toggles like (authenticated)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.post.toggleLike({ postId: 1 });
    expect(result.liked).toBe(true);
    expect(db.toggleLike).toHaveBeenCalledWith(1, 10);
  });

  it("requires auth for like", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.community.post.toggleLike({ postId: 1 }))
      .rejects.toThrow();
  });

  it("toggles pin (admin only)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.community.post.togglePin({ id: 1 });
    expect(result.success).toBe(true);
    expect(result.isPinned).toBe(true);
  });

  it("rejects togglePin for regular user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.post.togglePin({ id: 1 }))
      .rejects.toThrow();
  });
});

describe("community.comment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getPostById).mockImplementation(async (id: number) => {
      if (id === 1) return { ...mockPost };
      return null;
    });
    vi.mocked(db.getUserById).mockImplementation(async (id: number) => {
      if (id === 10) return { ...mockUser } as any;
      if (id === 1) return { ...mockAdminUser } as any;
      return undefined;
    });
  });

  it("lists comments (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.community.comment.list({ postId: 1 });
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].authorName).toBe("테스터");
  });

  it("creates comment (authenticated)", async () => {
    // Post author is 10, commenter is user 10 (same), so no notification
    // To test notification, make post author different
    vi.mocked(db.getPostById).mockResolvedValueOnce({ ...mockPost, authorId: 999 });
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.comment.create({
      postId: 1,
      content: "새 댓글입니다",
    });
    expect(result.id).toBe(50);
    expect(db.createComment).toHaveBeenCalled();
    // Should notify post author (different from commenter)
    expect(db.createNotification).toHaveBeenCalled();
  });

  it("rejects blocked comment content", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.comment.create({
      postId: 1,
      content: "불법토토 홍보",
    })).rejects.toThrow("커뮤니티 이용약관에 따라 등록할 수 없는 내용이 포함되어 있습니다.");
  });

  it("does not notify self-comment", async () => {
    // Post author is 10, commenter is also 10
    const caller = appRouter.createCaller(createUserContext());
    await caller.community.comment.create({ postId: 1, content: "자기 댓글" });
    // createNotification should NOT be called since author == commenter
    expect(db.createNotification).not.toHaveBeenCalled();
  });

  it("requires auth for comment creation", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.community.comment.create({ postId: 1, content: "댓글" }))
      .rejects.toThrow();
  });
});

describe("community.report", () => {
  it("creates report (authenticated)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.report.create({
      targetType: "post",
      targetId: 1,
      reason: "spam",
    });
    expect(result.id).toBe(1);
    expect(db.createReport).toHaveBeenCalled();
  });

  it("blocks author when reporting with blockAuthor", async () => {
    vi.mocked(db.getPostById).mockResolvedValueOnce({ ...mockPost, authorId: 99 });
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.report.create({
      targetType: "post",
      targetId: 1,
      reason: "abuse",
      blockAuthor: true,
    });
    expect(result.blockedUserId).toBe(99);
    expect(db.blockUser).toHaveBeenCalledWith(10, 99);
  });

  it("requires description for 'other' reason", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.report.create({
      targetType: "post",
      targetId: 1,
      reason: "other",
    })).rejects.toThrow("기타 사유를 입력해주세요");
  });

  it("lists reports (admin only)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.community.report.list({});
    expect(result.items).toBeDefined();
  });

  it("rejects report list for regular user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.community.report.list({}))
      .rejects.toThrow();
  });
});

describe("community.notification", () => {
  it("lists notifications (authenticated)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.notification.list({ limit: 20 });
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].type).toBe("comment");
  });

  it("gets unread count (authenticated)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.notification.unreadCount();
    expect(result.count).toBe(3);
  });

  it("marks single notification as read", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.notification.markRead({ id: 1 });
    expect(result.success).toBe(true);
    expect(db.markNotificationRead).toHaveBeenCalledWith(1, 10);
  });

  it("marks all notifications as read", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.notification.markRead({});
    expect(result.success).toBe(true);
    expect(db.markAllNotificationsRead).toHaveBeenCalledWith(10);
  });

  it("updates push settings", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.community.notification.updateSettings({ pushEnabled: false });
    expect(result.success).toBe(true);
    expect(db.updatePushEnabled).toHaveBeenCalledWith(10, false);
  });

  it("requires auth for notifications", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.community.notification.list({ limit: 20 }))
      .rejects.toThrow();
  });
});
