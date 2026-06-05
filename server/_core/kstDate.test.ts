import { describe, expect, it } from "vitest";
import { formatKstDate, formatKstTime } from "./kstDate";

describe("KST date formatting", () => {
  it("formats an instant in Asia/Seoul regardless of the process timezone", () => {
    const utcInstant = new Date("2026-06-05T00:05:00.000Z");

    expect(formatKstDate(utcInstant)).toBe("2026-06-05");
    expect(formatKstTime(utcInstant)).toBe("09:05");
  });
});
