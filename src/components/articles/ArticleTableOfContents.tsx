"use client";

import { useEffect, useState } from "react";
import type { TocHeading } from "@/lib/article-content";

type ArticleTableOfContentsProps = {
  headings: TocHeading[];
};

export function ArticleTableOfContents({ headings }: ArticleTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(
    headings[0]?.id ?? null,
  );

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Оглавление" className="border-b border-rule pb-6">
      <p className="kicker">Оглавление</p>
      <ul className="mt-4 space-y-2.5 font-sans text-[13px] leading-snug">
        {headings.map((h) => (
          <li
            key={h.id}
            className={h.level === 3 ? "border-l border-rule pl-3" : ""}
          >
            <a
              href={`#${h.id}`}
              className={`block transition-colors ${
                activeId === h.id
                  ? "font-semibold text-gold-deep"
                  : "text-text-mute hover:text-ink"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
