import { Router } from "express";
import { login, me } from "./authController";
import { jwtRequired } from "./jwtMiddleware";

const router = Router();

// POST /auth/login
router.post("/login", login);

// GET /auth/me (protetta)
router.get("/me", jwtRequired, me);

export default router;