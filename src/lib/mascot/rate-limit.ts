const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (bucket.count >= maxPerMinute) return false;
  bucket.count++;
  return true;
}

// Периодическая очистка старых записей
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(ip);
  }
}, 60_000);
if (typeof sweep.unref === "function") {
  sweep.unref();
}
