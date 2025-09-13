import { Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId, getUser } from "../auth/authContext";
import { isAdminOrManager } from "../middleware/roleMiddleware";
import bcrypt from "bcryptjs";
import { QueryParams, PaginatedResponse, OperatorResponse, CreateOperatorRequest, UpdateOperatorRequest } from "../types/api.types";

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

/**
 * POST /operators - Crea nuovo operatore
 */
export const createOperator: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi - solo Admin può creare operatori
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono creare operatori" });
    }
    
    const { email, firstName, lastName, password, role, isManager = false } = req.body as CreateOperatorRequest;
    
    // Validazione campi obbligatori
    if (!email || !firstName || !lastName || !password || !role) {
      return res.status(400).json({ error: "Email, nome, cognome, password e ruolo sono obbligatori" });
    }
    
    // Verifica che l'email non sia già in uso nel tenant
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: "Email già in uso" });
    }
    
    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Converti il ruolo al formato del database
    const dbRole = role.toUpperCase() as 'OPERATORE' | 'ADMIN';
    
    // Crea l'operatore
    const newOperator = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: dbRole,
        isManager,
        tenantId // Usa sempre il tenantId dal token
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isManager: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Mappa il risultato al formato di risposta
    const mappedOperator: OperatorResponse = {
      id: newOperator.id,
      email: newOperator.email,
      firstName: newOperator.firstName,
      lastName: newOperator.lastName,
      role: newOperator.role.toLowerCase(),
      isManager: newOperator.isManager,
      createdAt: newOperator.createdAt,
      updatedAt: newOperator.updatedAt
    };
    
    return res.status(201).json(mappedOperator);
  } catch (error) {
    console.error('Errore nella creazione operatore:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * PATCH /operators/:id - Aggiorna operatore
 */
export const updateOperator: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono modificare operatori" });
    }
    
    const { id } = req.params;
    const { email, firstName, lastName, password, role, isManager } = req.body as UpdateOperatorRequest;
    
    // Verifica che l'operatore esista e appartenga al tenant
    const existingOperator = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: {
          in: ['OPERATORE', 'ADMIN']
        }
      }
    });
    
    if (!existingOperator) {
      return res.status(404).json({ error: "Operatore non trovato" });
    }
    
    // Se viene cambiata l'email, verifica che non sia già in uso nel tenant
    if (email && email !== existingOperator.email) {
      const emailInUse = await prisma.user.findFirst({
        where: { email, tenantId }
      });
      
      if (emailInUse) {
        return res.status(409).json({ error: "Email già in uso" });
      }
    }
    
    // Prepara i dati per l'aggiornamento
    const updateData: any = {};
    
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role.toUpperCase();
    if (isManager !== undefined) updateData.isManager = isManager;
    
    // Hash della nuova password se fornita
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Aggiorna l'operatore
    const updatedOperator = await prisma.user.updateMany({
      where: {
        id,
        tenantId
      },
      data: updateData
    });

    if (updatedOperator.count === 0) {
      return res.status(404).json({ error: "Operatore non trovato" });
    }

    // Recupera l'operatore aggiornato
    const operator = await prisma.user.findFirst({
      where: {
        id,
        tenantId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isManager: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!operator) {
      return res.status(404).json({ error: "Operatore non trovato" });
    }
    
    // Mappa il risultato al formato di risposta
    const mappedOperator: OperatorResponse = {
      id: operator.id,
      email: operator.email,
      firstName: operator.firstName,
      lastName: operator.lastName,
      role: operator.role.toLowerCase(),
      isManager: operator.isManager,
      createdAt: operator.createdAt,
      updatedAt: operator.updatedAt
    };
    
    return res.json(mappedOperator);
  } catch (error) {
    console.error('Errore nell\'aggiornamento operatore:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * DELETE /operators/:id - Elimina operatore
 */
export const deleteOperator: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono eliminare operatori" });
    }
    
    const { id } = req.params;
    
    // Verifica che l'operatore esista e appartenga al tenant
    const existingOperator = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: {
          in: ['OPERATORE', 'ADMIN']
        }
      },
      include: {
        _count: {
          select: {
            shiftOperators: true
          }
        }
      }
    });
    
    if (!existingOperator) {
      return res.status(404).json({ error: "Operatore non trovato" });
    }
    
    // Verifica se l'operatore ha turni assegnati
    if (existingOperator._count.shiftOperators > 0) {
      return res.status(409).json({ 
        error: "Impossibile eliminare l'operatore: ha turni assegnati",
        details: `L'operatore ha ${existingOperator._count.shiftOperators} turni assegnati`
      });
    }
    
    // Elimina l'operatore
    const deleteResult = await prisma.user.deleteMany({
      where: {
        id,
        tenantId
      }
    });

    if (deleteResult.count === 0) {
      return res.status(404).json({ error: "Operatore non trovato" });
    }

    // Restituisce l'oggetto eliminato per coerenza
    return res.json({
      id: existingOperator.id,
      email: existingOperator.email,
      firstName: existingOperator.firstName,
      lastName: existingOperator.lastName,
      role: existingOperator.role,
      isManager: existingOperator.isManager,
      tenantId: existingOperator.tenantId,
      createdAt: existingOperator.createdAt,
      updatedAt: existingOperator.updatedAt
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione operatore:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};