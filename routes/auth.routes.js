import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/autho.controller.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);

export default router;
