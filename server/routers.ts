import { COOKIE_NAME, ONE_MONTH_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, superAdminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { sendVerificationCode, verifyCode, normalizePhoneToDigits, sendSmsMessage } from "./sms";
import { communityRouter } from "./communityRouter";
import { sdk } from "./_core/sdk";

// ─── Validation schemas ──────────────────────────────────
const playerSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식: YYYY-MM-DD"),
  phone: z.string().min(10, "전화번호를 입력해주세요"),
  giftSize: z.string().optional(),
  affiliation: z.string().min(1, "소속을 입력해주세요").max(100),
});

const registrationInputSchema = z.object({
  tournamentId: z.number(),
  tournamentEventId: z.number(),
  ageGroupId: z.number().optional(),
  isSelfParticipant: z.boolean(),
  players: z.array(playerSchema).min(1).max(2),
});

// ─── Tournament Router ──────────────────────────────────
const tournamentRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllTournaments();
  }),

  detail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const data = await db.getFullTournamentData(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "대회를 찾을 수 없습니다" });
      const counts = await db.getEventRegistrationCounts(input.id);
      const countMap = new Map(counts.map(c => [c.tournamentEventId, c.count]));
      const eventsWithCounts = data.events.map(e => ({
        ...e,
        currentTeams: countMap.get(e.id) ?? 0,
      }));
      return { ...data, events: eventsWithCounts };
    }),

  registrationStatus: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const counts = await db.getEventRegistrationCounts(input.tournamentId);
      const events = await db.getEventsByTournament(input.tournamentId);
      return events.map(e => {
        const count = counts.find(c => c.tournamentEventId === e.id)?.count ?? 0;
        return {
          eventId: e.id,
          eventType: e.eventType,
          skillLevel: e.skillLevel,
          maxTeams: e.maxTeams,
          currentTeams: count,
          isFull: count >= e.maxTeams,
        };
      });
    }),
});

