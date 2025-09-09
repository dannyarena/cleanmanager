import { Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId, getUser } from "../auth/authContext";
import { isAdminOrManager } from "../middleware/roleMiddleware";
import { QueryParams, PaginatedResponse, CreateClientRequest, UpdateClientRequest } from "../types/api.types";
import { Client } from "@prisma/client";

/**
 * GET /clients - Lista clienti con filtri e ricerca
 */
export const getClients: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { q, page = 1, limit = 20 } = req.query as QueryParams & { page?: string; limit?: string };
    
    const pageNum = parseInt(page.toString()) || 1;
    const limitNum = parseInt(limit.toString()) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Costruisci filtri
    const where: any = {
      tenantId: tenantId
    };

    // Ricerca testuale su nome, email, telefono
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }

    // Esegui query con paginazione
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: {
          sites: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              sites: true
            }
          }
        }
      }),
      prisma.client.count({ where })
    ]);

    const response: PaginatedResponse<Client & { sites: any[]; _count: any }> = {
      data: clients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Errore nel recupero clienti:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * GET /clients/:id - Dettaglio cliente
 */
export const getClient: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { id } = req.params;

    const client = await prisma.client.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        sites: {
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            sites: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }

    return res.json(client);
  } catch (error) {
    console.error('Errore nel recupero cliente:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * POST /clients - Crea nuovo cliente
 */
export const createClient: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione mancante" });
    }

    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono creare clienti" });
    }

    const { name, email, phone, address }: CreateClientRequest = req.body;

    // Validazione
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Il nome del cliente è obbligatorio" });
    }

    // Verifica unicità nome per tenant
    const existingClient = await prisma.client.findFirst({
      where: {
        name: name.trim(),
        tenantId
      }
    });

    if (existingClient) {
      return res.status(409).json({ error: "Esiste già un cliente con questo nome" });
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        tenantId // Usa sempre il tenantId dal token
      },
      include: {
        _count: {
          select: {
            sites: true
          }
        }
      }
    });

    return res.status(201).json(client);
  } catch (error) {
    console.error('Errore nella creazione cliente:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * PATCH /clients/:id - Aggiorna cliente
 */
export const updateClient: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione mancante" });
    }

    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono modificare clienti" });
    }

    const { id } = req.params;
    const { name, email, phone, address }: UpdateClientRequest = req.body;

    // Verifica esistenza cliente
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingClient) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }

    // Verifica unicità nome se viene modificato
    if (name && name.trim() !== existingClient.name) {
      const duplicateClient = await prisma.client.findFirst({
        where: {
          name: name.trim(),
          tenantId,
          id: { not: id }
        }
      });

      if (duplicateClient) {
        return res.status(409).json({ error: "Esiste già un cliente con questo nome" });
      }
    }

    // Prepara dati per l'aggiornamento
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        sites: {
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            sites: true
          }
        }
      }
    });

    return res.json(client);
  } catch (error) {
    console.error('Errore nell\'aggiornamento cliente:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * DELETE /clients/:id - Elimina cliente
 */
export const deleteClient: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione mancante" });
    }

    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono eliminare clienti" });
    }

    const { id } = req.params;

    // Verifica esistenza cliente
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        _count: {
          select: {
            sites: true
          }
        }
      }
    });

    if (!existingClient) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }

    // Verifica se ha siti associati
    if (existingClient._count.sites > 0) {
      return res.status(409).json({ 
        error: "Impossibile eliminare il cliente: ha siti associati",
        details: `Il cliente ha ${existingClient._count.sites} siti associati`
      });
    }

    await prisma.client.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Errore nell\'eliminazione cliente:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};