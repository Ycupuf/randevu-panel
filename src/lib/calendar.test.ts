import { describe, expect, it } from "vitest";
import { blockStyle, dayRange, HOUR_HEIGHT, minutesOfDay, visibleHours } from "./calendar";

describe("calendar", () => {
  it("gün aralığı İstanbul gece yarısından başlar (UTC+3)", () => {
    const { from, to } = dayRange("2026-10-12");
    expect(from.toISOString()).toBe("2026-10-11T21:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-12T21:00:00.000Z");
  });

  it("dakikayı İstanbul saatine göre verir", () => {
    expect(minutesOfDay("2026-10-12T07:30:00Z")).toBe(10 * 60 + 30);
  });

  it("görünür saat aralığı varsayılan 08-20, taşan randevuda genişler", () => {
    expect(visibleHours([])).toEqual({ startHour: 8, endHour: 20 });
    const late = { id: "a", startsAt: "2026-10-12T18:00:00Z", endsAt: "2026-10-12T19:30:00Z" }; // 21:00-22:30 İstanbul
    expect(visibleHours([late])).toEqual({ startHour: 8, endHour: 23 });
    const early = { id: "b", startsAt: "2026-10-12T04:00:00Z", endsAt: "2026-10-12T05:00:00Z" }; // 07:00-08:00
    expect(visibleHours([early]).startHour).toBe(7);
  });

  it("blok konumu saat başına sabit yükseklikle hesaplanır", () => {
    const block = { id: "a", startsAt: "2026-10-12T07:00:00Z", endsAt: "2026-10-12T08:00:00Z" }; // 10:00-11:00
    expect(blockStyle(block, 8)).toEqual({ top: 2 * HOUR_HEIGHT, height: HOUR_HEIGHT });
  });
});
