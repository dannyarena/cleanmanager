import { Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId, getUser } from "../auth/authContext";
import { isAdminOrManager } from "../middleware/roleMiddleware";
import { 
  QueryShiftsParams, 
  PaginatedResponse, 
  CreateShiftRequest, 
  UpdateShiftRequest,
  AssignSitesRequest,
  AssignOperatorsRequest,
  ShiftResponse,
  OperatorConflict
} from "../types/api.types";
import { RecurrenceService } from "../services/recurrenceService";
import { RecurrenceFrequency } from "@prisma/client";

/**
 * GET /shifts - Lista turni con generazione lazy delle ricorrenze
 */
export const getShifts: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { from, to, q, site_id, operator_id, page = 1, limit = 50 } = req.query as QueryShiftsParams;
    
    // Calcola range di date (default: settimana corrente)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const rangeStart = from ? new Date(from) : startOfWeek;
    const rangeEnd = to ? new Date(to) : endOfWeek;
    
    // Costruisci filtri per turni master
    const where: any = {
      tenantId: tenantId
    };
    
    // Ricerca testuale
    if (q) {
      where.title = { contains: q, mode: 'insensitive' };
    }
    
    // Filtro per sito
    if (site_id) {
      where.shiftSites = {
        some: { siteId: site_id }
      };
    }
    
    // Filtro per operatore
    if (operator_id) {
      where.shiftOperators = {
        some: { userId: operator_id }
      };
    }
    
    // Recupera turni master dal database
    const masterShifts = await prisma.shift.findMany({
      where,
      include: {
        shiftSites: {
          include: {
            site: {
              include: {
                client: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        shiftOperators: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isManager: true
              }
            }
          }
        },
        shiftRecurrence: true,
        _count: {
          select: {
            shiftSites: true,
            shiftOperators: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });
    
    // Genera occorrenze per l'intervallo richiesto
    const allOccurrences: ShiftResponse[] = [];
    
    for (const shift of masterShifts) {
      if (shift.shiftRecurrence) {
        // Turno ricorrente: genera occorrenze
        const recurrenceOptions = {
          frequency: shift.shiftRecurrence.frequency,
          interval: shift.shiftRecurrence.interval,
          startDate: shift.shiftRecurrence.startDate,
          endDate: shift.shiftRecurrence.endDate || undefined,
          count: shift.shiftRecurrence.count || undefined
        };
        
        const occurrences = RecurrenceService.generateOccurrences(
          shift.date,
          recurrenceOptions,
          rangeStart,
          rangeEnd
        );
        
        // Crea oggetti ShiftResponse per ogni occorrenza
        for (const occurrence of occurrences) {
          allOccurrences.push({
            id: occurrence.isOriginal ? shift.id : `${shift.id}_${occurrence.date.toISOString().split('T')[0]}`,
            title: shift.title,
            date: occurrence.date,
            notes: shift.notes,
            tenantId: shift.tenantId,
            createdAt: shift.createdAt,
            updatedAt: shift.updatedAt,
            sites: shift.shiftSites.map(ss => ({
              id: ss.site.id,
              name: ss.site.name,
              address: ss.site.address,
              client: ss.site.client
            })),
            operators: shift.shiftOperators.map(so => ({
              id: so.user.id,
              firstName: so.user.firstName,
              lastName: so.user.lastName,
              isManager: so.user.isManager
            })),
            recurrence: {
              id: shift.shiftRecurrence.id,
              frequency: shift.shiftRecurrence.frequency.toLowerCase(),
              interval: shift.shiftRecurrence.interval,
              startDate: shift.shiftRecurrence.startDate,
              endDate: shift.shiftRecurrence.endDate,
              count: shift.shiftRecurrence.count
            },
            isRecurring: true,
            _count: shift._count
          });
        }
      } else {
        // Turno singolo: includi solo se nell'intervallo
        if (shift.date >= rangeStart && shift.date <= rangeEnd) {
          allOccurrences.push({
            id: shift.id,
            title: shift.title,
            date: shift.date,
            notes: shift.notes,
            tenantId: shift.tenantId,
            createdAt: shift.createdAt,
            updatedAt: shift.updatedAt,
            sites: shift.shiftSites.map(ss => ({
              id: ss.site.id,
              name: ss.site.name,
              address: ss.site.address,
              client: ss.site.client
            })),
            operators: shift.shiftOperators.map(so => ({
              id: so.user.id,
              firstName: so.user.firstName,
              lastName: so.user.lastName,
              isManager: so.user.isManager
            })),
            isRecurring: false,
            _count: shift._count
          });
        }
      }
    }
    
    // Ordina per data
    allOccurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Paginazione
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedOccurrences = allOccurrences.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<ShiftResponse> = {
      data: paginatedOccurrences,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allOccurrences.length,
        totalPages: Math.ceil(allOccurrences.length / limitNum)
      }
    };
    
    return res.json(response);
  } catch (error) {
    console.error('Errore nel recupero turni:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * POST /shifts - Crea nuovo turno (singolo o ricorrente)
 */
export const createShift: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono creare turni" });
    }
    
    const { title, date, notes, siteIds = [], operatorIds = [], recurrence } = req.body as CreateShiftRequest;
    
    // Validazione
    if (!title?.trim()) {
      return res.status(400).json({ error: "Il titolo è obbligatorio" });
    }
    
    if (!date) {
      return res.status(400).json({ error: "La data è obbligatoria" });
    }
    
    const shiftDate = new Date(date);
    if (isNaN(shiftDate.getTime())) {
      return res.status(400).json({ error: "Data non valida" });
    }
    
    // Verifica conflitti operatori
    const conflicts = await checkOperatorConflicts(operatorIds, shiftDate, tenantId);
    
    // Crea turno in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea turno master
      const shift = await tx.shift.create({
        data: {
          title: title.trim(),
          date: shiftDate,
          notes: notes?.trim() || null,
          tenantId: tenantId
        }
      });
      
      // Crea ricorrenza se specificata
      if (recurrence) {
        // Valida ricorrenza
        const recurrenceOptions = {
          frequency: recurrence.frequency === 'daily' ? RecurrenceFrequency.DAILY : RecurrenceFrequency.WEEKLY,
          interval: recurrence.interval,
          startDate: new Date(recurrence.startDate),
          endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
          count: recurrence.count
        };
        
        const validationErrors = RecurrenceService.validateRecurrence(recurrenceOptions);
        if (validationErrors.length > 0) {
          throw new Error(`Errori di validazione ricorrenza: ${validationErrors.join(', ')}`);
        }
        
        await tx.shiftRecurrence.create({
          data: {
            shiftId: shift.id,
            frequency: recurrenceOptions.frequency,
            interval: recurrenceOptions.interval,
            startDate: recurrenceOptions.startDate,
            endDate: recurrenceOptions.endDate,
            count: recurrenceOptions.count
          }
        });
      }
      
      // Assegna siti
      if (siteIds.length > 0) {
        await tx.shiftSite.createMany({
          data: siteIds.map(siteId => ({
            shiftId: shift.id,
            siteId: siteId
          }))
        });
      }
      
      // Assegna operatori
      if (operatorIds.length > 0) {
        await tx.shiftOperator.createMany({
          data: operatorIds.map(operatorId => ({
            shiftId: shift.id,
            userId: operatorId
          }))
        });
      }
      
      return shift;
    });
    
    // Recupera turno completo
    const createdShift = await getShiftByIdHelper(result.id, tenantId);
    
    return res.status(201).json({
      shift: createdShift,
      warnings: conflicts.length > 0 ? {
        operatorConflicts: conflicts
      } : undefined
    });
  } catch (error) {
    console.error('Errore nella creazione turno:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * PATCH /shifts/:id - Aggiorna turno (occorrenza singola o serie)
 */
export const updateShift: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono modificare turni" });
    }
    
    const { id } = req.params;
    const { title, date, notes, updateType = 'single' } = req.body as UpdateShiftRequest;
    
    // Trova turno
    const shift = await prisma.shift.findFirst({
      where: { id, tenantId },
      include: { shiftRecurrence: true }
    });
    
    if (!shift) {
      return res.status(404).json({ error: "Turno non trovato" });
    }
    
    // Prepara dati di aggiornamento
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (date !== undefined) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ error: "Data non valida" });
      }
      updateData.date = newDate;
    }
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Nessun campo da aggiornare" });
    }
    
    // Aggiorna turno
    if (shift.shiftRecurrence && updateType === 'series') {
      // Aggiorna tutta la serie (solo il turno master)
      await prisma.shift.update({
        where: { id },
        data: updateData
      });
    } else if (shift.shiftRecurrence && updateType === 'single') {
      // Per ora, per semplicità, creiamo un'eccezione
      // In una implementazione completa, si userebbe la tabella shift_exceptions
      return res.status(501).json({ 
        error: "Modifica di singole occorrenze non ancora implementata. Usa updateType: 'series'" 
      });
    } else {
      // Turno singolo
      await prisma.shift.update({
        where: { id },
        data: updateData
      });
    }
    
    // Recupera turno aggiornato
    const updatedShift = await getShiftByIdHelper(id, tenantId);
    
    return res.json(updatedShift);
  } catch (error) {
    console.error('Errore nell\'aggiornamento turno:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * DELETE /shifts/:id - Elimina turno (occorrenza singola o serie)
 */
export const deleteShift: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono eliminare turni" });
    }
    
    const { id } = req.params;
    const { deleteType = 'single' } = req.query;
    
    // Trova turno
    const shift = await prisma.shift.findFirst({
      where: { id, tenantId },
      include: { shiftRecurrence: true }
    });
    
    if (!shift) {
      return res.status(404).json({ error: "Turno non trovato" });
    }
    
    if (shift.shiftRecurrence && deleteType === 'series') {
      // Elimina tutta la serie
      await prisma.shift.delete({ where: { id } });
    } else if (shift.shiftRecurrence && deleteType === 'single') {
      // Per ora, per semplicità, restituiamo errore
      // In una implementazione completa, si userebbe la tabella shift_exceptions
      return res.status(501).json({ 
        error: "Eliminazione di singole occorrenze non ancora implementata. Usa deleteType: 'series'" 
      });
    } else {
      // Turno singolo
      await prisma.shift.delete({ where: { id } });
    }
    
    return res.status(204).send();
  } catch (error) {
    console.error('Errore nell\'eliminazione turno:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * POST /shifts/:id/sites - Assegna siti a un turno
 */
export const assignSites: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono assegnare siti" });
    }
    
    const { id } = req.params;
    const { siteIds } = req.body as AssignSitesRequest;
    
    if (!Array.isArray(siteIds)) {
      return res.status(400).json({ error: "siteIds deve essere un array" });
    }
    
    // Verifica che il turno esista
    const shift = await prisma.shift.findFirst({
      where: { id, tenantId }
    });
    
    if (!shift) {
      return res.status(404).json({ error: "Turno non trovato" });
    }
    
    // Sostituisci assegnazioni esistenti
    await prisma.$transaction(async (tx) => {
      // Rimuovi assegnazioni esistenti
      await tx.shiftSite.deleteMany({
        where: { shiftId: id }
      });
      
      // Crea nuove assegnazioni
      if (siteIds.length > 0) {
        await tx.shiftSite.createMany({
          data: siteIds.map(siteId => ({
            shiftId: id,
            siteId: siteId
          }))
        });
      }
    });
    
    // Recupera turno aggiornato
    const updatedShift = await getShiftByIdHelper(id, tenantId);
    
    return res.json(updatedShift);
  } catch (error) {
    console.error('Errore nell\'assegnazione siti:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * POST /shifts/:id/operators - Assegna operatori a un turno
 */
export const assignOperators: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    if (!tenantId || !user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    
    // Verifica permessi
    const hasPermission = await isAdminOrManager(user.sub, tenantId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Solo Admin e Manager possono assegnare operatori" });
    }
    
    const { id } = req.params;
    const { operatorIds } = req.body as AssignOperatorsRequest;
    
    if (!Array.isArray(operatorIds)) {
      return res.status(400).json({ error: "operatorIds deve essere un array" });
    }
    
    // Verifica che il turno esista
    const shift = await prisma.shift.findFirst({
      where: { id, tenantId }
    });
    
    if (!shift) {
      return res.status(404).json({ error: "Turno non trovato" });
    }
    
    // Verifica conflitti
    const conflicts = await checkOperatorConflicts(operatorIds, shift.date, tenantId, id);
    
    // Sostituisci assegnazioni esistenti
    await prisma.$transaction(async (tx) => {
      // Rimuovi assegnazioni esistenti
      await tx.shiftOperator.deleteMany({
        where: { shiftId: id }
      });
      
      // Crea nuove assegnazioni
      if (operatorIds.length > 0) {
        await tx.shiftOperator.createMany({
          data: operatorIds.map(operatorId => ({
            shiftId: id,
            userId: operatorId
          }))
        });
      }
    });
    
    // Recupera turno aggiornato
    const updatedShift = await getShiftByIdHelper(id, tenantId);
    
    return res.json({
      shift: updatedShift,
      warnings: conflicts.length > 0 ? {
        operatorConflicts: conflicts
      } : undefined
    });
  } catch (error) {
    console.error('Errore nell\'assegnazione operatori:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

// Funzioni helper

/**
 * Recupera un turno completo per ID (funzione helper)
 */
async function getShiftByIdHelper(id: string, tenantId: string): Promise<ShiftResponse> {
  const shift = await prisma.shift.findFirst({
    where: { id, tenantId },
    include: {
      shiftSites: {
        include: {
          site: {
            include: {
              client: {
                select: { id: true, name: true }
              }
            }
          }
        }
      },
      shiftOperators: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isManager: true
            }
          }
        }
      },
      shiftRecurrence: true,
      _count: {
        select: {
          shiftSites: true,
          shiftOperators: true
        }
      }
    }
  });
  
  if (!shift) {
    throw new Error('Turno non trovato');
  }
  
  return {
    id: shift.id,
    title: shift.title,
    date: shift.date,
    notes: shift.notes,
    tenantId: shift.tenantId,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
    sites: shift.shiftSites.map(ss => ({
      id: ss.site.id,
      name: ss.site.name,
      address: ss.site.address,
      client: ss.site.client
    })),
    operators: shift.shiftOperators.map(so => ({
      id: so.user.id,
      firstName: so.user.firstName,
      lastName: so.user.lastName,
      isManager: so.user.isManager
    })),
    recurrence: shift.shiftRecurrence ? {
      id: shift.shiftRecurrence.id,
      frequency: shift.shiftRecurrence.frequency.toLowerCase(),
      interval: shift.shiftRecurrence.interval,
      startDate: shift.shiftRecurrence.startDate,
      endDate: shift.shiftRecurrence.endDate,
      count: shift.shiftRecurrence.count
    } : undefined,
    isRecurring: !!shift.shiftRecurrence,
    _count: shift._count
  };
}

