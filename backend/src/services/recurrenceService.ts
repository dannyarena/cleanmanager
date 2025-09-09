import { RecurrenceFrequency } from '@prisma/client';

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate?: Date;
  count?: number;
}

export interface GeneratedOccurrence {
  date: Date;
  isOriginal: boolean; // true se è il turno master originale
}

/**
 * Servizio per la generazione lazy delle ricorrenze dei turni
 * Genera solo le occorrenze necessarie per l'intervallo richiesto
 */
export class RecurrenceService {
  /**
   * Genera le occorrenze di un turno ricorrente per un intervallo di date
   * @param masterDate Data del turno master
   * @param recurrence Opzioni di ricorrenza
   * @param rangeStart Data inizio intervallo
   * @param rangeEnd Data fine intervallo
   * @returns Array di occorrenze nell'intervallo
   */
  static generateOccurrences(
    masterDate: Date,
    recurrence: RecurrenceOptions,
    rangeStart: Date,
    rangeEnd: Date
  ): GeneratedOccurrence[] {
    const occurrences: GeneratedOccurrence[] = [];
    const { frequency, interval, startDate, endDate, count } = recurrence;
    
    // Normalizza le date a mezzanotte per confronti accurati
    const normalizedMasterDate = this.normalizeDate(masterDate);
    const normalizedRangeStart = this.normalizeDate(rangeStart);
    const normalizedRangeEnd = this.normalizeDate(rangeEnd);
    const normalizedStartDate = this.normalizeDate(startDate);
    const normalizedEndDate = endDate ? this.normalizeDate(endDate) : null;
    
    // Se il turno master è nell'intervallo, includilo
    if (normalizedMasterDate >= normalizedRangeStart && normalizedMasterDate <= normalizedRangeEnd) {
      occurrences.push({
        date: normalizedMasterDate,
        isOriginal: true
      });
    }
    
    // Genera occorrenze ricorrenti
    let currentDate = new Date(normalizedStartDate);
    let occurrenceCount = 0;
    
    while (true) {
      // Controlla limiti di fine
      if (normalizedEndDate && currentDate > normalizedEndDate) break;
      if (count && occurrenceCount >= count) break;
      if (currentDate > normalizedRangeEnd) break;
      
      // Se la data corrente è nell'intervallo e non è il turno master
      if (currentDate >= normalizedRangeStart && 
          currentDate <= normalizedRangeEnd && 
          currentDate.getTime() !== normalizedMasterDate.getTime()) {
        occurrences.push({
          date: new Date(currentDate),
          isOriginal: false
        });
      }
      
      // Calcola prossima occorrenza
      if (frequency === RecurrenceFrequency.DAILY) {
        currentDate.setDate(currentDate.getDate() + interval);
      } else if (frequency === RecurrenceFrequency.WEEKLY) {
        currentDate.setDate(currentDate.getDate() + (interval * 7));
      }
      
      occurrenceCount++;
      
      // Protezione contro loop infiniti
      if (occurrenceCount > 1000) {
        console.warn('Raggiunto limite massimo di occorrenze (1000)');
        break;
      }
    }
    
    // Ordina per data
    return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  /**
   * Verifica se una data specifica è un'occorrenza valida per una ricorrenza
   * @param targetDate Data da verificare
   * @param masterDate Data del turno master
   * @param recurrence Opzioni di ricorrenza
   * @returns true se la data è un'occorrenza valida
   */
  static isValidOccurrence(
    targetDate: Date,
    masterDate: Date,
    recurrence: RecurrenceOptions
  ): boolean {
    const normalizedTarget = this.normalizeDate(targetDate);
    const normalizedMaster = this.normalizeDate(masterDate);
    const normalizedStart = this.normalizeDate(recurrence.startDate);
    const normalizedEnd = recurrence.endDate ? this.normalizeDate(recurrence.endDate) : null;
    
    // Controlla se è il turno master
    if (normalizedTarget.getTime() === normalizedMaster.getTime()) {
      return true;
    }
    
    // Controlla se è prima della data di inizio
    if (normalizedTarget < normalizedStart) {
      return false;
    }
    
    // Controlla se è dopo la data di fine
    if (normalizedEnd && normalizedTarget > normalizedEnd) {
      return false;
    }
    
    // Calcola se la data è un'occorrenza valida basata sulla frequenza
    const diffMs = normalizedTarget.getTime() - normalizedStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (recurrence.frequency === RecurrenceFrequency.DAILY) {
      return diffDays >= 0 && diffDays % recurrence.interval === 0;
    } else if (recurrence.frequency === RecurrenceFrequency.WEEKLY) {
      return diffDays >= 0 && diffDays % (recurrence.interval * 7) === 0;
    }
    
    return false;
  }
  
  /**
   * Calcola la prossima occorrenza dopo una data specifica
   * @param afterDate Data dopo la quale cercare
   * @param masterDate Data del turno master
   * @param recurrence Opzioni di ricorrenza
   * @returns Prossima occorrenza o null se non ce ne sono
   */
  static getNextOccurrence(
    afterDate: Date,
    masterDate: Date,
    recurrence: RecurrenceOptions
  ): Date | null {
    const normalizedAfter = this.normalizeDate(afterDate);
    const normalizedStart = this.normalizeDate(recurrence.startDate);
    const normalizedEnd = recurrence.endDate ? this.normalizeDate(recurrence.endDate) : null;
    
    let currentDate = new Date(Math.max(normalizedAfter.getTime(), normalizedStart.getTime()));
    currentDate.setDate(currentDate.getDate() + 1); // Inizia dal giorno dopo
    
    let occurrenceCount = 0;
    
    while (true) {
      // Controlla limiti
      if (normalizedEnd && currentDate > normalizedEnd) break;
      if (recurrence.count && occurrenceCount >= recurrence.count) break;
      
      // Verifica se è un'occorrenza valida
      if (this.isValidOccurrence(currentDate, masterDate, recurrence)) {
        return new Date(currentDate);
      }
      
      // Avanza di un giorno
      currentDate.setDate(currentDate.getDate() + 1);
      occurrenceCount++;
      
      // Protezione contro loop infiniti
      if (occurrenceCount > 365) break;
    }
    
    return null;
  }
  
  /**
   * Normalizza una data a mezzanotte UTC
   * @param date Data da normalizzare
   * @returns Data normalizzata
   */
  private static normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }
  
  /**
   * Valida le opzioni di ricorrenza
   * @param recurrence Opzioni da validare
   * @returns Array di errori di validazione
   */
  static validateRecurrence(recurrence: RecurrenceOptions): string[] {
    const errors: string[] = [];
    
    if (recurrence.interval < 1) {
      errors.push('L\'intervallo deve essere almeno 1');
    }
    
    if (recurrence.endDate && recurrence.count) {
      errors.push('Non è possibile specificare sia endDate che count');
    }
    
    if (recurrence.endDate && recurrence.endDate <= recurrence.startDate) {
      errors.push('La data di fine deve essere successiva alla data di inizio');
    }
    
    if (recurrence.count && recurrence.count < 1) {
      errors.push('Il conteggio deve essere almeno 1');
    }
    
    return errors;
  }
}