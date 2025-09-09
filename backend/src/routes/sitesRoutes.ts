import { Router } from "express";
import { jwtRequired } from "../auth/jwtMiddleware";
import { requireTenant } from "../auth/authMiddleware";
import { requireAuthenticated, requireAdminOrManager } from "../middleware/roleMiddleware";
import {
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  getSiteChecklist,
  updateSiteChecklist
} from "../controllers/sitesController";

const router = Router();

// Applica middleware di base a tutte le rotte
router.use(jwtRequired);
router.use(requireTenant);

// GET /sites - Lista siti (tutti possono leggere)
router.get('/', requireAuthenticated, getSites);

// GET /sites/:id - Dettaglio sito (tutti possono leggere)
router.get('/:id', requireAuthenticated, getSite);

// POST /sites - Crea sito (solo Admin/Manager)
router.post('/', requireAdminOrManager, createSite);

// PATCH /sites/:id - Aggiorna sito (solo Admin/Manager)
router.patch('/:id', requireAdminOrManager, updateSite);

// DELETE /sites/:id - Elimina sito (solo Admin/Manager)
router.delete('/:id', requireAdminOrManager, deleteSite);

// GET /sites/:id/checklist - Recupera checklist per sito (tutti possono leggere)
router.get('/:id/checklist', requireAuthenticated, getSiteChecklist);

// PUT /sites/:id/checklist - Aggiorna checklist per sito (solo Admin/Manager)
router.put('/:id/checklist', requireAdminOrManager, updateSiteChecklist);

export default router;