// ─── Registration Router ────────────────────────────────
const registrationRouter = router({
  create: protectedProcedure
    .input(registrationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const tournament = await db.getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "대회를 찾을 수 없습니다" });
      if (tournament.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "접수 기간이 아닙니다" });

      const events = await db.getEventsByTournament(input.tournamentId);
      const event = events.find(e => e.id === input.tournamentEventId);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "종목을 찾을 수 없습니다" });

      const counts = await db.getEventRegistrationCounts(input.tournamentId);
      const currentCount = counts.find(c => c.tournamentEventId === event.id)?.count ?? 0;
      if (currentCount >= event.maxTeams) throw new TRPCError({ code: "BAD_REQUEST", message: "해당 종목의 접수가 마감되었습니다" });

      const isSingles = event.eventType === "남단" || event.eventType === "여단";
      if (isSingles && input.players.length !== 1) throw new TRPCError({ code: "BAD_REQUEST", message: "단식 종목은 1명만 등록 가능합니다" });
      if (!isSingles && input.players.length !== 2) throw new TRPCError({ code: "BAD_REQUEST", message: "복식 종목은 2명을 등록해야 합니다" });

      if (tournament.sizeOptions) {
        const validSizes = JSON.parse(tournament.sizeOptions) as string[];
        for (const player of input.players) {
          if (player.giftSize && !validSizes.includes(player.giftSize)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `유효하지 않은 사이즈입니다: ${player.giftSize}` });
          }
        }
      }

      if (tournament.hasAgeGroup && input.ageGroupId) {
        const ageGroups = await db.getAgeGroupsByTournament(input.tournamentId);
        const ageGroup = ageGroups.find(ag => ag.id === input.ageGroupId);
        if (!ageGroup) throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 연령대입니다" });
      }

      const registrationNumber = await db.generateRegistrationNumber(input.tournamentId);

      const regId = await db.createRegistration({
        tournamentId: input.tournamentId,
        tournamentEventId: input.tournamentEventId,
        userId: ctx.user.id,
        ageGroupId: input.ageGroupId ?? null,
        isSelfParticipant: input.isSelfParticipant,
        status: "pending",
        paymentStatus: "unpaid",
        paymentAmount: tournament.feePerTeam,
        registrationNumber,
      });

      for (let i = 0; i < input.players.length; i++) {
        await db.createPlayer({
          registrationId: regId,
          playerOrder: i + 1,
          name: input.players[i].name,
          birthDate: input.players[i].birthDate,
          phone: input.players[i].phone,
          giftSize: input.players[i].giftSize ?? null,
          affiliation: input.players[i].affiliation,
        });
      }

      await db.incrementEventTeamCount(input.tournamentEventId);

      return {
        registrationId: regId,
        registrationNumber,
        paymentAmount: tournament.feePerTeam,
        bankName: tournament.bankName,
        accountNumber: tournament.accountNumber,
        accountHolder: tournament.accountHolder,
        paymentNote: tournament.paymentNote,
      };
    }),

  bulkCreate: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      registrations: z.array(z.object({
        tournamentEventId: z.number(),
        ageGroupId: z.number().optional(),
        isSelfParticipant: z.boolean(),
        players: z.array(playerSchema).min(1).max(2),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const tournament = await db.getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "대회를 찾을 수 없습니다" });
      if (tournament.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "접수 기간이 아닙니다" });

      const results = [];
      for (const reg of input.registrations) {
        const registrationNumber = await db.generateRegistrationNumber(input.tournamentId);
        const regId = await db.createRegistration({
          tournamentId: input.tournamentId,
          tournamentEventId: reg.tournamentEventId,
          userId: ctx.user.id,
          ageGroupId: reg.ageGroupId ?? null,
          isSelfParticipant: reg.isSelfParticipant,
          status: "pending",
          paymentStatus: "unpaid",
          paymentAmount: tournament.feePerTeam,
          registrationNumber,
        });

        for (let i = 0; i < reg.players.length; i++) {
          await db.createPlayer({
            registrationId: regId,
            playerOrder: i + 1,
            name: reg.players[i].name,
            birthDate: reg.players[i].birthDate,
            phone: reg.players[i].phone,
            giftSize: reg.players[i].giftSize ?? null,
            affiliation: reg.players[i].affiliation,
          });
        }

        await db.incrementEventTeamCount(reg.tournamentEventId);
        results.push({ registrationId: regId, registrationNumber });
      }

      return {
        count: results.length,
        registrations: results,
        paymentAmount: tournament.feePerTeam * results.length,
        bankName: tournament.bankName,
        accountNumber: tournament.accountNumber,
        accountHolder: tournament.accountHolder,
      };
    }),

  myRegistrations: protectedProcedure.query(async ({ ctx }) => {
    const regs = await db.getRegistrationsByUser(ctx.user.id);
    const result = [];
    for (const reg of regs) {
      const playerList = await db.getPlayersByRegistration(reg.id);
      const tournament = await db.getTournamentById(reg.tournamentId);
      const events = await db.getEventsByTournament(reg.tournamentId);
      const event = events.find(e => e.id === reg.tournamentEventId);
      result.push({
        ...reg,
        players: playerList,
        tournamentName: tournament?.name ?? "",
        eventType: event?.eventType ?? "",
        skillLevel: event?.skillLevel ?? "",
      });
    }
    return result;
  }),

  detail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const reg = await db.getRegistrationWithPlayers(input.id);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "접수 내역을 찾을 수 없습니다" });
      if (reg.userId !== ctx.user.id && !['admin', 'super_admin'].includes(ctx.user.role)) {
        // 대회 관리자인지 확인
        const isOrganizer = await db.isTournamentOrganizer(reg.tournamentId, ctx.user.id);
        if (!isOrganizer) {
          throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
        }
      }
      return reg;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      players: z.array(playerSchema).min(1).max(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const reg = await db.getRegistrationById(input.id);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "접수 내역을 찾을 수 없습니다" });
      if (reg.userId !== ctx.user.id && !['admin', 'super_admin'].includes(ctx.user.role)) {
        const isOrganizer = await db.isTournamentOrganizer(reg.tournamentId, ctx.user.id);
        if (!isOrganizer) {
          throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
        }
      }
      if (reg.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "취소된 접수는 수정할 수 없습니다" });

      await db.deletePlayersByRegistration(input.id);
      for (let i = 0; i < input.players.length; i++) {
        await db.createPlayer({
          registrationId: input.id,
          playerOrder: i + 1,
          name: input.players[i].name,
          birthDate: input.players[i].birthDate,
          phone: input.players[i].phone,
          giftSize: input.players[i].giftSize ?? null,
          affiliation: input.players[i].affiliation,
        });
      }
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const reg = await db.getRegistrationById(input.id);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "접수 내역을 찾을 수 없습니다" });
      if (reg.userId !== ctx.user.id && !['admin', 'super_admin'].includes(ctx.user.role)) {
        const isOrganizer = await db.isTournamentOrganizer(reg.tournamentId, ctx.user.id);
        if (!isOrganizer) {
          throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
        }
      }
      if (reg.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 취소된 접수입니다" });

      await db.updateRegistration(input.id, { status: "cancelled" });
      await db.decrementEventTeamCount(reg.tournamentEventId);
      return { success: true };
    }),
});

