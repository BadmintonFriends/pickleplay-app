import type { Express } from "express";

/**
 * OAuth routes removed — phone auth is handled via tRPC procedures.
 * This stub is kept so `server/_core/index.ts` doesn't break.
 */
export function registerOAuthRoutes(_app: Express) {
  // no-op
}
