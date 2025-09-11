import { Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../auth/authContext";
import { Theme, RecurrenceFrequency } from "@prisma/client";

/**
 * GET /settings - Restituisce le impostazioni del tenant corrente
 */
export const getSettings: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    // Cerca le impostazioni esistenti per il tenant
    let settings = await prisma.tenantSettings.findUnique({
      where: {
        tenantId: tenantId
      }
    });

    // Se non esistono impostazioni, creale con i valori di default
    if (!settings) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        return res.status(404).json({ error: "Tenant non trovato" });
      }

      settings = await prisma.tenantSettings.create({
        data: {
          tenantId: tenantId,
          companyName: tenant.name,
          primaryColor: '#2563eb',
          theme: Theme.LIGHT,
          workingDays: [1, 2, 3, 4, 5, 6], // Lun-Sab
          recurrenceDefaultFrequency: RecurrenceFrequency.WEEKLY,
          recurrenceDefaultInterval: 1,
          emailEnabled: false,
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Errore nel recupero impostazioni:', error);
    res.status(500).json({ 
      error: "Errore interno del server",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * PUT /settings - Aggiorna le impostazioni del tenant corrente
 */
export const updateSettings: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID mancante" });
    }

    const {
      companyName,
      primaryColor,
      theme,
      workingDays,
      recurrenceDefaultFrequency,
      recurrenceDefaultInterval,
      emailEnabled
    } = req.body;

    // Validazioni minime
    const updateData: any = {};

    if (companyName !== undefined) {
      if (typeof companyName !== 'string' || companyName.trim().length === 0) {
        return res.status(400).json({ error: "Il nome dell'azienda deve essere una stringa non vuota" });
      }
      updateData.companyName = companyName.trim();
    }

    if (primaryColor !== undefined) {
      if (typeof primaryColor !== 'string' || !/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(primaryColor)) {
        return res.status(400).json({ error: "Il colore primario deve essere un codice hex valido (es. #2563eb o #fff)" });
      }
      updateData.primaryColor = primaryColor;
    }

    if (theme !== undefined) {
      if (!Object.values(Theme).includes(theme)) {
        return res.status(400).json({ error: "Il tema deve essere LIGHT o DARK" });
      }
      updateData.theme = theme;
    }

    if (workingDays !== undefined) {
      if (!Array.isArray(workingDays) || !workingDays.every(day => Number.isInteger(day) && day >= 1 && day <= 7)) {
        return res.status(400).json({ error: "I giorni lavorativi devono essere un array di numeri da 1 a 7" });
      }
      updateData.workingDays = workingDays;
    }

    if (recurrenceDefaultFrequency !== undefined) {
      if (!Object.values(RecurrenceFrequency).includes(recurrenceDefaultFrequency)) {
        return res.status(400).json({ error: "La frequenza di ricorrenza deve essere DAILY o WEEKLY" });
      }
      updateData.recurrenceDefaultFrequency = recurrenceDefaultFrequency;
    }

    if (recurrenceDefaultInterval !== undefined) {
      if (!Number.isInteger(recurrenceDefaultInterval) || recurrenceDefaultInterval < 1) {
        return res.status(400).json({ error: "L'intervallo di ricorrenza deve essere un numero intero maggiore di 0" });
      }
      updateData.recurrenceDefaultInterval = recurrenceDefaultInterval;
    }

    if (emailEnabled !== undefined) {
      if (typeof emailEnabled !== 'boolean') {
        return res.status(400).json({ error: "emailEnabled deve essere un valore booleano" });
      }
      updateData.emailEnabled = emailEnabled;
    }

    // Se non ci sono campi da aggiornare
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Nessun campo valido da aggiornare" });
    }

    // Aggiorna le impostazioni (upsert per crearle se non esistono)
    const settings = await prisma.tenantSettings.upsert({
      where: {
        tenantId: tenantId
      },
      update: updateData,
      create: {
        tenantId: tenantId,
        companyName: updateData.companyName || 'Azienda',
        primaryColor: updateData.primaryColor || '#2563eb',
        theme: updateData.theme || Theme.LIGHT,
        workingDays: updateData.workingDays || [1, 2, 3, 4, 5, 6],
        recurrenceDefaultFrequency: updateData.recurrenceDefaultFrequency || RecurrenceFrequency.WEEKLY,
        recurrenceDefaultInterval: updateData.recurrenceDefaultInterval || 1,
        emailEnabled: updateData.emailEnabled || false,
      }
    });

    res.json({
      success: true,
      data: settings,
      message: "Impostazioni aggiornate con successo"
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento impostazioni:', error);
    res.status(500).json({ 
      error: "Errore interno del server",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};