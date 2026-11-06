import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { attendanceDateAllowed, attendanceDateRange } from "./attendanceDates";

const today = new Date(2026, 10, 3, 19, 59);

describe("attendance cannot extend into the future", () => {
  it("ends November attendance on 3 November when today is 3 November", () => {
    const range = attendanceDateRange(today, "monthly", today);
    expect(format(range.start, "yyyy-MM-dd")).toBe("2026-11-01");
    expect(format(range.end, "yyyy-MM-dd")).toBe("2026-11-03");
  });
  it("caps the current weekly view at 3 November", () => {
    expect(format(attendanceDateRange(today, "weekly", today).end, "yyyy-MM-dd")).toBe("2026-11-03");
  });
  it("rejects 4 November and allows 3 November", () => {
    expect(attendanceDateAllowed(new Date(2026, 10, 4), today)).toBe(false);
    expect(attendanceDateAllowed(new Date(2026, 10, 3, 23), today)).toBe(true);
  });
  it("retains a complete historical month", () => {
    expect(format(attendanceDateRange(new Date(2026, 9, 10), "monthly", today).end, "yyyy-MM-dd")).toBe("2026-10-31");
  });
  it("clamps an accidentally selected future date to today", () => {
    const range = attendanceDateRange(new Date(2026, 10, 30), "daily", today);
    expect(format(range.start, "yyyy-MM-dd")).toBe("2026-11-03");
    expect(format(range.end, "yyyy-MM-dd")).toBe("2026-11-03");
  });
});