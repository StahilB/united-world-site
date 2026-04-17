import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const REVALIDATE_DEDUP_WINDOW_MS = 15_000;
const dedupStore = new Map<string, number>();

function shouldRevalidate(key: string, now: number): boolean {
  const last = dedupStore.get(key);
  if (last && now - last < REVALIDATE_DEDUP_WINDOW_MS) {
    return false;
  }
  dedupStore.set(key, now);

  // Lightweight cleanup to avoid unbounded map growth.
  if (dedupStore.size > 2000) {
    for (const [k, ts] of dedupStore) {
      if (now - ts > REVALIDATE_DEDUP_WINDOW_MS * 4) {
        dedupStore.delete(k);
      }
    }
  }

  return true;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path : undefined;
  const slug = typeof body.slug === "string" ? body.slug : undefined;
  const now = Date.now();
  const targets = new Set<string>(["/", "/news"]);

  if (slug) {
    targets.add(`/articles/${slug}`);
  }
  if (path) {
    targets.add(path);
  }

  const revalidated: string[] = [];
  const skipped: string[] = [];
  for (const target of targets) {
    if (shouldRevalidate(target, now)) {
      revalidatePath(target);
      revalidated.push(target);
    } else {
      skipped.push(target);
    }
  }

  return NextResponse.json({
    revalidated: true,
    now,
    revalidatedPaths: revalidated,
    skippedPaths: skipped,
    dedupWindowMs: REVALIDATE_DEDUP_WINDOW_MS,
  });
}
