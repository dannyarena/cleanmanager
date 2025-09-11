/**
 * Helper per gestire gli ID delle occorrenze dei turni ricorrenti
 * 
 * Formato ID occorrenza: "masterId_YYYY-MM-DD" per occorrenze specifiche
 * Formato ID master: solo l'ID numerico per il turno master
 */

export interface ParsedOccurrenceId {
  masterId: string;
  occurrenceDate?: Date;
}

/**
 * Parsa un ID che può essere un master shift ID o un occurrence ID
 * @param id - L'ID da parsare (es. "123" o "123_2024-01-15")
 * @returns Oggetto con masterId e occurrenceDate opzionale
 */
export function parseOccurrenceId(id: string): ParsedOccurrenceId {
  if (!id) {
    throw new Error('ID non può essere vuoto');
  }

  // Controlla se è un occurrence ID (contiene underscore)
  const parts = id.split('_');
  
  if (parts.length === 1) {
    // È un master shift ID
    const masterId = parts[0];
    if (!masterId) {
      throw new Error(`Master ID non può essere vuoto: ${id}`);
    }
    return {
      masterId
    };
  }
  
  if (parts.length === 2) {
    // È un occurrence ID
    const masterId = parts[0];
    const dateStr = parts[1];
    
    if (!masterId || !dateStr) {
      throw new Error(`ID occorrenza malformato: ${id}`);
    }
    
    // Valida il formato della data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw new Error(`Formato data non valido nell'ID occorrenza: ${dateStr}`);
    }
    
    const occurrenceDate = new Date(dateStr + 'T00:00:00.000Z'); // UTC midnight
    
    if (isNaN(occurrenceDate.getTime())) {
      throw new Error(`Data non valida nell'ID occorrenza: ${dateStr}`);
    }
    
    return {
      masterId,
      occurrenceDate
    };
  }
  
  throw new Error(`Formato ID non valido: ${id}`);
}

/**
 * Crea un occurrence ID dal master ID e dalla data
 * @param masterId - L'ID del turno master
 * @param occurrenceDate - La data dell'occorrenza
 * @returns L'occurrence ID formattato
 */
export function createOccurrenceId(masterId: string, occurrenceDate: Date): string {
  const dateStr = occurrenceDate.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${masterId}_${dateStr}`;
}

/**
 * Verifica se un ID è un occurrence ID (contiene data)
 * @param id - L'ID da verificare
 * @returns true se è un occurrence ID
 */
export function isOccurrenceId(id: string): boolean {
  return id.includes('_');
}

/**
 * Estrae solo il master ID da qualsiasi tipo di ID
 * @param id - L'ID da cui estrarre il master ID
 * @returns Il master ID
 */
export function extractMasterId(id: string): string {
  return parseOccurrenceId(id).masterId;
}