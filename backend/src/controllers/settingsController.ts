import { Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../auth/authContext";
import { Theme, RecurrenceFrequency } from "@prisma/client";

// Funzione helper per normalizzare i valori enum
const toUpper = (v: unknown) => typeof v === 'string' ? v.toUpperCase() : v;

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

    // Normalizza gli enum
    const normTheme = theme !== undefined ? toUpper(theme) : undefined;
    const normFreq = recurrenceDefaultFrequency !== undefined ? toUpper(recurrenceDefaultFrequency) : undefined;

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

    if (normTheme !== undefined) {
      if (!Object.values(Theme).includes(normTheme as Theme)) {
        return res.status(400).json({ error: "Il tema deve essere LIGHT o DARK" });
      }
      updateData.theme = normTheme;
    }

    if (workingDays !== undefined) {
      if (!Array.isArray(workingDays) || !workingDays.every(d => Number.isInteger(d) && d >= 1 && d <= 7)) {
        return res.status(400).json({ error: "I giorni lavorativi devono essere un array di interi 1–7" });
      }
      updateData.workingDays = Array.from(new Set(workingDays)).sort((a,b)=>a-b);
    }

    if (normFreq !== undefined) {
      if (!Object.values(RecurrenceFrequency).includes(normFreq as RecurrenceFrequency)) {
        return res.status(400).json({ error: "La frequenza di ricorrenza deve essere DAILY o WEEKLY" });
      }
      updateData.recurrenceDefaultFrequency = normFreq;
    }

    if (recurrenceDefaultInterval !== undefined) {
      if (!Number.isInteger(recurrenceDefaultInterval) || recurrenceDefaultInterval < 1) {
        return res.status(400).json({ error: "L'intervallo deve essere un intero ≥ 1" });
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