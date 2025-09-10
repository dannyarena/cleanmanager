import { Router } from "express";
import { jwtRequired } from "../auth/jwtMiddleware";
import { requireTenant } from "../auth/authMiddleware";
import { requireAuthenticated } from "../middleware/roleMiddleware";
import {
  getOperators,
  getOperator,
  getAvailableOperators,
  createOperator,
  updateOperator,
  deleteOperator
} from "../controllers/operatorsController";

const router = Router();

// Applica middleware di base a tutte le rotte
router.use(jwtRequired);
router.use(requireTenant);

// GET /operators - Lista operatori (tutti possono leggere)
router.get('/', requireAuthenticated, getOperators);

// GET /operators/available - Lista operatori per dropdown (tutti possono leggere)
router.get('/available', requireAuthenticated, getAvailableOperators);

// POST /operators - Crea operatore (solo Admin/Manager)
router.post('/', createOperator);

// GET /operators/:id - Dettaglio operatore (tutti possono leggere)
router.get('/:id', requireAuthenticated, getOperator);

// PATCH /operators/:id - Aggiorna operatore (solo Admin/Manager)
router.patch('/:id', updateOperator);

// DELETE /operators/:id - Elimina operatore (solo Admin/Manager)
router.delete('/:id', deleteOperator);

export default router;