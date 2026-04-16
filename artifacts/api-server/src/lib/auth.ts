import { getAuth, clerkClient } from "@clerk/express";

export async function requireAuthAndCompany(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const companyId = user.publicMetadata?.companyId as number | undefined;
    if (!companyId) {
      res.status(403).json({ error: "No company setup. Please complete company setup first." });
      return;
    }
    req.companyId = companyId;
    req.userRole = (user.publicMetadata?.role as string) || "employee";
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  next();
}

export function resolveUsername(user: any): string | null {
  const email = user.emailAddresses?.[0]?.emailAddress || "";
  return (
    (user.unsafeMetadata?.displayName as string) ||
    user.username ||
    user.firstName ||
    email.split("@")[0] ||
    null
  );
}

/* ── In-memory username cache (5-minute TTL) ─────────────────────────── */

type CacheEntry = { username: string | null; expiresAt: number };
const usernameCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedUsername(id: string): string | null | undefined {
  const entry = usernameCache.get(id);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    usernameCache.delete(id);
    return undefined;
  }
  return entry.username;
}

function setCachedUsername(id: string, username: string | null) {
  usernameCache.set(id, { username, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function batchUsernames(clerkIds: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(clerkIds.filter(Boolean))];
  const result: Record<string, string | null> = {};

  const toFetch: string[] = [];
  for (const id of unique) {
    const cached = getCachedUsername(id);
    if (cached !== undefined) {
      result[id] = cached;
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length > 0) {
    const fetched = await Promise.all(
      toFetch.map(async (id) => {
        try {
          const u = await clerkClient.users.getUser(id);
          const username = resolveUsername(u);
          setCachedUsername(id, username);
          return [id, username] as const;
        } catch {
          setCachedUsername(id, null);
          return [id, null] as const;
        }
      })
    );
    for (const [id, username] of fetched) {
      result[id] = username;
    }
  }

  return result;
}
