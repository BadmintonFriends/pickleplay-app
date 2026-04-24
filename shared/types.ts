/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ─── Registration shared types ──────────────────────────
export interface PlayerInput {
  name: string;
  birthDate: string; // YYYY-MM-DD
  phone: string;
  giftSize?: string;
}

export interface RegistrationInput {
  tournamentId: number;
  tournamentEventId: number;
  ageGroupId?: number;
  isSelfParticipant: boolean;
  players: PlayerInput[];
}

export interface ExcelRowData {
  eventType: string;
  skillLevel: string;
  player1Name: string;
  player1Birth: string;
  player1Phone: string;
  player1Size?: string;
  player2Name?: string;
  player2Birth?: string;
  player2Phone?: string;
  player2Size?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ExcelValidationResult {
  valid: boolean;
  rows: ExcelRowData[];
  errors: ValidationError[];
}

export type TournamentStatus = "draft" | "open" | "closed" | "cancelled";
export type RegistrationStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type EventType = "남복" | "여복" | "혼복" | "남단" | "여단";
