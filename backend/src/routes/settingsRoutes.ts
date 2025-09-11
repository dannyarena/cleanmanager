import { Router } from "express";
import { jwtRequired } from "../auth/jwtMiddleware";
import { requireTenant } from "../auth/authMiddleware";
import { requireAdminOrManager } from "../middleware/roleMiddleware";
import {
  getSettings,
  updateSettings
} from "../controllers/settingsController";

const router = Router();

// Applica middleware di base a tutte le rotte
router.use(jwtRequired);
router.use(requireTenant);

// GET /settings - Recupera impostazioni tenant (solo Admin/Manager)
router.get('/', requireAdminOrManager, getSettings);

// PUT /settings - Aggiorna impostazioni tenant (solo Admin/Manager)
router.put('/', requireAdminOrManager, updateSettings);

export default router;