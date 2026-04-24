import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, superAdminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// ─── Validation schemas ──────────────────────────────────
const playerSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식: YYYY-MM-DD"),
  phone: z.string().min(10, "전화번호를 입력해주세요"),
  giftSize: z.string().optional(),
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
      if (reg.userId !== ctx.user.id && !['admin', 'super_admin', 'organizer'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
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
      if (reg.userId !== ctx.user.id && !['admin', 'super_admin', 'organizer'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
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
        });
      }
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const reg = await db.getRegistrationById(input.id);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "접수 내역을 찾을 수 없습니다" });
      if (reg.userId !== ctx.user.id && !['admin', 'super_admin', 'organizer'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다" });
      }
      if (reg.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 취소된 접수입니다" });

      await db.updateRegistration(input.id, { status: "cancelled" });
      await db.decrementEventTeamCount(reg.tournamentEventId);
      return { success: true };
    }),
});

// ─── Admin Router ───────────────────────────────────────
const adminRouter = router({
  tournamentRegistrations: adminProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      return db.getRegistrationsWithPlayers(input.tournamentId);
    }),

  updatePaymentStatus: adminProcedure
    .input(z.object({
      registrationId: z.number(),
      paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateRegistration(input.registrationId, {
        paymentStatus: input.paymentStatus,
        status: input.paymentStatus === "paid" ? "confirmed" : "pending",
      });
      return { success: true };
    }),

  updateRegistrationStatus: adminProcedure
    .input(z.object({
      registrationId: z.number(),
      status: z.enum(["pending", "confirmed", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const reg = await db.getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });
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
      status: z.enum(["draft", "open", "closed", "cancelled"]).default("draft"),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createTournament({
        ...input,
        organizerId: ctx.user.id,
      });
      return { id };
    }),

  updateTournament: adminProcedure
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
        status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateTournament(input.id, input.data);
      return { success: true };
    }),

  setEvents: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      events: z.array(z.object({
        eventType: z.enum(["남복", "여복", "혼복", "남단", "여단"]),
        skillLevel: z.string(),
        maxTeams: z.number().default(40),
        dayLabel: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      await db.deleteEventsByTournament(input.tournamentId);
      for (const event of input.events) {
        await db.createTournamentEvent({
          tournamentId: input.tournamentId,
          ...event,
        });
      }
      return { success: true };
    }),

  setAgeGroups: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      ageGroups: z.array(z.object({
        code: z.string(),
        label: z.string(),
        minAge: z.number(),
        maxAge: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      await db.deleteAgeGroupsByTournament(input.tournamentId);
      for (const ag of input.ageGroups) {
        await db.createAgeGroup({
          tournamentId: input.tournamentId,
          ...ag,
        });
      }
      return { success: true };
    }),

  uploadPoster: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      base64Data: z.string(),
      contentType: z.string().default("image/jpeg"),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
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

  deletePoster: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deletePoster(input.id);
      return { success: true };
    }),

  uploadDocument: adminProcedure
    .input(z.object({
      tournamentId: z.number(),
      title: z.string(),
      base64Data: z.string(),
      contentType: z.string().default("application/pdf"),
      fileSize: z.number(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
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

  deleteDocument: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true };
    }),

  listUsers: superAdminProcedure.query(async () => {
    return db.getAllUsers();
  }),

  updateUserRole: superAdminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "organizer", "admin", "super_admin"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),
});

// ─── App Router ─────────────────────────────────────────
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
  tournament: tournamentRouter,
  registration: registrationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
