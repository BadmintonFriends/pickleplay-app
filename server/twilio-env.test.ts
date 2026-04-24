import { describe, it, expect } from "vitest";

describe("Twilio Environment Variables", () => {
  it("TWILIO_ACCOUNT_SID is set and starts with AC", () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    expect(sid).toBeDefined();
    expect(sid!.length).toBeGreaterThan(10);
    expect(sid!.startsWith("AC")).toBe(true);
  });

  it("TWILIO_AUTH_TOKEN is set and has sufficient length", () => {
    const token = process.env.TWILIO_AUTH_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
  });

  it("TWILIO_VERIFY_SERVICE_SID is set and starts with VA", () => {
    const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
    expect(sid).toBeDefined();
    expect(sid!.length).toBeGreaterThan(10);
    expect(sid!.startsWith("VA")).toBe(true);
  });
});
