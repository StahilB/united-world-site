"use client";

import { useEffect, useRef } from "react";

export function ViewCounter({ articleId }: { articleId: number }) {
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    fetch(`/api/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    }).catch(() => {});
  }, [articleId]);
  return null;
}
