import { describe, expect, it } from "vitest";
import { copyDay, DEFAULT_WEEK, groupHours, validateDay, validateWeek, weekToRows, weeklyHours } from "./hours";

describe("hours", () => {
  it("geçerli günü kabul eder, mola ile bölünmüş günü de", () => {
    expect(validateDay([{ start: "09:00", end: "19:00" }])).toBeNull();
    expect(validateDay([{ start: "09:00", end: "13:00" }, { start: "14:00", end: "19:00" }])).toBeNull();
    expect(validateDay([])).toBeNull();
  });

  it("24:00 bitişine izin verir", () => {
    expect(validateDay([{ start: "18:00", end: "24:00" }])).toBeNull();
  });

  it("ters, eşit ve biçimi bozuk aralıkları reddeder", () => {
    expect(validateDay([{ start: "19:00", end: "09:00" }])).toMatch(/sonra/);
    expect(validateDay([{ start: "09:00", end: "09:00" }])).toMatch(/sonra/);
    expect(validateDay([{ start: "9:00", end: "10:00" }])).toMatch(/SS:DD/);
    expect(validateDay([{ start: "25:00", end: "26:00" }])).toMatch(/SS:DD/);
  });

  it("çakışan aralıkları reddeder, sırası karışık olsa da", () => {
    expect(validateDay([{ start: "12:00", end: "15:00" }, { start: "09:00", end: "13:00" }])).toMatch(/girmemeli/);
    expect(validateDay([{ start: "09:00", end: "12:00" }, { start: "12:00", end: "15:00" }])).toBeNull();
  });

  it("haftada ilk hatalı günü bildirir", () => {
    const week = { ...DEFAULT_WEEK, 3: [{ start: "10:00", end: "09:00" }] };
    expect(validateWeek(week)?.weekday).toBe(3);
    expect(validateWeek(DEFAULT_WEEK)).toBeNull();
  });

  it("satırları gruplar ve geri düzleştirir", () => {
    const week = groupHours([
      { weekday: 1, start_time: "14:00:00", end_time: "19:00:00" },
      { weekday: 1, start_time: "09:00:00", end_time: "13:00:00" },
      { weekday: 0, start_time: "10:00:00", end_time: "14:00:00" },
    ]);
    expect(week[1]).toEqual([{ start: "09:00", end: "13:00" }, { start: "14:00", end: "19:00" }]);
    expect(weekToRows(week)).toEqual([
      { weekday: 1, start_time: "09:00", end_time: "13:00" },
      { weekday: 1, start_time: "14:00", end_time: "19:00" },
      { weekday: 0, start_time: "10:00", end_time: "14:00" },
    ]);
  });

  it("günü kopyalar ve kaynağı değiştirmez", () => {
    const week = copyDay(DEFAULT_WEEK, 1, [0]);
    expect(week[0]).toEqual([{ start: "09:00", end: "19:00" }]);
    week[0][0].start = "10:00";
    expect(week[1][0].start).toBe("09:00");
  });

  it("haftalık toplam saati hesaplar", () => {
    expect(weeklyHours(DEFAULT_WEEK)).toBe(60);
  });
});
