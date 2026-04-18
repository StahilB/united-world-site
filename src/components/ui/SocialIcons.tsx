/** Official social profile URLs (site-wide). */
export const SOCIAL_URLS = {
  telegram: "https://t.me/anounitedworld",
  vk: "https://vk.com/ano_unitedworld",
  facebook: "https://www.facebook.com/profile.php?id=61584222782494",
  youtube: "https://www.youtube.com/@anounitedworld/posts",
} as const;

type SocialIconProps = {
  className?: string;
  /** CSS pixels (width & height) */
  size?: number;
};

export function TelegramIcon({ className, size = 16 }: SocialIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.21.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

export function VkIcon({ className, size = 16 }: SocialIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12.97 16.97c-4.65 0-7.8-3.29-7.95-8.74h2.39c.1 4 1.76 5.72 3.18 6.09V8.23h2.27v3.61c1.35-.15 2.77-1.74 3.24-3.61h2.25c-.37 2.32-1.87 3.9-2.94 4.55 1.07.53 2.78 1.9 3.45 4.19h-2.47c-.52-1.67-1.85-2.97-3.53-3.14v3.14h-.89z" />
    </svg>
  );
}

export function FacebookIcon({ className, size = 16 }: SocialIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function YouTubeIcon({ className, size = 16 }: SocialIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
