import twilio from "twilio";
import { ENV } from "./_core/env";

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!_client) {
    if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) {
      throw new Error("Twilio credentials not configured");
    }
    _client = twilio(ENV.twilioAccountSid, ENV.twilioAuthToken);
  }
  return _client;
}

/** 전화번호 → E.164 형식 (+821012345678) */
export function normalizePhoneToE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  return `+82${digits}`;
}

/** 전화번호 → 국내 형식 (01012345678) */
export function normalizePhoneToDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82")) return `0${digits.slice(2)}`;
  return digits;
}

// ─── Demo Account ──────────────────────────────────────
const DEMO_PHONE = "01000000000";
const DEMO_CODE = "1324";

export function isDemoAccount(phone: string): boolean {
  return normalizePhoneToDigits(phone) === DEMO_PHONE;
}

export function verifyDemoCode(code: string): boolean {
  return code === DEMO_CODE;
}

// ─── Twilio Verify API ─────────────────────────────────
/** 인증번호 발송 */
export async function sendVerificationCode(phone: string): Promise<{ success: boolean; error?: string; isDemo?: boolean }> {
  const normalizedPhone = normalizePhoneToDigits(phone);

  // 데모 계정은 실제 SMS 발송 건너뜀
  if (isDemoAccount(normalizedPhone)) {
    return { success: true, isDemo: true };
  }

  try {
    const client = getClient();
    const verification = await client.verify.v2
      .services(ENV.twilioVerifyServiceSid)
      .verifications.create({
        to: normalizePhoneToE164(normalizedPhone),
        channel: "sms",
      });
    return { success: verification.status === "pending" };
  } catch (error: any) {
    console.error("[SMS] Failed to send verification code:", error.message);
    return { success: false, error: error.message };
  }
}

/** 인증번호 검증 */
export async function verifyCode(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalizedPhone = normalizePhoneToDigits(phone);

  // 데모 계정은 고정 코드로 검증
  if (isDemoAccount(normalizedPhone)) {
    return { success: verifyDemoCode(code) };
  }

  try {
    const client = getClient();
    const check = await client.verify.v2
      .services(ENV.twilioVerifyServiceSid)
      .verificationChecks.create({
        to: normalizePhoneToE164(normalizedPhone),
        code,
      });
    return { success: check.status === "approved" };
  } catch (error: any) {
    console.error("[SMS] Failed to verify code:", error.message);
    return { success: false, error: error.message };
  }
}
