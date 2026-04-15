import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

function formatCompany(c: typeof companiesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    inviteCode: c.inviteCode,
    createdAt: c.createdAt.toISOString(),
  };
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Company name is required" });
      return;
    }

    const meUser = await clerkClient.users.getUser(req.clerkUserId);
    const existingCompanyId = meUser.publicMetadata?.companyId as number | undefined;
    if (existingCompanyId) {
      const [existing] = await db.select().from(companiesTable).where(eq(companiesTable.id, existingCompanyId));
      if (existing) {
        res.status(201).json(formatCompany(existing));
        return;
      }
    }

    let inviteCode: string = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateInviteCode();
      const [conflict] = await db.select().from(companiesTable).where(eq(companiesTable.inviteCode, candidate));
      if (!conflict) {
        inviteCode = candidate;
        break;
      }
    }
    if (!inviteCode) {
      res.status(500).json({ error: "Failed to generate invite code" });
      return;
    }

    const [company] = await db.insert(companiesTable).values({ name: name.trim(), inviteCode }).returning();

    await clerkClient.users.updateUserMetadata(req.clerkUserId, {
      publicMetadata: { ...meUser.publicMetadata, companyId: company.id },
    });

    res.status(201).json(formatCompany(company));
  } catch (err) {
    req.log.error({ err }, "Failed to create company");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req: any, res) => {
  try {
    const meUser = await clerkClient.users.getUser(req.clerkUserId);
    const companyId = meUser.publicMetadata?.companyId as number | undefined;
    if (!companyId) {
      res.status(404).json({ error: "No company found" });
      return;
    }
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    res.json(formatCompany(company));
  } catch (err) {
    req.log.error({ err }, "Failed to get company");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/join", requireAuth, async (req: any, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode?.trim()) {
      res.status(400).json({ error: "Invite code is required" });
      return;
    }

    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.inviteCode, inviteCode.trim().toUpperCase()));

    if (!company) {
      res.status(404).json({ error: "Invalid invite code. Please check and try again." });
      return;
    }

    const meUser = await clerkClient.users.getUser(req.clerkUserId);
    await clerkClient.users.updateUserMetadata(req.clerkUserId, {
      publicMetadata: { ...meUser.publicMetadata, companyId: company.id },
    });

    res.json(formatCompany(company));
  } catch (err) {
    req.log.error({ err }, "Failed to join company");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
