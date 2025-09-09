import { Router } from "express";
import { jwtRequired } from "../auth/jwtMiddleware";
import { requireTenant } from "../auth/authMiddleware";
import { requireAuthenticated, requireAdminOrManager } from "../middleware/roleMiddleware";
import {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  assignSites,
  assignOperators
} from "../controllers/shiftsController";

const router = Router();

// Applica middleware di base a tutte le rotte
router.use(jwtRequired);
router.use(requireTenant);

// GET /shifts - Lista turni con generazione lazy ricorrenze (tutti possono leggere)
router.get('/', requireAuthenticated, getShifts);

// GET /shifts/:id - Recupera dettagli singolo turno (tutti gli utenti autenticati)
router.get('/:id', requireAuthenticated, getShiftById);

// POST /shifts - Crea turno singolo o ricorrente (solo Admin/Manager)
router.post('/', requireAdminOrManager, createShift);

// PATCH /shifts/:id - Aggiorna turno (occorrenza o serie) (solo Admin/Manager)
router.patch('/:id', requireAdminOrManager, updateShift);

// DELETE /shifts/:id - Elimina turno (occorrenza o serie) (solo Admin/Manager)
router.delete('/:id', requireAdminOrManager, deleteShift);

// POST /shifts/:id/sites - Assegna siti a turno (solo Admin/Manager)
router.post('/:id/sites', requireAdminOrManager, assignSites);

// POST /shifts/:id/operators - Assegna operatori a turno (solo Admin/Manager)
router.post('/:id/operators', requireAdminOrManager, assignOperators);

export default router;