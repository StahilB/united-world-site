"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "migration_banner_dismissed_v1";

export function MigrationBanner() {
  const [visible, setVisible] = useState(false);

  // Показываем баннер только после mount (чтобы не было flash)
  // и только если в sessionStorage нет флага закрытия
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Информация о переезде сайта"
      style={{
        background: "#0F1B2D",
        color: "#FFF8F0",
        padding: "10px 16px",
        fontSize: "14px",
        lineHeight: 1.5,
        borderBottom: "2px solid #C4A35A",
        position: "relative",
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          flexWrap: "wrap",
          paddingRight: "40px",
        }}
      >
        <span>
          Мы переезжаем на новый сайт. Актуальные материалы смотрите на{" "}
          <a
            href="https://old.anounitedworld.com"
            rel="noopener noreferrer"
            style={{
              color: "#C4A35A",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            old.anounitedworld.com
          </a>
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Закрыть объявление"
        style={{
          position: "absolute",
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          color: "#FFF8F0",
          cursor: "pointer",
          fontSize: "20px",
          lineHeight: 1,
          padding: "4px 8px",
          opacity: 0.7,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.7";
        }}
      >
        ×
      </button>
    </div>
  );
}
