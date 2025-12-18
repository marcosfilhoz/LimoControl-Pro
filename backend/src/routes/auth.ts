import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { store } from "../store/store";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

router.post("/login", (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid credentials format" });
  }
  const { email, password } = parse.data;
  (async () => {
    const user = await store.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let ok = false;
    try {
      ok = bcrypt.compareSync(password, user.passwordHash);
    } catch (err) {
      // If the DB contains legacy/plaintext passwords, bcrypt can throw ("Invalid salt version").
      // Try a best-effort plaintext match; if it matches, upgrade to bcrypt.
      console.warn("Login bcrypt compare failed; attempting legacy match:", err);
      if (user.passwordHash === password) {
        ok = true;
        try {
          await store.users.resetPassword(user.id, password);
          console.log(`Upgraded legacy password hash for user ${user.id}`);
        } catch (e) {
          console.warn("Failed to upgrade legacy password hash:", e);
        }
      }
    }

    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: "8h" });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })().catch((err) => {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  });
});

export default router;