/**
 * GET /shifts/:id - Recupera dettagli di un singolo turno
 */
export const getShiftById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    // Cerca prima il turno master
    let shift = await prisma.shift.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        shiftSites: {
          include: {
            site: {
              include: {
                client: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        shiftOperators: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isManager: true
              }
            }
          }
        },
        shiftRecurrence: true,
        _count: {
          select: {
            shiftSites: true,
            shiftOperators: true
          }
        }
      }
    });

    // Se non trovato e l'ID contiene un underscore, potrebbe essere un'occorrenza ricorrente
    if (!shift && id.includes('_')) {
      const [masterId, dateStr] = id.split('_');
      const date = new Date(dateStr);
      
      // Trova il turno master
      const masterShift = await prisma.shift.findFirst({
        where: {
          id: masterId,
          tenantId
        },
        include: {
          shiftSites: {
            include: {
              site: {
                include: {
                  client: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          shiftOperators: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  isManager: true
                }
              }
            }
          },
          shiftRecurrence: true,
          _count: {
            select: {
              shiftSites: true,
              shiftOperators: true
            }
          }
        }
      });

      if (masterShift && masterShift.shiftRecurrence) {
        // Verifica che la data sia valida per questa ricorrenza
        const recurrenceOptions = {
          frequency: masterShift.shiftRecurrence.frequency,
          interval: masterShift.shiftRecurrence.interval,
          startDate: masterShift.shiftRecurrence.startDate,
          endDate: masterShift.shiftRecurrence.endDate || undefined,
          count: masterShift.shiftRecurrence.count || undefined
        };
        
        const occurrences = RecurrenceService.generateOccurrences(
          masterShift.date,
          recurrenceOptions,
          date,
          new Date(date.getTime() + 24 * 60 * 60 * 1000) // +1 giorno
        );

        if (occurrences.length > 0) {
          // Crea l'oggetto turno per l'occorrenza
          shift = {
            ...masterShift,
            id,
            date
          };
        }
      }
    }

    if (!shift) {
      return res.status(404).json({
        error: 'Turno non trovato'
      });
    }

    // Formatta la risposta
    const response: ShiftResponse = {
      id: shift.id,
      title: shift.title,
      date: shift.date,
      notes: shift.notes,
      tenantId: shift.tenantId,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
      sites: shift.shiftSites.map(ss => ({
        id: ss.site.id,
        name: ss.site.name,
        address: ss.site.address,
        client: ss.site.client
      })),
      operators: shift.shiftOperators.map(so => ({
        id: so.user.id,
        firstName: so.user.firstName,
        lastName: so.user.lastName,
        isManager: so.user.isManager
      })),
      recurrence: shift.shiftRecurrence ? {
        id: shift.shiftRecurrence.id,
        frequency: shift.shiftRecurrence.frequency.toLowerCase(),
        interval: shift.shiftRecurrence.interval,
        startDate: shift.shiftRecurrence.startDate,
        endDate: shift.shiftRecurrence.endDate,
        count: shift.shiftRecurrence.count
      } : undefined,
      isRecurring: !!shift.shiftRecurrence,
      _count: shift._count
    };

    return res.json(response);
  } catch (error) {
    console.error('Errore nel recupero turno:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * Verifica conflitti di operatori per una data specifica
 */
async function checkOperatorConflicts(
  operatorIds: string[], 
  date: Date, 
  tenantId: string, 
  excludeShiftId?: string
): Promise<OperatorConflict[]> {
  if (operatorIds.length === 0) return [];
  
  // Normalizza data per confronto
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(targetDate);
  nextDay.setDate(targetDate.getDate() + 1);
  
  // Trova turni esistenti nella stessa data
  const existingShifts = await prisma.shift.findMany({
    where: {
      tenantId,
      date: {
        gte: targetDate,
        lt: nextDay
      },
      id: excludeShiftId ? { not: excludeShiftId } : undefined
    },
    include: {
      shiftOperators: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });
  
  const conflicts: OperatorConflict[] = [];
  
  for (const operatorId of operatorIds) {
    for (const shift of existingShifts) {
      const conflictingOperator = shift.shiftOperators.find(so => so.userId === operatorId);
      if (conflictingOperator) {
        conflicts.push({
          operatorId,
          operatorName: `${conflictingOperator.user.firstName} ${conflictingOperator.user.lastName}`,
          conflictingShift: {
            id: shift.id,
            title: shift.title,
            date: shift.date
          }
        });
        break; // Un conflitto per operatore è sufficiente
      }
    }
  }
  
  return conflicts;
}