// ─── Admin Router ───────────────────────────────────────

/** 대회 소유권 검증: admin/super_admin은 모든 대회, 일반 사용자는 tournament_organizers에 등록된 대회만 접근 가능 */
async function verifyTournamentOwnership(user: { id: number; role: string }, tournamentId: number) {
  if (user.role === "admin" || user.role === "super_admin") return;
  const isOrganizer = await db.isTournamentOrganizer(tournamentId, user.id);
  if (!isOrganizer) {
    throw new TRPCError({ code: "FORBIDDEN", message: "본인 대회만 수정할 수 있습니다" });
  }
}

const adminRouter = router({
  tournamentRegistrations: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      return db.getRegistrationsWithPlayers(input.tournamentId);
    }),

  updatePaymentStatus: protectedProcedure
    .input(z.object({
      registrationId: z.number(),
      paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const reg = await db.getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "접수 정보를 찾을 수 없습니다" });
      await verifyTournamentOwnership(ctx.user, reg.tournamentId);

      const updateData: Record<string, unknown> = {
        paymentStatus: input.paymentStatus,
      };

      if (input.paymentStatus === "paid") {
        updateData.status = "confirmed";
      } else if (input.paymentStatus === "refunded") {
        updateData.status = "cancelled";
        // 환불 시 팀 카운트 감소
        if (reg.status !== "cancelled") {
          await db.decrementEventTeamCount(reg.tournamentEventId);
        }
      } else {
        updateData.status = "pending";
      }

      await db.updateRegistration(input.registrationId, updateData as any);

      // 입금 완료 시 SMS 알림 전송
      if (input.paymentStatus === "paid") {
        try {
          const playerList = await db.getPlayersByRegistration(input.registrationId);
          const tournament = await db.getTournamentById(reg.tournamentId);
          const tournamentName = tournament?.name || "대회";
          const regNumber = reg.registrationNumber || `#${reg.id}`;

          // 대표 선수(1번) 전화번호로 SMS 발송
          const mainPlayer = playerList.find(p => p.playerOrder === 1) || playerList[0];
          if (mainPlayer?.phone) {
            const message = `[피클플레이] ${tournamentName} 참가비 입금이 확인되었습니다.\n접수번호: ${regNumber}\n참가가 확정되었습니다. 감사합니다!`;
            await sendSmsMessage(mainPlayer.phone, message);
          }
        } catch (smsError) {
          console.error("[SMS] 입금 완료 알림 발송 실패:", smsError);
          // SMS 실패해도 입금 상태 변경은 유지
        }
      }

      return { success: true };
    }),

  updateRegistrationStatus: protectedProcedure
    .input(z.object({
      registrationId: z.number(),
      status: z.enum(["pending", "confirmed", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const reg = await db.getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });
      await verifyTournamentOwnership(ctx.user, reg.tournamentId);
      if (input.status === "cancelled" && reg.status !== "cancelled") {
        await db.decrementEventTeamCount(reg.tournamentEventId);
      } else if (reg.status === "cancelled" && input.status !== "cancelled") {
        await db.incrementEventTeamCount(reg.tournamentEventId);
      }
      await db.updateRegistration(input.registrationId, { status: input.status });
      return { success: true };
    }),

  createTournament: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
      venue: z.string(),
      address: z.string(),
      organizerInfo: z.string().optional(),
      feePerTeam: z.number().default(0),
      giftDescription: z.string().optional(),
      sizeType: z.enum(["numeric", "alpha"]).default("numeric"),
      sizeOptions: z.string().optional(),
      hasAgeGroup: z.boolean().default(false),
      hasSingles: z.boolean().default(false),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      accountHolder: z.string().optional(),
      paymentNote: z.string().optional(),
      sizeGuideImageUrl: z.string().optional(),
      sizeGuideFileKey: z.string().optional(),
      status: z.enum(["draft", "open", "closed", "cancelled"]).default("draft"),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createTournament({
        ...input,
        organizerId: ctx.user.id,
      });
      // 생성자를 owner로 자동 등록
      await db.addTournamentOrganizer(id, ctx.user.id, "owner");
      return { id };
    }),

  updateTournament: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        venue: z.string().optional(),
        address: z.string().optional(),
        organizerInfo: z.string().optional(),
        feePerTeam: z.number().optional(),
        giftDescription: z.string().optional(),
        sizeType: z.enum(["numeric", "alpha"]).optional(),
        sizeOptions: z.string().optional(),
        hasAgeGroup: z.boolean().optional(),
        hasSingles: z.boolean().optional(),
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        accountHolder: z.string().optional(),
        paymentNote: z.string().optional(),
        sizeGuideImageUrl: z.string().optional(),
        sizeGuideFileKey: z.string().optional(),
        status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.id);
      await db.updateTournament(input.id, input.data);
      return { success: true };
    }),

  setEvents: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      events: z.array(z.object({
        eventType: z.enum(["남복", "여복", "혼복", "남단", "여단"]),
        skillLevel: z.string(),
        maxTeams: z.number().default(40),
        dayLabel: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      await db.deleteEventsByTournament(input.tournamentId);
      for (let i = 0; i < input.events.length; i++) {
        await db.createTournamentEvent({
          tournamentId: input.tournamentId,
          ...input.events[i],
          sortOrder: i,
        });
      }
      return { success: true };
    }),

  reorderEvents: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      eventIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      const orders = input.eventIds.map((id, index) => ({ id, sortOrder: index }));
      await db.updateEventSortOrders(orders);
      return { success: true };
    }),

  setAgeGroups: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      ageGroups: z.array(z.object({
        code: z.string(),
        label: z.string(),
        minAge: z.number(),
        maxAge: z.number().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      await db.deleteAgeGroupsByTournament(input.tournamentId);
      for (const ag of input.ageGroups) {
        await db.createAgeGroup({
          tournamentId: input.tournamentId,
          ...ag,
        });
      }
      return { success: true };
    }),

  uploadPoster: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      base64Data: z.string(),
      contentType: z.string().default("image/jpeg"),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      const buffer = Buffer.from(input.base64Data, "base64");
      const ext = input.contentType.includes("png") ? "png" : "jpg";
      const fileKey = `tournaments/${input.tournamentId}/posters/${nanoid()}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      const id = await db.createPoster({
        tournamentId: input.tournamentId,
        imageUrl: url,
        fileKey,
        sortOrder: input.sortOrder,
      });
      return { id, url };
    }),

  deletePoster: protectedProcedure
    .input(z.object({ id: z.number(), tournamentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      await db.deletePoster(input.id);
      return { success: true };
    }),

  uploadDocument: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      title: z.string(),
      base64Data: z.string(),
      contentType: z.string().default("application/pdf"),
      fileSize: z.number(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      const buffer = Buffer.from(input.base64Data, "base64");
      const fileKey = `tournaments/${input.tournamentId}/documents/${nanoid()}.pdf`;
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      const id = await db.createDocument({
        tournamentId: input.tournamentId,
        title: input.title,
        fileUrl: url,
        fileKey,
        fileSize: input.fileSize,
        sortOrder: input.sortOrder,
      });
      return { id, url };
    }),

  uploadSizeGuide: protectedProcedure
    .input(z.object({
      tournamentId: z.number(),
      base64Data: z.string(),
      contentType: z.string().default("image/png"),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      const buffer = Buffer.from(input.base64Data, "base64");
      const ext = input.contentType.includes("png") ? "png" : "jpg";
      const fileKey = `tournaments/${input.tournamentId}/size-guide/${nanoid()}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      await db.updateTournament(input.tournamentId, {
        sizeGuideImageUrl: url,
        sizeGuideFileKey: fileKey,
      });
      return { url, fileKey };
    }),

  deleteSizeGuide: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      await db.updateTournament(input.tournamentId, {
        sizeGuideImageUrl: null,
        sizeGuideFileKey: null,
      });
      return { success: true };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ id: z.number(), tournamentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      await db.deleteDocument(input.id);
      return { success: true };
    }),

  listUsers: superAdminProcedure.query(async () => {
    return db.getAllUsers();
  }),

  updateUserRole: superAdminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin", "super_admin"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // ─── 대회 관리자 관리 프로시저 ───
  getTournamentOrganizers: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyTournamentOwnership(ctx.user, input.tournamentId);
      return db.getTournamentOrganizers(input.tournamentId);
    }),

  addTournamentOrganizer: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // 이미 등록된지 확인
      const isAlready = await db.isTournamentOrganizer(input.tournamentId, input.userId);
      if (isAlready) {
        throw new TRPCError({ code: "CONFLICT", message: "이미 등록된 관리자입니다" });
      }
      await db.addTournamentOrganizer(input.tournamentId, input.userId, "manager");
      return { success: true };
    }),

  removeTournamentOrganizer: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await db.removeTournamentOrganizer(input.tournamentId, input.userId);
      return { success: true };
    }),

  searchUsersForOrganizer: adminProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const allUsers = await db.getAllUsers();
      const q = input.query.toLowerCase();
      return allUsers
        .filter(u => 
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
        )
        .slice(0, 10)
        .map(u => ({ id: u.id, name: u.name, phone: u.phone, email: u.email }));
    }),

  getUserManagedTournaments: protectedProcedure
    .query(async ({ ctx }) => {
      return db.getUserManagedTournaments(ctx.user.id);
    }),
});

