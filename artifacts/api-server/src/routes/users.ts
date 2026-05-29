import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody, ChangePasswordBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

/** GET /api/users */
router.get("/users", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    res.json(users.map(formatUser));
  } catch (err) {
    logger.error({ err }, "List users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/users */
router.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const { password, ...rest } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(usersTable)
      .values({ ...rest, passwordHash })
      .returning();

    res.status(201).json(formatUser(user));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "Username or email already exists" });
      return;
    }
    logger.error({ err }, "Create user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/users/:id */
router.get("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    logger.error({ err }, "Get user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /api/users/:id */
router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.email != null) updates.email = parsed.data.email;
    if (parsed.data.fullName != null) updates.fullName = parsed.data.fullName;
    if (parsed.data.role != null) updates.role = parsed.data.role;
    if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    logger.error({ err }, "Update user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/users/:id */
router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id));
    res.json({ message: "User deactivated" });
  } catch (err) {
    logger.error({ err }, "Delete user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/users/:id/change-password */
router.post("/users/:id/change-password", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  // Only admin can change anyone's password; others can only change their own
  if (req.user!.role !== "admin" && req.user!.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // If current password provided, verify it
    if (parsed.data.currentPassword) {
      const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!match) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    logger.error({ err }, "Change password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
