import { describe, expect, it } from "vitest";
import { createKstDate, formatKstDate, formatKstTime, formatStoredDate, formatStoredTime } from "./kstDate";

describe("KST date formatting", () => {
  it("formats an instant in Asia/Seoul regardless of the process timezone", () => {
    const utcInstant = new Date("2026-06-05T00:05:00.000Z");

    expect(formatKstDate(utcInstant)).toBe("2026-06-05");
    expect(formatKstTime(utcInstant)).toBe("09:05");
  });

  it("creates a stored date with KST wall-clock fields kept literal", () => {
    const instant = createKstDate(2026, 6, 5, 9, 5);

    expect(instant.toISOString()).toBe("2026-06-05T09:05:00.000Z");
    expect(formatStoredDate(instant)).toBe("2026-06-05");
    expect(formatStoredTime(instant)).toBe("09:05");
  });

  it("rolls over overflowing KST wall-clock fields when storing", () => {
    const instant = createKstDate(2026, 6, 5, 25, 30);

    expect(instant.toISOString()).toBe("2026-06-06T01:30:00.000Z");
    expect(formatStoredDate(instant)).toBe("2026-06-06");
    expect(formatStoredTime(instant)).toBe("01:30");
  });
});
