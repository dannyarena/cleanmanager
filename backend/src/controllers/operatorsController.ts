import { Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../auth/authContext";
import { QueryParams, PaginatedResponse, OperatorResponse } from "../types/api.types";

/**
 * GET /operators - Lista operatori con filtri e ricerca
 */
export const getOperators: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { q, page = 1, limit = 20 } = req.query as QueryParams & { page?: string; limit?: string };
    
    const pageNum = parseInt(page.toString()) || 1;
    const limitNum = parseInt(limit.toString()) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Costruisci filtri - solo utenti con ruolo OPERATORE o ADMIN
    const where: any = {
      tenantId: tenantId,
      role: {
        in: ['OPERATORE', 'ADMIN']
      }
    };

    // Ricerca testuale su nome, cognome, email
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ];
    }

    // Esegui query con paginazione
    const [operators, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ],
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isManager: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              shiftOperators: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Mappa i risultati al formato di risposta
    const mappedOperators: (OperatorResponse & { _count: any })[] = operators.map(op => ({
      id: op.id,
      email: op.email,
      firstName: op.firstName,
      lastName: op.lastName,
      role: op.role.toLowerCase(), // Converti da OPERATORE a operatore
      isManager: op.isManager,
      createdAt: op.createdAt,
      updatedAt: op.updatedAt,
      _count: op._count
    }));

    const response: PaginatedResponse<OperatorResponse & { _count: any }> = {
      data: mappedOperators,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Errore nel recupero operatori:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * GET /operators/:id - Dettaglio operatore
 */
export const getOperator: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { id } = req.params;

    const operator = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: {
          in: ['OPERATORE', 'ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isManager: true,
        createdAt: true,
        updatedAt: true,
        shiftOperators: {
          include: {
            shift: {
              select: {
                id: true,
                title: true,
                date: true
              }
            }
          },
          orderBy: {
            shift: {
              date: 'desc'
            }
          },
          take: 10 // Ultimi 10 turni
        },
        _count: {
          select: {
            shiftOperators: true
          }
        }
      }
    });

    if (!operator) {
      return res.status(404).json({ error: "Operatore non trovato" });
    }

    // Mappa il risultato al formato di risposta
    const mappedOperator = {
      id: operator.id,
      email: operator.email,
      firstName: operator.firstName,
      lastName: operator.lastName,
      role: operator.role.toLowerCase(),
      isManager: operator.isManager,
      createdAt: operator.createdAt,
      updatedAt: operator.updatedAt,
      recentShifts: operator.shiftOperators.map(so => so.shift),
      _count: operator._count
    };

    return res.json(mappedOperator);
  } catch (error) {
    console.error('Errore nel recupero operatore:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * GET /operators/available - Lista operatori disponibili per assegnazione turni
 * Endpoint semplificato che ritorna solo id, nome e cognome per dropdown/select
 */
export const getAvailableOperators: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { q } = req.query as QueryParams;

    // Costruisci filtri
    const where: any = {
      tenantId: tenantId,
      role: {
        in: ['OPERATORE', 'ADMIN']
      }
    };

    // Ricerca testuale
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } }
      ];
    }

    const operators = await prisma.user.findMany({
      where,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isManager: true,
        role: true
      }
    });

    // Formato semplificato per dropdown
    const simplifiedOperators = operators.map(op => ({
      id: op.id,
      name: `${op.firstName} ${op.lastName}`,
      firstName: op.firstName,
      lastName: op.lastName,
      isManager: op.isManager,
      role: op.role.toLowerCase()
    }));

    return res.json(simplifiedOperators);
  } catch (error) {
    console.error('Errore nel recupero operatori disponibili:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};