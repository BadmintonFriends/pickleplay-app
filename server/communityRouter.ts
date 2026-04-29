import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, superAdminProcedure } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import sharp from "sharp";

// ─── Nickname ──────────────────────────────────────────
const nicknameRouter = router({
  check: publicProcedure
    .input(z.object({ nickname: z.string().min(2).max(20) }))
    .query(async ({ input }) => {
      const available = await db.isNicknameAvailable(input.nickname);
      return { available };
    }),

  set: protectedProcedure
    .input(z.object({ nickname: z.string().min(2).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const trimmed = input.nickname.trim();
      // Validate: no spaces, no special chars except underscore
      if (!/^[a-zA-Z0-9가-힣_]+$/.test(trimmed)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다" });
      }
      const available = await db.isNicknameAvailable(trimmed, ctx.user.id);
      if (!available) {
        throw new TRPCError({ code: "CONFLICT", message: "이미 사용 중인 닉네임입니다" });
      }
      await db.updateNickname(ctx.user.id, trimmed);
      return { success: true };
    }),
});

// ─── Image Upload with Resizing ────────────────────────
const imageRouter = router({
  upload: protectedProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");

      // Resize with sharp
      const mainImage = await sharp(buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const thumbnail = await sharp(buffer)
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();

      const metadata = await sharp(buffer).metadata();

      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const mainKey = `community/${ctx.user.id}/img-${timestamp}-${rand}.webp`;
      const thumbKey = `community/${ctx.user.id}/thumb-${timestamp}-${rand}.webp`;

      const mainResult = await storagePut(mainKey, mainImage, "image/webp");
      const thumbResult = await storagePut(thumbKey, thumbnail, "image/webp");

      return {
        imageUrl: mainResult.url,
        thumbnailUrl: thumbResult.url,
        fileKey: mainKey,
        thumbnailFileKey: thumbKey,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      };
    }),
});

