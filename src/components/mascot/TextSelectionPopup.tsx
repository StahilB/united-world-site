"use client";

import { useEffect, useRef, useState } from "react";

type Position = { top: number; left: number; visible: boolean };

export function TextSelectionPopup() {
  const [pos, setPos] = useState<Position>({
    top: 0,
    left: 0,
    visible: false,
  });
  const [selectedText, setSelectedText] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleSelection() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setPos((p) => ({ ...p, visible: false }));
        return;
      }
      const text = selection.toString().trim();
      if (text.length < 3) {
        setPos((p) => ({ ...p, visible: false }));
        return;
      }

      const anchorNode = selection.anchorNode;
      if (anchorNode?.parentElement?.closest("[data-mascot-chat]")) return;
      if (
        anchorNode?.parentElement?.closest(
          'input,textarea,[contenteditable="true"]',
        )
      )
        return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) {
        setPos((p) => ({ ...p, visible: false }));
        return;
      }

      const popupHeight = 44;
      const top =
        rect.top > popupHeight + 10
          ? rect.top - popupHeight - 8
          : rect.bottom + 8;
      const left = Math.max(
        8,
        Math.min(
          rect.left + rect.width / 2 - 90,
          window.innerWidth - 190,
        ),
      );

      setSelectedText(text);
      setPos({ top, left, visible: true });
    }

    function handleMouseDown(e: MouseEvent) {
      if (popupRef.current?.contains(e.target as Node)) return;
      setPos((p) => ({ ...p, visible: false }));
    }

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const ask = (prefix: string) => {
    window.dispatchEvent(
      new CustomEvent("mascot:ask", {
        detail: {
          text: `${prefix}: ${selectedText.slice(0, 500)}`,
          context: selectedText,
        },
      }),
    );
    setPos((p) => ({ ...p, visible: false }));
    window.getSelection()?.removeAllRanges();
  };

  if (!pos.visible) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-40 flex gap-0.5 bg-ink-deep p-1 text-white shadow-xl"
      style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
    >
      <button
        type="button"
        onClick={() => ask("Объясни простыми словами")}
        className="whitespace-nowrap bg-ink-deep px-2.5 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-white/85 transition-colors hover:bg-gold hover:text-ink-deep"
      >
        💡 Объяснить
      </button>
      <span className="w-px self-stretch bg-white/20" />
      <button
        type="button"
        onClick={() => ask("Переведи на английский")}
        className="whitespace-nowrap bg-ink-deep px-2.5 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-white/85 transition-colors hover:bg-gold hover:text-ink-deep"
      >
        🌐 Перевести
      </button>
      <span className="w-px self-stretch bg-white/20" />
      <button
        type="button"
        onClick={() => ask("У меня вопрос")}
        className="whitespace-nowrap bg-ink-deep px-2.5 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-white/85 transition-colors hover:bg-gold hover:text-ink-deep"
      >
        ❓ Спросить
      </button>
    </div>
  );
}
