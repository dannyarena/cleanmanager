import { Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId, getUser } from "../auth/authContext";
import { isAdminOrManager } from "../middleware/roleMiddleware";
import { QueryParams, PaginatedResponse, CreateSiteRequest, UpdateSiteRequest } from "../types/api.types";
import { Site } from "@prisma/client";

/**
 * GET /sites - Lista siti con filtri e ricerca
 */
export const getSites: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { q, client_id, page = 1, limit = 20 } = req.query as QueryParams & { page?: string; limit?: string };
    
    const pageNum = parseInt(page.toString()) || 1;
    const limitNum = parseInt(limit.toString()) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Costruisci filtri
    const where: any = {
      tenantId: tenantId
    };

    // Filtro per cliente
    if (client_id) {
      where.clientId = client_id;
    }

    // Ricerca testuale su nome e indirizzo
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    // Esegui query con paginazione
    const [sites, total] = await Promise.all([
      prisma.site.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: {
          client: {
            select: {
              id: true,
              name: true
            }
          },
          checklists: {
            select: {
              id: true,
              title: true
            }
          },
          _count: {
            select: {
              checklists: true,
              shiftSites: true
            }
          }
        }
      }),
      prisma.site.count({ where })
    ]);

    const response: PaginatedResponse<Site & { client: any; checklists: any[]; _count: any }> = {
      data: sites,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Errore nel recupero siti:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * GET /sites/:id - Dettaglio sito
 */
export const getSite: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { id } = req.params;

    const site = await prisma.site.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        client: true,
        checklists: {
          include: {
            checkItems: {
              orderBy: { order: 'asc' }
            }
          }
        },
        _count: {
          select: {
            checklists: true,
            shiftSites: true
          }
        }
      }
    });

    if (!site) {
      return res.status(404).json({ error: "Sito non trovato" });
    }

    return res.json(site);
  } catch (error) {
    console.error('Errore nel recupero sito:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * POST /sites - Crea nuovo sito
 */
export const createSite: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione mancante" });
    }

    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono creare siti" });
    }

    const { name, address, clientId }: CreateSiteRequest = req.body;

    // Validazione
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Il nome del sito è obbligatorio" });
    }

    if (!address || address.trim().length === 0) {
      return res.status(400).json({ error: "L'indirizzo del sito è obbligatorio" });
    }

    if (!clientId) {
      return res.status(400).json({ error: "Il cliente è obbligatorio" });
    }

    // Verifica che il cliente esista e appartenga al tenant
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId
      }
    });

    if (!client) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }

    // Verifica unicità nome per cliente
    const existingSite = await prisma.site.findFirst({
      where: {
        name: name.trim(),
        clientId,
        tenantId
      }
    });

    if (existingSite) {
      return res.status(409).json({ error: "Esiste già un sito con questo nome per il cliente selezionato" });
    }

    const site = await prisma.site.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        clientId,
        tenantId // Usa sempre il tenantId dal token
      },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            checklists: true,
            shiftSites: true
          }
        }
      }
    });

    return res.status(201).json(site);
  } catch (error) {
    console.error('Errore nella creazione sito:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * PATCH /sites/:id - Aggiorna sito
 */
export const updateSite: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione mancante" });
    }

    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono modificare siti" });
    }

    const { id } = req.params;
    const { name, address, clientId }: UpdateSiteRequest = req.body;

    // Verifica esistenza sito
    const existingSite = await prisma.site.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingSite) {
      return res.status(404).json({ error: "Sito non trovato" });
    }

    // Se viene cambiato il cliente, verifica che esista
    if (clientId && clientId !== existingSite.clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          tenantId
        }
      });

      if (!client) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
    }

    // Verifica unicità nome se viene modificato
    if (name && name.trim() !== existingSite.name) {
      const targetClientId = clientId || existingSite.clientId;
      const duplicateSite = await prisma.site.findFirst({
        where: {
          name: name.trim(),
          clientId: targetClientId,
          tenantId,
          id: { not: id }
        }
      });

      if (duplicateSite) {
        return res.status(409).json({ error: "Esiste già un sito con questo nome per il cliente selezionato" });
      }
    }

    // Prepara dati per l'aggiornamento
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (clientId !== undefined) updateData.clientId = clientId;

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        checklists: {
          include: {
            checkItems: {
              orderBy: { order: 'asc' }
            }
          }
        },
        _count: {
          select: {
            checklists: true,
            shiftSites: true
          }
        }
      }
    });

    return res.json(site);
  } catch (error) {
    console.error('Errore nell\'aggiornamento sito:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * DELETE /sites/:id - Elimina sito
 */
export const deleteSite: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione mancante" });
    }

    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono eliminare siti" });
    }

    const { id } = req.params;

    // Verifica esistenza sito
    const existingSite = await prisma.site.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        _count: {
          select: {
            checklists: true,
            shiftSites: true
          }
        }
      }
    });

    if (!existingSite) {
      return res.status(404).json({ error: "Sito non trovato" });
    }

    // Verifica se ha turni associati
    if (existingSite._count.shiftSites > 0) {
      return res.status(409).json({ 
        error: "Impossibile eliminare il sito: ha turni associati",
        details: `Il sito ha ${existingSite._count.shiftSites} turni associati`
      });
    }

    // Elimina il sito (le checklist verranno eliminate automaticamente per CASCADE)
    await prisma.site.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Errore nell\'eliminazione sito:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};