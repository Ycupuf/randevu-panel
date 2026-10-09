import { create } from "zustand";

// Takvimin arayüz durumu: hangi gün gösteriliyor, hangi randevu açık, "yeni randevu" penceresi açık mı.
// Sunucu verisi (randevular) burada DEĞİL, TanStack Query'de durur.
type CalendarUi = {
  date: string | null; // null = sunucunun verdiği başlangıç günü
  base: string | null; // `date` hangi başlangıç gününe göre seçildi? Bağlantıyla (?tarih=) başka bir gün istenirse sıfırlanır
  selectedId: string | null;
  manualOpen: boolean;
  setDate: (date: string, base: string) => void;
  select: (id: string | null) => void;
  setManualOpen: (open: boolean) => void;
};

export const useCalendarUi = create<CalendarUi>((set) => ({
  date: null,
  base: null,
  selectedId: null,
  manualOpen: false,
  setDate: (date, base) => set({ date, base, selectedId: null }),
  select: (selectedId) => set({ selectedId }),
  setManualOpen: (manualOpen) => set({ manualOpen }),
}));