// ─── SMS Auth Router ───────────────────────────────────
const smsAuthRouter = router({
  /** 인증번호 발송 (로그인/회원가입 공통) */
  sendCode: publicProcedure
    .input(z.object({
      phone: z.string().min(10, "전화번호를 입력해주세요"),
    }))
    .mutation(async ({ input }) => {
      const phone = normalizePhoneToDigits(input.phone);
      const result = await sendVerificationCode(phone);
      if (!result.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "인증번호 발송에 실패했습니다" });
      }
      // 기존 회원 여부 반환
      const existingUser = await db.getUserByPhone(phone);
      return { success: true, isExistingUser: !!existingUser };
    }),

  /** 로그인 (인증번호 검증 → 세션 발급) */
  login: publicProcedure
    .input(z.object({
      phone: z.string().min(10),
      code: z.string().length(6, "인증번호 6자리를 입력해주세요"),
    }))
    .mutation(async ({ ctx, input }) => {
      const phone = normalizePhoneToDigits(input.phone);
      const verification = await verifyCode(phone, input.code);
      if (!verification.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "인증번호가 올바르지 않습니다" });
      }

      const user = await db.getUserByPhone(phone);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "가입되지 않은 번호입니다. 회원가입을 진행해주세요." });
      }

      // 세션 토큰 발급
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_MONTH_MS,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_MONTH_MS });

      // 마지막 로그인 시간 업데이트
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
    }),

  /** 회원가입 (인증번호 검증 → 사용자 생성 → 세션 발급) */
  register: publicProcedure
    .input(z.object({
      phone: z.string().min(10),
      code: z.string().length(6, "인증번호 6자리를 입력해주세요"),
      name: z.string().min(1, "이름을 입력해주세요"),
      gender: z.enum(["male", "female"]),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식: YYYY-MM-DD"),
      termsAccepted: z.boolean().refine(v => v, "이용약관에 동의해주세요"),
      privacyAccepted: z.boolean().refine(v => v, "개인정보처리방침에 동의해주세요"),
    }))
    .mutation(async ({ ctx, input }) => {
      const phone = normalizePhoneToDigits(input.phone);

      // 인증번호 검증
      const verification = await verifyCode(phone, input.code);
      if (!verification.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "인증번호가 올바르지 않습니다" });
      }

      // 이미 가입된 번호인지 확인
      const existingUser = await db.getUserByPhone(phone);
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "이미 가입된 전화번호입니다. 로그인해주세요." });
      }

      // 사용자 생성 (openId = phone 기반 고유값)
      const openId = `phone_${phone}`;
      await db.upsertUser({
        openId,
        name: input.name,
        phone,
        gender: input.gender,
        birthDate: input.birthDate,
        loginMethod: "phone",
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "회원가입 처리 중 오류가 발생했습니다" });
      }

      // 세션 토큰 발급
      const sessionToken = await sdk.createSessionToken(openId, {
        name: input.name,
        expiresInMs: ONE_MONTH_MS,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_MONTH_MS });

      return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
    }),
});

