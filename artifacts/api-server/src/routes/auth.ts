import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

/** POST /api/auth/login */
router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { username, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/auth/me */
router.get("/auth/me", requireAuth, async (_req, res) => {
  // Auth bypassed: return hardcoded admin user for local development
  res.json({
    id: 1,
    username: "admin",
    email: "admin@volterp.com",
    fullName: "System Admin",
    role: "admin",
    isActive: true,
    createdAt: new Date().toISOString(),
  });
});


/** POST /api/auth/logout */
router.post("/auth/logout", requireAuth, (_req, res) => {
  // JWT is stateless; client clears the token
  res.json({ message: "Logged out successfully" });
});

export default router;
