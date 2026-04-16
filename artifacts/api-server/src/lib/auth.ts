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

export async function batchUsernames(clerkIds: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(clerkIds.filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const u = await clerkClient.users.getUser(id);
        return [id, resolveUsername(u)] as const;
      } catch {
        return [id, null] as const;
      }
    })
  );
  return Object.fromEntries(results);
}
