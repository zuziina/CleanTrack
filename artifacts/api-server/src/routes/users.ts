import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { SetUserRoleBody } from "@workspace/api-zod";
import { requireAuth, requireAuthAndCompany } from "../lib/auth";

const router = Router();

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
    companyId: (user.publicMetadata?.companyId as number) ?? null,
    isHidden: (user.publicMetadata?.isHidden as boolean) ?? false,
  };
}

router.get("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    if (req.userRole !== "boss") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { data: users } = await clerkClient.users.getUserList({ limit: 500 });
    const companyUsers = users.filter(
      (u) => (u.publicMetadata?.companyId as number) === req.companyId
    );
    res.json(companyUsers.map(formatUser));
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

async function requireBossOverEmployee(req: any, res: any): Promise<{ meUser: any; targetUser: any } | null> {
  const meUser = await clerkClient.users.getUser(req.clerkUserId);
  const myRole = (meUser.publicMetadata?.role as string) || "employee";
  if (myRole !== "boss") {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  const myCompanyId = (meUser.publicMetadata?.companyId as number) ?? null;
  const { clerkId } = req.params;
  let targetUser: any;
  try {
    targetUser = await clerkClient.users.getUser(clerkId);
  } catch {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  const targetCompanyId = (targetUser.publicMetadata?.companyId as number) ?? null;
  if (targetCompanyId !== myCompanyId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  if (clerkId === req.clerkUserId) {
    res.status(400).json({ error: "Cannot modify yourself" });
    return null;
  }
  return { meUser, targetUser };
}

router.patch("/:clerkId", requireAuth, async (req: any, res) => {
  try {
    const check = await requireBossOverEmployee(req, res);
    if (!check) return;
    const { targetUser } = check;

    const { isHidden } = req.body;
    const updated = await clerkClient.users.updateUserMetadata(targetUser.id, {
      publicMetadata: {
        ...targetUser.publicMetadata,
        isHidden: isHidden === true,
      },
    });
    res.json(formatUser(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to patch user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:clerkId", requireAuth, async (req: any, res) => {
  try {
    const check = await requireBossOverEmployee(req, res);
    if (!check) return;
    const { targetUser } = check;

    await clerkClient.users.updateUserMetadata(targetUser.id, {
      publicMetadata: {
        role: null,
        companyId: null,
        isHidden: null,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove employee");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
