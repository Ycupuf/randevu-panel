import { create } from "zustand";

// Takvimin arayüz durumu: hangi gün gösteriliyor, hangi randevu açık, "yeni randevu" penceresi açık mı.
// Sunucu verisi (randevular) burada DEĞİL, TanStack Query'de durur.
type CalendarUi = {
  date: string | null; // null = bugün (sunucunun verdiği başlangıç günü)
  selectedId: string | null;
  manualOpen: boolean;
  setDate: (date: string) => void;
  select: (id: string | null) => void;
  setManualOpen: (open: boolean) => void;
};

export const useCalendarUi = create<CalendarUi>((set) => ({
  date: null,
  selectedId: null,
  manualOpen: false,
  setDate: (date) => set({ date, selectedId: null }),
  select: (selectedId) => set({ selectedId }),
  setManualOpen: (manualOpen) => set({ manualOpen }),
}));