// ─── Posts ─────────────────────────────────────────────
const postRouter = router({
  list: publicProcedure
    .input(z.object({
      cursor: z.number().optional(),
      limit: z.number().min(1).max(50).default(20),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const result = await db.listPosts({ cursor: input.cursor, limit: input.limit, search: input.search });

      // Get pinned notices first (only on first page, no search)
      let pinnedNotices: any[] = [];
      if (!input.cursor && !input.search) {
        const allPosts = result.items;
        pinnedNotices = allPosts.filter(p => p.isNotice && p.isPinned && !p.isHidden);
        result.items = allPosts.filter(p => !(p.isNotice && p.isPinned));
      }

      // Get author info and images for all posts
      const allItems = [...pinnedNotices, ...result.items];
      const authorIds = Array.from(new Set(allItems.map(p => p.authorId)));
      const authorMap = new Map<number, { name: string | null; nickname: string | null }>();
      for (const id of authorIds) {
        const user = await db.getUserById(id);
        if (user) authorMap.set(id, { name: user.name, nickname: user.nickname });
      }

      // Get first image for each post (thumbnail)
      const postIds = allItems.map(p => p.id);
      const imageMap = new Map<number, string>();
      for (const pid of postIds) {
        const images = await db.getImagesByPost(pid);
        if (images.length > 0) imageMap.set(pid, images[0].thumbnailUrl);
      }

      // Get liked status if user is logged in
      let likedPostIds: number[] = [];
      if (ctx.user && postIds.length > 0) {
        likedPostIds = await db.getLikedPostIds(ctx.user.id, postIds);
      }

      const isAdmin = ctx.user && ['admin', 'super_admin'].includes(ctx.user.role);

      const mapPost = (p: any) => ({
        id: p.id,
        title: p.title,
        content: p.isHidden && !isAdmin ? "" : p.content,
        isHidden: p.isHidden,
        hiddenReason: isAdmin ? p.hiddenReason : null,
        isNotice: p.isNotice,
        isPinned: p.isPinned,
        authorId: p.authorId,
        authorName: authorMap.get(p.authorId)?.nickname ?? authorMap.get(p.authorId)?.name ?? "알 수 없음",
        thumbnailUrl: imageMap.get(p.id) ?? null,
        commentCount: p.commentCount,
        likeCount: p.likeCount,
        isLiked: likedPostIds.includes(p.id),
        createdAt: p.createdAt,
      });

      return {
        pinnedNotices: pinnedNotices.map(mapPost),
        items: result.items.map(mapPost),
        nextCursor: result.nextCursor,
      };
    }),

  detail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const post = await db.getPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다" });

      const isAdmin = ctx.user && ['admin', 'super_admin'].includes(ctx.user.role);
      const author = await db.getUserById(post.authorId);
      const images = await db.getImagesByPost(post.id);
      const isLiked = ctx.user ? await db.hasUserLiked(post.id, ctx.user.id) : false;

      return {
        id: post.id,
        title: post.isHidden && !isAdmin ? "관리자가 비공개처리한 게시글입니다" : post.title,
        content: post.isHidden && !isAdmin ? "" : post.content,
        isHidden: post.isHidden,
        hiddenReason: isAdmin ? post.hiddenReason : null,
        isNotice: post.isNotice,
        isPinned: post.isPinned,
        authorId: post.authorId,
        authorName: author?.nickname ?? author?.name ?? "알 수 없음",
        images: images.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          fileKey: img.fileKey,
          thumbnailFileKey: img.thumbnailFileKey,
          width: img.width,
          height: img.height,
        })),
        commentCount: post.commentCount,
        likeCount: post.likeCount,
        isLiked,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1).max(5000),
      images: z.array(z.object({
        imageUrl: z.string(),
        thumbnailUrl: z.string(),
        fileKey: z.string(),
        thumbnailFileKey: z.string(),
        width: z.number(),
        height: z.number(),
      })).max(10).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check nickname
      const user = await db.getUserById(ctx.user.id);
      if (!user?.nickname) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "닉네임을 먼저 설정해주세요" });
      }

      const postId = await db.createPost({
        authorId: ctx.user.id,
        title: input.title,
        content: input.content,
      });

      // Save images
      for (let i = 0; i < input.images.length; i++) {
        const img = input.images[i];
        await db.createPostImage({
          postId,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          fileKey: img.fileKey,
          thumbnailFileKey: img.thumbnailFileKey,
          width: img.width,
          height: img.height,
          sortOrder: i,
        });
      }

      return { id: postId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200),
      content: z.string().min(1).max(5000),
      images: z.array(z.object({
        imageUrl: z.string(),
        thumbnailUrl: z.string(),
        fileKey: z.string(),
        thumbnailFileKey: z.string(),
        width: z.number(),
        height: z.number(),
        sortOrder: z.number(),
      })).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await db.getPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "본인의 글만 수정할 수 있습니다" });
      await db.updatePost(input.id, { title: input.title, content: input.content });

      // Update images if provided
      if (input.images !== undefined) {
        // Delete existing images
        await db.deletePostImagesByPost(input.id);
        // Insert new images
        for (const img of input.images) {
          await db.createPostImage({
            postId: input.id,
            imageUrl: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl,
            fileKey: img.fileKey,
            thumbnailFileKey: img.thumbnailFileKey,
            width: img.width,
            height: img.height,
            sortOrder: img.sortOrder,
          });
        }
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const post = await db.getPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      // Only author can delete their own post, or super_admin can delete any
      if (post.authorId !== ctx.user.id && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "삭제 권한이 없습니다" });
      }
      await db.deletePost(input.id);
      return { success: true };
    }),

  toggleLike: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const liked = await db.toggleLike(input.postId, ctx.user.id);
      // Send notification if liked and not self-like
      if (liked) {
        const post = await db.getPostById(input.postId);
        if (post && post.authorId !== ctx.user.id) {
          const user = await db.getUserById(ctx.user.id);
          const displayName = user?.nickname ?? user?.name ?? "누군가";
          await db.createNotification({
            userId: post.authorId,
            type: "like",
            title: "좋아요",
            body: `${displayName}님이 좋아요를 눌렀습니다`,
            relatedPostId: input.postId,
          });
        }
      }
      return { liked };
    }),

  // Toggle pin (admin)
  togglePin: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const post = await db.getPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updatePost(input.id, { isPinned: !post.isPinned } as any);
      return { success: true, isPinned: !post.isPinned };
    }),

  // Admin: pin/unpin notice
  toggleNotice: adminProcedure
    .input(z.object({ id: z.number(), isNotice: z.boolean(), isPinned: z.boolean() }))
    .mutation(async ({ input }) => {
      await db.updatePost(input.id, { isNotice: input.isNotice, isPinned: input.isPinned });
      // If setting as notice, notify all users
      if (input.isNotice && input.isPinned) {
        const post = await db.getPostById(input.id);
        if (post) {
          const allUsers = await db.getAllUsers();
          for (const u of allUsers) {
            await db.createNotification({
              userId: u.id,
              type: "notice",
              title: "새 공지",
              body: `새 공지가 등록되었습니다: ${post.title}`,
              relatedPostId: post.id,
            });
          }
        }
      }
      return { success: true };
    }),

  // Admin: hide/unhide
  hide: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const post = await db.getPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updatePost(input.id, {
        isHidden: true,
        hiddenBy: ctx.user.id,
        hiddenAt: new Date(),
        hiddenReason: input.reason ?? null,
      } as any);
      // Notify author
      await db.createNotification({
        userId: post.authorId,
        type: "hidden",
        title: "게시글 비공개 처리",
        body: "회원님의 게시글이 관리자에 의해 비공개 처리되었습니다",
        relatedPostId: post.id,
      });
      return { success: true };
    }),

  unhide: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.updatePost(input.id, {
        isHidden: false,
        hiddenBy: null,
        hiddenAt: null,
        hiddenReason: null,
      } as any);
      return { success: true };
    }),

  // Super admin: force delete any post
  forceDelete: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deletePost(input.id);
      return { success: true };
    }),
});

