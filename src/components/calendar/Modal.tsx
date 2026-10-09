"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Erişilebilir pencere: Esc ile kapanır, odak içeride kalır (Tab döngüsü), kapanınca önceki öğeye döner, arka plana tıklayınca kapanır. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // onClose her render'da yeni işlev olabilir; efekt yeniden çalışıp odağı çalmasın diye ref'te tutulur.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab" || !ref.current) return;
      // Odak tuzağı: Tab/Shift+Tab pencerenin dışına, arka plana kaçmaz
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 outline-none sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="btn" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
