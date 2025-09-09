import { Router } from "express";
import { jwtRequired } from "../auth/jwtMiddleware";
import { requireTenant } from "../auth/authMiddleware";
import { requireAuthenticated } from "../middleware/roleMiddleware";
import {
  getOperators,
  getOperator,
  getAvailableOperators
} from "../controllers/operatorsController";

const router = Router();

// Applica middleware di base a tutte le rotte
router.use(jwtRequired);
router.use(requireTenant);

// GET /operators - Lista operatori (tutti possono leggere)
router.get('/', requireAuthenticated, getOperators);

// GET /operators/available - Lista operatori per dropdown (tutti possono leggere)
router.get('/available', requireAuthenticated, getAvailableOperators);

// GET /operators/:id - Dettaglio operatore (tutti possono leggere)
router.get('/:id', requireAuthenticated, getOperator);

export default router;