// ─── User Router ────────────────────────────────────────
const userRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다" });
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      gender: user.gender,
      birthDate: user.birthDate,
      role: user.role,
      createdAt: user.createdAt,
    };
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "이름을 입력해주세요").optional(),
      gender: z.enum(["male", "female"]).optional(),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식: YYYY-MM-DD").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});

// ─── KPR Router (체스 ELO식 단일 점수, 초기 1000점) ─────────────
const kprRouter = router({
  /** 로그인 사용자의 KPR 대시보드 */
  myDashboard: protectedProcedure.query(async ({ ctx }) => {
    let rating = await db.getKprRating(ctx.user.id);
    if (!rating) {
      await db.initKprRating(ctx.user.id);
      rating = await db.getKprRating(ctx.user.id);
    }
    const isUnranked = rating!.totalMatches === 0;
    const rank = isUnranked ? 0 : await db.getKprRank(ctx.user.id);
    const totalParticipants = await db.getKprTotalParticipants();
    const recentMatches = await db.getRecentMatches(ctx.user.id);
    return {
      rating: rating!.rating,
      ratingDelta: rating!.ratingDelta,
      totalMatches: rating!.totalMatches,
      wins: rating!.wins,
      losses: rating!.losses,
      winRate: rating!.totalMatches > 0 ? Math.round((rating!.wins / rating!.totalMatches) * 100) : 0,
      winStreak: rating!.winStreak,
      bestRating: rating!.bestRating,
      isUnranked,
      rank,
      totalParticipants,
      weeklyRankDelta: rating!.weeklyRankDelta,
      recentMatches,
    };
  }),

  /** 공개 리더보드 (대회 전적 있는 사람만) */
  leaderboard: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const rows = await db.getKprLeaderboard(limit);
      return rows
        .filter((r) => r.totalMatches > 0)
        .map((r, idx) => ({
          rank: idx + 1,
          userId: r.userId,
          userName: r.userName ?? "미등록",
          rating: r.rating,
          totalMatches: r.totalMatches,
          wins: r.wins,
          losses: r.losses,
          winStreak: r.winStreak,
        }));
    }),

  /** 공개 통계 */
  stats: publicProcedure.query(async () => {
    const totalParticipants = await db.getKprTotalParticipants();
    return { totalParticipants };
  }),
});

// ─── App Router ─────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  smsAuth: smsAuthRouter,
  user: userRouter,
  tournament: tournamentRouter,
  registration: registrationRouter,
  admin: adminRouter,
  kpr: kprRouter,
  community: communityRouter,
});
export type AppRouter = typeof appRouter;