// ─── Comments ──────────────────────────────────────────
const commentRouter = router({
  list: publicProcedure
    .input(z.object({
      postId: z.number(),
      cursor: z.number().optional(),
      limit: z.number().min(1).max(100).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const result = await db.getCommentsByPost(input.postId, { cursor: input.cursor, limit: input.limit });
      const isAdmin = ctx.user && ['admin', 'super_admin'].includes(ctx.user.role);

      // Get author info
      const authorIds = Array.from(new Set(result.items.map(c => c.authorId)));
      const authorMap = new Map<number, { name: string | null; nickname: string | null }>();
      for (const id of authorIds) {
        const user = await db.getUserById(id);
        if (user) authorMap.set(id, { name: user.name, nickname: user.nickname });
      }

      return {
        items: result.items.map(c => ({
          id: c.id,
          postId: c.postId,
          content: c.isHidden && !isAdmin ? "관리자가 비공개처리한 댓글입니다" : c.content,
          isHidden: c.isHidden,
          hiddenReason: isAdmin ? c.hiddenReason : null,
          authorId: c.authorId,
          authorName: authorMap.get(c.authorId)?.nickname ?? authorMap.get(c.authorId)?.name ?? "알 수 없음",
          createdAt: c.createdAt,
        })),
        nextCursor: result.nextCursor,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      postId: z.number(),
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check nickname
      const user = await db.getUserById(ctx.user.id);
      if (!user?.nickname) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "닉네임을 먼저 설정해주세요" });
      }

      const commentId = await db.createComment({
        postId: input.postId,
        authorId: ctx.user.id,
        content: input.content,
      });

      // Notify post author
      const post = await db.getPostById(input.postId);
      if (post && post.authorId !== ctx.user.id) {
        const displayName = user.nickname ?? user.name ?? "누군가";
        await db.createNotification({
          userId: post.authorId,
          type: "comment",
          title: "새 댓글",
          body: `${displayName}님이 댓글을 남겼습니다`,
          relatedPostId: input.postId,
          relatedCommentId: commentId,
        });
      }

      return { id: commentId };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Only author or super_admin can delete
      const db2 = await db.getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { comments: commentsTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db2.select().from(commentsTable).where(eq(commentsTable.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (rows[0].authorId !== ctx.user.id && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "삭제 권한이 없습니다" });
      }
      await db.deleteComment(input.id, input.postId);
      return { success: true };
    }),

  // Admin: hide/unhide comment
  hide: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db2 = await db.getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { comments: commentsTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db2.select().from(commentsTable).where(eq(commentsTable.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      await db2.update(commentsTable).set({
        isHidden: true,
        hiddenBy: ctx.user.id,
        hiddenAt: new Date(),
        hiddenReason: input.reason ?? null,
      }).where(eq(commentsTable.id, input.id));
      // Notify author
      await db.createNotification({
        userId: rows[0].authorId,
        type: "hidden",
        title: "댓글 비공개 처리",
        body: "회원님의 댓글이 관리자에 의해 비공개 처리되었습니다",
        relatedPostId: rows[0].postId,
        relatedCommentId: input.id,
      });
      return { success: true };
    }),

  unhide: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db2 = await db.getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { comments: commentsTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db2.update(commentsTable).set({
        isHidden: false,
        hiddenBy: null,
        hiddenAt: null,
        hiddenReason: null,
      }).where(eq(commentsTable.id, input.id));
      return { success: true };
    }),

  // Super admin: force delete any comment
  forceDelete: superAdminProcedure
    .input(z.object({ id: z.number(), postId: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteComment(input.id, input.postId);
      return { success: true };
    }),
});

// ─── Reports ───────────────────────────────────────────
const reportRouter = router({
  create: protectedProcedure
    .input(z.object({
      targetType: z.enum(["post", "comment"]),
      targetId: z.number(),
      reason: z.enum(["spam", "abuse", "inappropriate", "misinformation", "other"]),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.reason === "other" && !input.description) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "기타 사유를 입력해주세요" });
      }
      try {
        const reportId = await db.createReport({
          reporterId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          description: input.description,
        });
        return { id: reportId };
      } catch (e: any) {
        if (e.message === "DUPLICATE_REPORT") {
          throw new TRPCError({ code: "CONFLICT", message: "이미 신고한 내용입니다" });
        }
        throw e;
      }
    }),

  list: adminProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      return db.listReports({ status: input.status, limit: input.limit, offset: input.offset });
    }),

  review: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["resolved", "dismissed"]),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateReport(input.id, {
        status: input.status,
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
      } as any);
      // Notify reporter
      const db2 = await db.getDb();
      if (db2) {
        const { reports: reportsTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db2.select().from(reportsTable).where(eq(reportsTable.id, input.id)).limit(1);
        if (rows.length > 0) {
          await db.createNotification({
            userId: rows[0].reporterId,
            type: "report_result",
            title: "신고 처리 결과",
            body: input.status === "resolved" ? "신고하신 내용이 처리되었습니다" : "신고하신 내용이 검토 후 기각되었습니다",
          });
        }
      }
      return { success: true };
    }),
});

// ─── Notifications ─────────────────────────────────────
const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({
      cursor: z.number().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      return db.listNotifications(ctx.user.id, { cursor: input.cursor, limit: input.limit });
    }),

  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await db.getUnreadNotificationCount(ctx.user.id);
      return { count };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        await db.markNotificationRead(input.id, ctx.user.id);
      } else {
        await db.markAllNotificationsRead(ctx.user.id);
      }
      return { success: true };
    }),

  updateSettings: protectedProcedure
    .input(z.object({ pushEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.updatePushEnabled(ctx.user.id, input.pushEnabled);
      return { success: true };
    }),
});

// ─── Export combined community router ──────────────────
export const communityRouter = router({
  nickname: nicknameRouter,
  image: imageRouter,
  post: postRouter,
  comment: commentRouter,
  report: reportRouter,
  notification: notificationRouter,
});
