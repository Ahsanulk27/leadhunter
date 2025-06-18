import { Router } from "express";
import { authController } from "../controllers/auth-controller";
import { authMiddleware } from "../middleware/jwt-middleware";

const router = Router();

// Public routes
router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login.bind(authController));

// Protected routes
router.get(
  "/me",
  authMiddleware,
  authController.getCurrentUser.bind(authController)
);

export default router;
