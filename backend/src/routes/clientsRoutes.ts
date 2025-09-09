import { Router } from "express";
import { jwtRequired } from "../auth/jwtMiddleware";
import { requireTenant } from "../auth/authMiddleware";
import { requireAuthenticated, requireAdminOrManager } from "../middleware/roleMiddleware";
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
} from "../controllers/clientsController";

const router = Router();

// Applica middleware di base a tutte le rotte
router.use(jwtRequired);
router.use(requireTenant);

// GET /clients - Lista clienti (tutti possono leggere)
router.get('/', requireAuthenticated, getClients);

// GET /clients/:id - Dettaglio cliente (tutti possono leggere)
router.get('/:id', requireAuthenticated, getClient);

// POST /clients - Crea cliente (solo Admin/Manager)
router.post('/', requireAdminOrManager, createClient);

// PATCH /clients/:id - Aggiorna cliente (solo Admin/Manager)
router.patch('/:id', requireAdminOrManager, updateClient);

// DELETE /clients/:id - Elimina cliente (solo Admin/Manager)
router.delete('/:id', requireAdminOrManager, deleteClient);

export default router;