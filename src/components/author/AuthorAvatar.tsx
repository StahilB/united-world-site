"use client";

import Image from "next/image";
import { useState } from "react";
import {
  hueFromString,
  initials,
  normalizeAvatarUrlForBrowser,
} from "@/lib/author-avatar-utils";

type AuthorAvatarProps = {
  name: string;
  slug: string;
  avatarUrl: string;
  /** Edge length in CSS pixels */
  size: number;
  className?: string;
};

export function AuthorAvatar({
  name,
  slug,
  avatarUrl,
  size,
  className = "",
}: AuthorAvatarProps) {
  const resolved = normalizeAvatarUrlForBrowser(avatarUrl);
  const [failed, setFailed] = useState(false);
  const showFallback = !resolved || failed;
  const hue = hueFromString(slug || name || "");
  const label = initials(name);
  const fontSize = Math.max(12, Math.round(size * 0.2));

  if (showFallback) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: `hsl(${hue} 45% 40%)`,
          fontSize,
        }}
        aria-hidden
      >
        {label}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={resolved}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}
