import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { SetUserRoleBody } from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  next();
}

function formatUser(user: any) {
  const role = (user.publicMetadata?.role as string) || "employee";
  const email = user.emailAddresses?.[0]?.emailAddress || "";
  const username = (user.unsafeMetadata?.displayName as string) || user.username || user.firstName || email.split("@")[0] || "Unknown";
  return {
    clerkId: user.id,
    username,
    email,
    role,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
  };
}

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const meUser = await clerkClient.users.getUser(req.clerkUserId);
    const myRole = (meUser.publicMetadata?.role as string) || "employee";
    if (myRole !== "boss") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { data: users } = await clerkClient.users.getUserList({ limit: 100 });
    res.json(users.map(formatUser));
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req: any, res) => {
  try {
    const user = await clerkClient.users.getUser(req.clerkUserId);
    res.json(formatUser(user));
  } catch (err) {
    req.log.error({ err }, "Failed to get current user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/set-role", requireAuth, async (req: any, res) => {
  try {
    const parsed = SetUserRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const user = await clerkClient.users.getUser(req.clerkUserId);
    const existingRole = user.publicMetadata?.role;
    if (existingRole) {
      res.json(formatUser(user));
      return;
    }
    const updated = await clerkClient.users.updateUserMetadata(req.clerkUserId, {
      publicMetadata: { role: parsed.data.role },
    });
    res.json(formatUser(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to set user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
