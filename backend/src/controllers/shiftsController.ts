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
  OperatorConflict,
  ShiftExceptionRequest
} from "../types/api.types";
import { RecurrenceService, ShiftException } from "../services/recurrenceService";
import { RecurrenceFrequency, ExceptionType } from "@prisma/client";
import { parseOccurrenceId, createOccurrenceId, isOccurrenceId } from "../lib/occurrenceHelper";

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
        // Turno ricorrente: genera occorrenze considerando le eccezioni
        const recurrenceOptions = {
          frequency: shift.shiftRecurrence.frequency,
          interval: shift.shiftRecurrence.interval,
          startDate: shift.shiftRecurrence.startDate,
          endDate: shift.shiftRecurrence.endDate || undefined,
          count: shift.shiftRecurrence.count || undefined
        };
        
        // Recupera eccezioni per questo turno
        const exceptions = await getShiftExceptions(shift.id, tenantId);
        
        const occurrences = RecurrenceService.generateOccurrences(
          shift.date,
          recurrenceOptions,
          rangeStart,
          rangeEnd,
          exceptions
        );
        
        // Crea oggetti ShiftResponse per ogni occorrenza
        for (const occurrence of occurrences) {
          // Determina siti e operatori per questa occorrenza
          let occurrenceSites = shift.shiftSites;
          let occurrenceOperators = shift.shiftOperators;
          
          if (occurrence.isException) {
            const exception = exceptions.find(ex => ex.date.getTime() === occurrence.date.getTime());
            if (exception) {
              // --- SITI ---
              if (Array.isArray(exception.siteIds)) {
                const siteIds = exception.siteIds;
                
                // Quelli già nel master
                const baseSites = shift.shiftSites.filter(ss => siteIds.includes(ss.siteId));
                
                // Quelli mancanti (presenti nell'eccezione ma non nel master)
                const missingSiteIds = siteIds.filter(
                  id => !shift.shiftSites.some(ss => ss.siteId === id)
                );
                
                let extraSites: typeof shift.shiftSites = [];
                if (missingSiteIds.length > 0) {
                  const dbSites = await prisma.site.findMany({
                    where: { id: { in: missingSiteIds }, tenantId },
                    include: { client: { select: { id: true, name: true } } }
                  });
                  // normalizza alla stessa shape di shift.shiftSites: { siteId, site }
                  extraSites = dbSites.map(s => ({ siteId: s.id, site: s }));
                }
                
                occurrenceSites = [...baseSites, ...extraSites];
              }
              
              // --- OPERATORI ---
              if (Array.isArray(exception.operatorIds)) {
                const operatorIds = exception.operatorIds;
                
                // Quelli già nel master
                const baseOps = shift.shiftOperators.filter(so => operatorIds.includes(so.userId));
                
                // Quelli mancanti (presenti nell'eccezione ma non nel master)
                const missingOpIds = operatorIds.filter(
                  id => !shift.shiftOperators.some(so => so.userId === id)
                );
                
                let extraOps: typeof shift.shiftOperators = [];
                if (missingOpIds.length > 0) {
                  const dbUsers = await prisma.user.findMany({
                    where: { id: { in: missingOpIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true, isManager: true }
                  });
                  // normalizza alla stessa shape di shift.shiftOperators: { userId, user }
                  extraOps = dbUsers.map(u => ({ userId: u.id, user: u }));
                }
                
                occurrenceOperators = [...baseOps, ...extraOps];
              }
              
              // title/notes override restano invariati (già gestiti)
            }
          }
          
          allOccurrences.push({
            id: occurrence.isOriginal ? shift.id : createOccurrenceId(shift.id, occurrence.date),
            title: occurrence.isException && occurrence.modifiedTitle ? occurrence.modifiedTitle : shift.title,
            date: occurrence.date,
            notes: occurrence.isException && occurrence.modifiedNotes ? occurrence.modifiedNotes : (shift.notes || undefined),
            tenantId: shift.tenantId,
            createdAt: shift.createdAt,
            updatedAt: shift.updatedAt,
            sites: occurrenceSites.map(ss => ({
              id: ss.site.id,
              name: ss.site.name,
              address: ss.site.address,
              client: ss.site.client
            })),
            operators: occurrenceOperators.map(so => ({
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
              endDate: shift.shiftRecurrence.endDate || undefined,
              count: shift.shiftRecurrence.count || undefined
            },
            isRecurring: true,
            _count: {
              sites: occurrenceSites.length,
              operators: occurrenceOperators.length
            }
          });
        }
      } else {
        // Turno singolo: includi solo se nell'intervallo
        if (shift.date >= rangeStart && shift.date <= rangeEnd) {
          allOccurrences.push({
            id: shift.id,
            title: shift.title,
            date: shift.date,
            notes: shift.notes || undefined,
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
            _count: {
              sites: shift._count?.shiftSites || 0,
              operators: shift._count?.shiftOperators || 0
            }
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
    let conflicts: OperatorConflict[] = [];
    
    if (recurrence) {
      // Per turni ricorrenti, controlla conflitti su tutto il range della ricorrenza
      const startDate = recurrence.startDate ? new Date(recurrence.startDate) : shiftDate;
      const endDate = recurrence.endDate ? new Date(recurrence.endDate) : new Date('2030-12-31'); // Data molto futura se non specificata
      
      conflicts = await checkOperatorConflictsInRange(operatorIds, startDate, endDate, tenantId);
    } else {
      // Per turni singoli, controlla solo la data specifica
      conflicts = await checkOperatorConflicts(operatorIds, shiftDate, tenantId);
    }
    
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
        // Valida startDate della ricorrenza
        if (!recurrence.startDate) {
          throw new Error("La data di inizio della ricorrenza è obbligatoria");
        }
        
        const recurrenceStartDate = new Date(recurrence.startDate);
        if (isNaN(recurrenceStartDate.getTime())) {
          throw new Error("Data di inizio della ricorrenza non valida");
        }
        
        // Valida ricorrenza
        const recurrenceOptions = {
          frequency: recurrence.frequency === 'daily' ? RecurrenceFrequency.DAILY : RecurrenceFrequency.WEEKLY,
          interval: recurrence.interval,
          startDate: recurrenceStartDate,
          endDate: recurrence.endDate ? (() => {
            const endDate = new Date(recurrence.endDate!);
            if (isNaN(endDate.getTime())) {
              throw new Error("Data di fine della ricorrenza non valida");
            }
            return endDate;
          })() : undefined,
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
    const { title, date, notes, siteIds, operatorIds, updateType = 'single', applyTo, override, recurrence } = req.body as UpdateShiftRequest;
    const actualApplyTo = applyTo || updateType; // Supporta entrambi per retrocompatibilità
    
    // Verifica se è un'occorrenza di turno ricorrente (formato: masterId_YYYY-MM-DD)
    if (!id) {
      return res.status(400).json({ error: 'ID turno non valido' });
    }
    const parsedId = parseOccurrenceId(id);
    if (parsedId.occurrenceDate) {
      const { masterId, occurrenceDate: targetDate } = parsedId;
      
      // Verifica che il turno master esista e appartenga al tenant
      const masterShift = await prisma.shift.findFirst({
        where: { id: masterId, tenantId },
        include: { shiftRecurrence: true }
      });

      if (!masterShift || !masterShift.shiftRecurrence) {
        return res.status(404).json({ error: "Turno ricorrente non trovato" });
      }

      // Verifica che la data sia un'occorrenza valida
      const isValid = await isValidRecurrenceOccurrence(masterId, targetDate, tenantId);
      if (!isValid) {
        return res.status(400).json({ error: "Data non valida per questo turno ricorrente" });
      }

      // MODALITÀ SINGLE: Crea/aggiorna ShiftException MODIFIED
      if (actualApplyTo === 'single') {
        const newTitle = override?.title || title;
        const newNotes = override?.notes || notes;
        const newDate = override?.date || date ? new Date(override?.date || date!) : undefined;
        
        console.log('🔍 UpdateShift SINGLE - Dati ricevuti:', {
          masterId,
          targetDate,
          newTitle,
          newNotes,
          newDate,
          siteIds: siteIds?.length || 0,
          operatorIds: operatorIds?.length || 0,
          siteIdsArray: siteIds,
          operatorIdsArray: operatorIds
        });
        
        await createShiftException(
          masterId, 
          targetDate, 
          ExceptionType.MODIFIED,
          newTitle?.trim(),
          newNotes?.trim(),
          newDate,
          siteIds,
          operatorIds
        );
        
        // Recupera turno aggiornato con le modifiche dell'eccezione
        const updatedShift = await getShiftByIdHelper(masterId, tenantId);
        
        return res.json({
          result: 'override_created',
          shift: {
            ...updatedShift,
            id,
            date: newDate || targetDate,
            title: newTitle?.trim() || updatedShift.title,
            notes: newNotes?.trim() || updatedShift.notes
          }
        });
      }
      
      // Per series e this_and_future, continua con la logica del master
      // Usa il masterId per il resto della funzione
      req.params.id = masterId;
    }
    
    // Trova turno master
    const shift = await prisma.shift.findFirst({
      where: { id: req.params.id, tenantId },
      include: { 
        shiftRecurrence: true,
        shiftSites: { include: { site: true } },
        shiftOperators: { include: { user: true } }
      }
    });
    
    if (!shift) {
      return res.status(404).json({ error: "Turno non trovato" });
    }
    
    // MODALITÀ SERIES: Aggiorna Shift/ShiftRecurrence
    if (actualApplyTo === 'series') {
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
      
      const recurrenceUpdateData: any = {};
      if (recurrence?.frequency) recurrenceUpdateData.frequency = recurrence.frequency.toUpperCase();
      if (recurrence?.interval) recurrenceUpdateData.interval = recurrence.interval;
      if (recurrence?.startDate) recurrenceUpdateData.startDate = new Date(recurrence.startDate);
      if (recurrence?.endDate) recurrenceUpdateData.endDate = new Date(recurrence.endDate);
      if (recurrence?.count !== undefined) recurrenceUpdateData.count = recurrence.count;
      
      await prisma.$transaction(async (tx) => {
        // Aggiorna il turno master
        if (Object.keys(updateData).length > 0) {
          await tx.shift.update({
            where: { id: shift.id },
            data: updateData
          });
        }
        
        // Aggiorna siti se specificati
        if (siteIds !== undefined) {
          // Rimuovi tutte le assegnazioni esistenti
          await tx.shiftSite.deleteMany({
            where: { shiftId: shift.id }
          });
          
          // Aggiungi le nuove assegnazioni
          if (siteIds.length > 0) {
            await tx.shiftSite.createMany({
              data: siteIds.map(siteId => ({
                shiftId: shift.id,
                siteId: siteId
              }))
            });
          }
        }
        
        // Aggiorna operatori se specificati
        if (operatorIds !== undefined) {
          // Rimuovi tutte le assegnazioni esistenti
          await tx.shiftOperator.deleteMany({
            where: { shiftId: shift.id }
          });
          
          // Aggiungi le nuove assegnazioni
          if (operatorIds.length > 0) {
            await tx.shiftOperator.createMany({
              data: operatorIds.map(operatorId => ({
                shiftId: shift.id,
                userId: operatorId
              }))
            });
          }
        }
        
        // Aggiorna la ricorrenza se presente
        if (shift.shiftRecurrence && Object.keys(recurrenceUpdateData).length > 0) {
          await tx.shiftRecurrence.update({
            where: { id: shift.shiftRecurrence.id },
            data: recurrenceUpdateData
          });
        }
      });
      
      const updatedShift = await getShiftByIdHelper(shift.id, tenantId);
      return res.json({
        result: 'series_updated',
        shift: updatedShift
      });
    }
    
    // MODALITÀ THIS_AND_FUTURE: Split della serie
    if (actualApplyTo === 'this_and_future') {
      if (!shift.shiftRecurrence) {
        return res.status(400).json({ error: "Impossibile dividere un turno non ricorrente" });
      }
      
      // Determina la data pivot (data dell'occorrenza o data del master se non specificata)
      const pivotDate = parsedId.occurrenceDate || shift.date;
      
      // Prepara i dati per il nuovo turno
      const newShiftData: any = {
        title: title?.trim() || shift.title,
        date: date ? new Date(date) : pivotDate,
        notes: notes?.trim() !== undefined ? notes?.trim() || null : shift.notes,
        tenantId: shift.tenantId
      };
      
      // Prepara i dati per la nuova ricorrenza
      const newRecurrenceData: any = {
        frequency: recurrence?.frequency?.toUpperCase() || shift.shiftRecurrence.frequency,
        interval: recurrence?.interval || shift.shiftRecurrence.interval,
        startDate: recurrence?.startDate ? new Date(recurrence.startDate) : newShiftData.date,
        endDate: recurrence?.endDate ? new Date(recurrence.endDate) : shift.shiftRecurrence.endDate,
        count: recurrence?.count !== undefined ? recurrence.count : shift.shiftRecurrence.count
      };
      
      const newShiftResult = await prisma.$transaction(async (tx) => {
        // 1. Crea nuovo master con startDate=pivotDate + nuove proprietà
        const newShift = await tx.shift.create({
          data: {
            ...newShiftData,
            shiftRecurrence: {
              create: newRecurrenceData
            }
          },
          include: { shiftRecurrence: true }
        });
        
        // 2. Assegna siti (nuovi se specificati, altrimenti copia dal master originale)
        const sitesToAssign = siteIds !== undefined ? siteIds : shift.shiftSites.map(ss => ss.siteId);
        if (sitesToAssign.length > 0) {
          await tx.shiftSite.createMany({
            data: sitesToAssign.map(siteId => ({
              shiftId: newShift.id,
              siteId: siteId
            }))
          });
        }
        
        // 3. Assegna operatori (nuovi se specificati, altrimenti copia dal master originale)
        const operatorsToAssign = operatorIds !== undefined ? operatorIds : shift.shiftOperators.map(so => so.userId);
        if (operatorsToAssign.length > 0) {
          await tx.shiftOperator.createMany({
            data: operatorsToAssign.map(operatorId => ({
              shiftId: newShift.id,
              userId: operatorId
            }))
          });
        }
        
        // 4. Migra ShiftException con date>=pivotDate al nuovo master
        const futureExceptions = await tx.shiftException.findMany({
          where: {
            shiftId: shift.id,
            date: { gte: pivotDate }
          }
        });
        
        if (futureExceptions.length > 0) {
          await tx.shiftException.createMany({
            data: futureExceptions.map(ex => ({
              shiftId: newShift.id,
              date: ex.date,
              exceptionType: ex.exceptionType,
              newTitle: ex.newTitle,
              newNotes: ex.newNotes,
              newDate: ex.newDate
            }))
          });
          
          await tx.shiftException.deleteMany({
            where: {
              shiftId: shift.id,
              date: { gte: pivotDate }
            }
          });
        }
        
        // 5. Accorcia endDate del vecchio master a pivotDate - 1 giorno
        const endDateForOriginal = new Date(pivotDate);
        endDateForOriginal.setDate(endDateForOriginal.getDate() - 1);
        
        await tx.shiftRecurrence.update({
          where: { id: shift.shiftRecurrence.id },
          data: { endDate: endDateForOriginal }
        });
        
        // Recupera il nuovo turno creato
        const updatedShift = await getShiftByIdHelper(newShift.id, tenantId, tx);
        return updatedShift;
      });
      
      return res.json({
        result: 'series_split',
        shift: newShiftResult
      });
    } else if (shift.shiftRecurrence && updateType === 'single') {
      return res.status(400).json({ 
        error: "Per modificare una singola occorrenza, usa l'ID dell'occorrenza (formato: masterId_YYYY-MM-DD)",
        hint: "Per modificare tutta la serie, usa updateType: 'series'"
      });
    } else {
      // Turno singolo
      await prisma.$transaction(async (tx) => {
        const updateData: any = {};
        if (title !== undefined) updateData.title = title.trim();
        if (date !== undefined) {
          const newDate = new Date(date);
          if (isNaN(newDate.getTime())) {
            throw new Error("Data non valida");
          }
          updateData.date = newDate;
        }
        if (notes !== undefined) updateData.notes = notes?.trim() || null;
        
        // Aggiorna i dati base del turno
        await tx.shift.update({
          where: { id },
          data: updateData
        });
        
        // Aggiorna siti se specificati
        if (siteIds !== undefined) {
          // Rimuovi tutte le assegnazioni esistenti
          await tx.shiftSite.deleteMany({
            where: { shiftId: id }
          });
          
          // Aggiungi le nuove assegnazioni
          if (siteIds.length > 0) {
            await tx.shiftSite.createMany({
              data: siteIds.map(siteId => ({
                shiftId: id,
                siteId: siteId
              }))
            });
          }
        }
        
        // Aggiorna operatori se specificati
        if (operatorIds !== undefined) {
          // Rimuovi tutte le assegnazioni esistenti
          await tx.shiftOperator.deleteMany({
            where: { shiftId: id }
          });
          
          // Aggiungi le nuove assegnazioni
          if (operatorIds.length > 0) {
            await tx.shiftOperator.createMany({
              data: operatorIds.map(operatorId => ({
                shiftId: id,
                userId: operatorId
              }))
            });
          }
        }
      });
    }
    
    // Recupera turno aggiornato
    if (!id) {
      return res.status(400).json({ error: 'ID turno non valido' });
    }
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
    // Supporto retro-compatibilità: eventuale 'occurrence' viene trattato come 'single'
    let { deleteType = 'single' } = { ...req.query, ...req.body } as { deleteType?: 'single' | 'series' | 'this_and_future' | 'occurrence' };
    if (deleteType === 'occurrence') deleteType = 'single';
    
    // Data occorrenza passata da FE (ISO o YYYY-MM-DD)
    const merged = { ...req.query, ...req.body } as any;
    let occurrenceDate: Date | undefined = merged.occurrenceDate ? new Date(merged.occurrenceDate) : undefined;
    if (occurrenceDate) occurrenceDate.setUTCHours(0,0,0,0);
    
    if (!id) {
      return res.status(400).json({ error: 'ID turno non valido' });
    }
    
    const parsedId = parseOccurrenceId(id);
    
    if (parsedId.occurrenceDate) {
      const { masterId, occurrenceDate: targetDate } = parsedId;

      const masterShift = await prisma.shift.findFirst({
        where: { id: masterId, tenantId },
        include: { shiftRecurrence: true }
      });
      if (!masterShift || !masterShift.shiftRecurrence) {
        return res.status(404).json({ error: "Turno ricorrente non trovato" });
      }

      const isValid = await isValidRecurrenceOccurrence(masterId, targetDate, tenantId);
      if (!isValid) {
        return res.status(400).json({ error: "Data non valida per questo turno ricorrente" });
      }

      if (deleteType === 'single') {
        await createShiftException(masterId, targetDate, ExceptionType.CANCELLED);
        return res.json({ result: 'occurrence_cancelled' });
      }

      if (deleteType === 'this_and_future') {
        const pivotDate = targetDate;
        const endDateForOriginal = new Date(pivotDate);
        endDateForOriginal.setDate(endDateForOriginal.getDate() - 1);

        if (endDateForOriginal < masterShift.shiftRecurrence.startDate) {
          await prisma.shift.delete({ where: { id: masterId } });
          return res.json({ result: 'series_deleted', message: "Serie eliminata completamente (nessuna occorrenza rimanente)" });
        }

        await prisma.$transaction(async (tx) => {
          await tx.shiftRecurrence.update({
            where: { id: masterShift.shiftRecurrence!.id },
            data: { endDate: endDateForOriginal }
          });
          await tx.shiftException.deleteMany({
            where: { shiftId: masterId, date: { gte: pivotDate } }
          });
        });

        return res.json({ result: 'series_truncated', message: "Serie terminata da questa data in poi" });
      }

      if (deleteType === 'series') {
        await prisma.shift.delete({ where: { id: masterId } });
        return res.json({ result: 'series_deleted' });
      }

      return res.status(400).json({ error: "deleteType non valido" });
    }
    
    // CASO 2: ID master - gestisce deleteType
    const shift = await prisma.shift.findFirst({
      where: { id, tenantId },
      include: { 
        shiftRecurrence: true,
        shiftSites: true,
        shiftOperators: true
      }
    });
    
    if (!shift) {
      return res.status(404).json({ error: "Turno non trovato" });
    }
    
    // MODALITÀ SINGLE per turno master
    if (deleteType === 'single') {
      if (shift.shiftRecurrence) {
        if (!occurrenceDate) {
          return res.status(400).json({
            error: "Per eliminare una singola occorrenza di un turno ricorrente devi passare occurrenceDate o usare l'ID di occorrenza (masterId_YYYY-MM-DD)"
          });
        }
        const valid = await isValidRecurrenceOccurrence(shift.id, occurrenceDate, tenantId);
        if (!valid) return res.status(400).json({ error: "Data non valida per questa ricorrenza" });

        await createShiftException(shift.id, occurrenceDate, ExceptionType.CANCELLED);
        return res.json({ result: 'occurrence_cancelled' });
      }

      await prisma.shift.delete({ where: { id } });
      return res.json({ result: 'single_deleted' });
    }
    
    // MODALITÀ SERIES: Cancella master + N:N + recurrence + eccezioni
    if (deleteType === 'series') {
      if (!shift.shiftRecurrence) {
        return res.status(400).json({ error: "deleteType 'series' è valido solo per turni ricorrenti" });
      }
      
      // Elimina tutto (cascade eliminerà N:N, recurrence, eccezioni)
      await prisma.shift.delete({ where: { id } });
      
      return res.json({ 
        result: 'series_deleted',
        message: "Serie ricorrente eliminata con successo" 
      });
    }
    
    // MODALITÀ THIS_AND_FUTURE: Tronca la serie
    if (deleteType === 'this_and_future') {
      if (!shift.shiftRecurrence) {
        return res.status(400).json({ error: "deleteType 'this_and_future' è valido solo per turni ricorrenti" });
      }

      const pivotDate = occurrenceDate ?? shift.date;
      const endDateForOriginal = new Date(pivotDate);
      endDateForOriginal.setDate(endDateForOriginal.getDate() - 1);

      if (endDateForOriginal < shift.shiftRecurrence.startDate) {
        await prisma.shift.delete({ where: { id } });
        return res.json({ result: 'series_deleted', message: "Serie eliminata completamente (nessuna occorrenza rimanente)" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.shiftRecurrence.update({ where: { id: shift.shiftRecurrence!.id }, data: { endDate: endDateForOriginal } });
        await tx.shiftException.deleteMany({ where: { shiftId: id, date: { gte: pivotDate } } });
      });

      return res.json({ result: 'series_truncated' });
    }
    
    return res.status(400).json({ error: "deleteType non valido" });
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
        if (!id) {
          throw new Error('ID turno richiesto per assegnare siti');
        }
        await tx.shiftSite.createMany({
          data: siteIds.map(siteId => ({
            shiftId: id,
            siteId: siteId
          }))
        });
      }
    });
    
    // Recupera turno aggiornato
    if (!id) {
      return res.status(400).json({ error: 'ID turno non valido' });
    }
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
/**
 * GET /shifts/:id/exceptions - Debug: mostra eccezioni per un turno (temporaneo)
 */
export const getShiftExceptionsDebug: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const { id } = req.params;
    
    const exceptions = await prisma.shiftException.findMany({
      where: {
        shiftId: id,
        shift: { tenantId }
      },
      orderBy: { date: 'asc' }
    });

    return res.json({ exceptions });
  } catch (error) {
    console.error('Errore nel recupero eccezioni:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

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
    const { operatorIds, applyTo = 'single' } = req.body as AssignOperatorsRequest & { applyTo?: 'single' | 'series' | 'this_and_future' };
    
    if (!Array.isArray(operatorIds)) {
      return res.status(400).json({ error: "operatorIds deve essere un array" });
    }
    
    // Verifica che il turno esista
    const shift = await prisma.shift.findFirst({
      where: { id, tenantId },
      include: { shiftRecurrence: true }
    });
    
    if (!shift) {
      return res.status(404).json({ error: "Turno non trovato" });
    }
    
    // Verifica conflitti in base al tipo di applicazione
    let conflicts: OperatorConflict[] = [];
    
    if (shift.shiftRecurrence && (applyTo === 'series' || applyTo === 'this_and_future')) {
      // Per series e this_and_future, controlla su un range di date
      let startDate = shift.date;
      let endDate = shift.shiftRecurrence.endDate || new Date('2030-12-31'); // Data molto futura se non specificata
      
      if (applyTo === 'this_and_future') {
        // Per this_and_future, inizia dalla data corrente
        startDate = new Date();
      }
      
      conflicts = await checkOperatorConflictsInRange(operatorIds, startDate, endDate, tenantId, id);
    } else {
      // Per single o turni non ricorrenti, controlla solo la data specifica
      conflicts = await checkOperatorConflicts(operatorIds, shift.date, tenantId, id);
    }
    
    // Sostituisci assegnazioni esistenti
    await prisma.$transaction(async (tx) => {
      // Rimuovi assegnazioni esistenti
      await tx.shiftOperator.deleteMany({
        where: { shiftId: id }
      });
      
      // Crea nuove assegnazioni
      if (operatorIds.length > 0) {
        if (!id) {
          throw new Error('ID turno richiesto per assegnare operatori');
        }
        await tx.shiftOperator.createMany({
          data: operatorIds.map(operatorId => ({
            shiftId: id,
            userId: operatorId
          }))
        });
      }
    });
    
    // Recupera turno aggiornato
    if (!id) {
      return res.status(400).json({ error: 'ID turno non valido' });
    }
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
async function getShiftByIdHelper(id: string, tenantId: string, txClient?: any): Promise<ShiftResponse> {
  const client = txClient || prisma;
  const shift = await client.shift.findFirst({
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
    notes: shift.notes || undefined,
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
      endDate: shift.shiftRecurrence.endDate || undefined,
      count: shift.shiftRecurrence.count || undefined
    } : undefined,
    isRecurring: !!shift.shiftRecurrence,
    _count: {
      sites: shift._count?.shiftSites || 0,
      operators: shift._count?.shiftOperators || 0
    }
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
    if (!shift && id && isOccurrenceId(id)) {
      const { masterId, occurrenceDate: date } = parseOccurrenceId(id);
      
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
        
        // Recupera eccezioni per questo turno
        const exceptions = await getShiftExceptions(masterId, tenantId);
        
        if (!date) {
          return res.status(400).json({ error: 'Data occorrenza non valida' });
        }
        
        const occurrences = RecurrenceService.generateOccurrences(
          masterShift.date,
          recurrenceOptions,
          date,
          new Date(date.getTime() + 24 * 60 * 60 * 1000), // +1 giorno
          exceptions
        );

        if (occurrences.length > 0) {
          const occurrence = occurrences[0];
          if (!occurrence) {
            return res.status(404).json({ error: 'Occorrenza non trovata' });
          }
          
          // Se l'occorrenza è cancellata, restituisci 404
          if (occurrence.exceptionType === 'CANCELLED') {
            return res.status(404).json({
              error: 'Occorrenza turno cancellata'
            });
          }
          
          // Crea l'oggetto turno per l'occorrenza
          if (!id) {
            return res.status(400).json({ error: 'ID turno non valido' });
          }
          
          // Determina siti e operatori per questa occorrenza
          let occurrenceSites = masterShift.shiftSites;
          let occurrenceOperators = masterShift.shiftOperators;
          
          if (occurrence.isException) {
            const exception = exceptions.find(ex => ex.date.getTime() === occurrence.date.getTime());
            if (exception) {
              // --- SITI ---
              if (Array.isArray(exception.siteIds)) {
                const siteIds = exception.siteIds;
                
                // Quelli già nel master
                const baseSites = masterShift.shiftSites.filter(ss => siteIds.includes(ss.siteId));
                
                // Quelli mancanti (presenti nell'eccezione ma non nel master)
                const missingSiteIds = siteIds.filter(
                  id => !masterShift.shiftSites.some(ss => ss.siteId === id)
                );
                
                let extraSites: typeof masterShift.shiftSites = [];
                if (missingSiteIds.length > 0) {
                  const dbSites = await prisma.site.findMany({
                    where: { id: { in: missingSiteIds }, tenantId },
                    include: { client: { select: { id: true, name: true } } }
                  });
                  // normalizza alla stessa shape di shift.shiftSites: { siteId, site }
                  extraSites = dbSites.map(s => ({ siteId: s.id, site: s }));
                }
                
                occurrenceSites = [...baseSites, ...extraSites];
              }
              
              // --- OPERATORI ---
              if (Array.isArray(exception.operatorIds)) {
                const operatorIds = exception.operatorIds;
                
                // Quelli già nel master
                const baseOps = masterShift.shiftOperators.filter(so => operatorIds.includes(so.userId));
                
                // Quelli mancanti (presenti nell'eccezione ma non nel master)
                const missingOpIds = operatorIds.filter(
                  id => !masterShift.shiftOperators.some(so => so.userId === id)
                );
                
                let extraOps: typeof masterShift.shiftOperators = [];
                if (missingOpIds.length > 0) {
                  const dbUsers = await prisma.user.findMany({
                    where: { id: { in: missingOpIds }, tenantId },
                    select: { id: true, firstName: true, lastName: true, isManager: true }
                  });
                  // normalizza alla stessa shape di shift.shiftOperators: { userId, user }
                  extraOps = dbUsers.map(u => ({ userId: u.id, user: u }));
                }
                
                occurrenceOperators = [...baseOps, ...extraOps];
              }
            }
          }
          
          shift = {
            ...masterShift,
            id,
            date: occurrence.date,
            title: (occurrence.isException && occurrence.modifiedTitle) ? occurrence.modifiedTitle : masterShift.title,
            notes: (occurrence.isException && occurrence.modifiedNotes) ? occurrence.modifiedNotes : (masterShift.notes || null),
            shiftSites: occurrenceSites,
            shiftOperators: occurrenceOperators
          } as any;
          
          // Aggiungi proprietà extra per l'occorrenza
          (shift as any).isOverridden = occurrence.isException || false;
          (shift as any).exceptionType = occurrence.exceptionType || null;
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
      notes: shift.notes || undefined,
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
        endDate: shift.shiftRecurrence.endDate || undefined,
        count: shift.shiftRecurrence.count || undefined
      } : undefined,
      isRecurring: !!shift.shiftRecurrence,
      isOverridden: (shift as any).isOverridden,
      exceptionType: (shift as any).exceptionType,
      _count: {
        sites: shift._count?.shiftSites || 0,
        operators: shift._count?.shiftOperators || 0
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Errore nel recupero turno:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * Calcola la pivotDate per operazioni "this_and_future"
 */
function calculatePivotDate(occurrenceDate?: Date, bodyDate?: Date): Date {
  // Priorità: occurrenceDate (da ID sintetico) > bodyDate > data corrente
  if (occurrenceDate) {
    return new Date(occurrenceDate);
  }
  if (bodyDate) {
    return new Date(bodyDate);
  }
  return new Date();
}

/**
 * Verifica conflitti di operatori per una data specifica
 */
async function checkOperatorConflicts(
  operatorIds: string[], 
  date: Date, 
  tenantId: string, 
  excludeShiftId?: string
): Promise<OperatorConflict[]> {
  return checkOperatorConflictsInRange(operatorIds, date, date, tenantId, excludeShiftId);
}

/**
 * Verifica conflitti operatori in un range di date (per series/this_and_future)
 */
async function checkOperatorConflictsInRange(
  operatorIds: string[], 
  startDate: Date, 
  endDate: Date,
  tenantId: string, 
  excludeShiftId?: string
): Promise<OperatorConflict[]> {
  if (operatorIds.length === 0) return [];
  
  // Normalizza date per confronto
  const normalizedStartDate = new Date(startDate);
  normalizedStartDate.setHours(0, 0, 0, 0);
  
  const normalizedEndDate = new Date(endDate);
  normalizedEndDate.setHours(23, 59, 59, 999);
  
  // Trova tutti i turni che potrebbero avere occorrenze nel range di date
  const allShifts = await prisma.shift.findMany({
    where: {
      tenantId,
      id: excludeShiftId ? { not: excludeShiftId } : undefined,
      OR: [
        // Turni master nel range di date
        {
          date: {
            gte: normalizedStartDate,
            lte: normalizedEndDate
          }
        },
        // Turni ricorrenti che potrebbero avere occorrenze nel range
        {
          shiftRecurrence: {
            isNot: null
          },
          date: {
            lte: normalizedEndDate // Il turno master deve essere iniziato prima o nel range
          }
        }
      ]
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
      },
      shiftRecurrence: true
    }
  });
  
  const conflicts: OperatorConflict[] = [];
  
  for (const operatorId of operatorIds) {
    for (const shift of allShifts) {
      // Verifica se l'operatore è assegnato a questo turno
      const conflictingOperator = shift.shiftOperators.find(so => so.userId === operatorId);
      if (!conflictingOperator) continue;
      
      let conflictDates: { date: Date; title: string }[] = [];
      
      if (shift.shiftRecurrence) {
        // Per turni ricorrenti, verifica tutte le occorrenze possibili
        const recurrenceOptions = {
          frequency: shift.shiftRecurrence.frequency,
          interval: shift.shiftRecurrence.interval,
          startDate: shift.shiftRecurrence.startDate,
          endDate: shift.shiftRecurrence.endDate || undefined,
          count: shift.shiftRecurrence.count || undefined
        };
        
        const exceptions = await getShiftExceptions(shift.id, tenantId);
        
        // Genera un range più ampio per catturare eccezioni spostate
        const expandedStart = new Date(normalizedStartDate);
        expandedStart.setDate(expandedStart.getDate() - 60); // 60 giorni prima
        const expandedEnd = new Date(normalizedEndDate);
        expandedEnd.setDate(expandedEnd.getDate() + 60); // 60 giorni dopo
        
        const occurrences = RecurrenceService.generateOccurrences(
          shift.date,
          recurrenceOptions,
          expandedStart,
          expandedEnd,
          exceptions
        );
        
        // Verifica se ci sono occorrenze che cadono nel range target
        // considerando sia la data originale che quella spostata (newDate)
        for (const occurrence of occurrences) {
          let checkDate = new Date(occurrence.date);
          checkDate.setHours(0, 0, 0, 0);
          
          // Se l'occorrenza è un'eccezione con newDate, usa quella
          if (occurrence.isException && occurrence.newDate) {
            checkDate = new Date(occurrence.newDate);
            checkDate.setHours(0, 0, 0, 0);
          }
          
          // Verifica se la data cade nel range target
          if (checkDate >= normalizedStartDate && checkDate <= normalizedEndDate) {
            const effectiveTitle = occurrence.isException && occurrence.modifiedTitle ? 
              occurrence.modifiedTitle : shift.title;
            conflictDates.push({ date: checkDate, title: effectiveTitle });
          }
        }
      } else {
        // Per turni non ricorrenti, verifica se la data cade nel range
        const shiftDate = new Date(shift.date);
        shiftDate.setHours(0, 0, 0, 0);
        if (shiftDate >= normalizedStartDate && shiftDate <= normalizedEndDate) {
          conflictDates.push({ date: shiftDate, title: shift.title });
        }
      }
      
      // Aggiungi tutti i conflitti trovati per questo operatore
      for (const conflictInfo of conflictDates) {
        conflicts.push({
          operatorId,
          operatorName: `${conflictingOperator.user.firstName} ${conflictingOperator.user.lastName}`,
          conflictingShift: {
            id: shift.id,
            title: conflictInfo.title,
            date: conflictInfo.date
          }
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Recupera le eccezioni per un turno ricorrente
 */
async function getShiftExceptions(shiftId: string, tenantId: string): Promise<ShiftException[]> {
  const exceptions = await prisma.shiftException.findMany({
    where: {
      shiftId,
      shift: { tenantId }
    },
    include: {
      exceptionSites: {
        select: { siteId: true }
      },
      exceptionOperators: {
        select: { userId: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  return exceptions.map(ex => ({
    date: ex.date,
    exceptionType: ex.exceptionType,
    newTitle: ex.newTitle || undefined,
    newNotes: ex.newNotes || undefined,
    newDate: ex.newDate || undefined,
    siteIds: ex.exceptionSites.map(es => es.siteId),
    operatorIds: ex.exceptionOperators.map(eo => eo.userId)
  }));
}

/**
 * Crea un'eccezione per un turno ricorrente
 */
async function createShiftException(
  shiftId: string,
  date: Date,
  exceptionType: ExceptionType,
  newTitle?: string,
  newNotes?: string,
  newDate?: Date,
  siteIds?: string[],
  operatorIds?: string[]
): Promise<void> {
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  const normalizedNewDate = newDate ? new Date(newDate) : undefined;
  if (normalizedNewDate) {
    normalizedNewDate.setUTCHours(0, 0, 0, 0);
  }

  console.log('🔧 CreateShiftException - Parametri ricevuti:', {
    shiftId,
    date: normalizedDate,
    exceptionType,
    newTitle,
    newNotes,
    newDate: normalizedNewDate,
    siteIds: siteIds?.length || 0,
    operatorIds: operatorIds?.length || 0,
    siteIdsArray: siteIds,
    operatorIdsArray: operatorIds
  });

  await prisma.$transaction(async (tx) => {
    // Crea o aggiorna l'eccezione
    const exception = await tx.shiftException.upsert({
      where: {
        shiftId_date: {
          shiftId,
          date: normalizedDate
        }
      },
      update: {
        exceptionType,
        newTitle,
        newNotes,
        newDate: normalizedNewDate
      },
      create: {
        shiftId,
        date: normalizedDate,
        exceptionType,
        newTitle,
        newNotes,
        newDate: normalizedNewDate
      }
    });

    // Gestisci siti specifici per l'eccezione
    if (siteIds !== undefined) {
      // Rimuovi assegnazioni esistenti
      await tx.shiftExceptionSite.deleteMany({
        where: { shiftExceptionId: exception.id }
      });
      
      // Aggiungi nuove assegnazioni
      if (siteIds.length > 0) {
        await tx.shiftExceptionSite.createMany({
          data: siteIds.map(siteId => ({
            shiftExceptionId: exception.id,
            siteId
          }))
        });
      }
    }

    // Gestisci operatori specifici per l'eccezione
    if (operatorIds !== undefined) {
      // Rimuovi assegnazioni esistenti
      await tx.shiftExceptionOperator.deleteMany({
        where: { shiftExceptionId: exception.id }
      });
      
      // Aggiungi nuove assegnazioni
      if (operatorIds.length > 0) {
        await tx.shiftExceptionOperator.createMany({
          data: operatorIds.map(operatorId => ({
            shiftExceptionId: exception.id,
            userId: operatorId
          }))
        });
      }
    }
  });
}

/**
 * Verifica se una data è un'occorrenza valida per un turno ricorrente
 */
async function isValidRecurrenceOccurrence(
  shiftId: string,
  targetDate: Date,
  tenantId: string
): Promise<boolean> {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, tenantId },
    include: { shiftRecurrence: true }
  });

  if (!shift || !shift.shiftRecurrence) {
    return false;
  }

  const recurrenceOptions = {
    frequency: shift.shiftRecurrence.frequency,
    interval: shift.shiftRecurrence.interval,
    startDate: shift.shiftRecurrence.startDate,
    endDate: shift.shiftRecurrence.endDate || undefined,
    count: shift.shiftRecurrence.count || undefined
  };

  const exceptions = await getShiftExceptions(shiftId, tenantId);

  return RecurrenceService.isValidOccurrenceWithExceptions(
    targetDate,
    shift.date,
    recurrenceOptions,
    exceptions
  );
}