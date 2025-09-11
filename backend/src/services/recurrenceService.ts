import { RecurrenceFrequency, ExceptionType } from '@prisma/client';

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
  isException?: boolean; // true se è un'eccezione
  exceptionType?: ExceptionType;
  modifiedTitle?: string;
  modifiedNotes?: string;
  modifiedDate?: Date; // nuova data se spostata
}

export interface ShiftException {
  date: Date;
  exceptionType: ExceptionType;
  newTitle?: string;
  newNotes?: string;
  newDate?: Date;
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
   * @param exceptions Array di eccezioni da applicare
   * @returns Array di occorrenze nell'intervallo
   */
  static generateOccurrences(
    masterDate: Date,
    recurrence: RecurrenceOptions,
    rangeStart: Date,
    rangeEnd: Date,
    exceptions: ShiftException[] = [],
    maxOccurrences: number = 500
  ): GeneratedOccurrence[] {
    const occurrences: GeneratedOccurrence[] = [];
    const { frequency, interval, startDate, endDate, count } = recurrence;
    
    // Normalizza le date a mezzanotte per confronti accurati
    const normalizedMasterDate = this.normalizeDate(masterDate);
    const normalizedRangeStart = this.normalizeDate(rangeStart);
    const normalizedRangeEnd = this.normalizeDate(rangeEnd);
    const normalizedStartDate = this.normalizeDate(startDate);
    const normalizedEndDate = endDate ? this.normalizeDate(endDate) : null;
    
    // Crea mappa delle eccezioni per accesso rapido
    const exceptionMap = new Map<string, ShiftException>();
    exceptions.forEach(exception => {
      const dateKey = this.normalizeDate(exception.date).toISOString();
      exceptionMap.set(dateKey, exception);
    });

    // Se il turno master è nell'intervallo, includilo (considerando eccezioni)
    if (normalizedMasterDate >= normalizedRangeStart && normalizedMasterDate <= normalizedRangeEnd) {
      const masterDateKey = normalizedMasterDate.toISOString();
      const exception = exceptionMap.get(masterDateKey);
      
      if (exception && exception.exceptionType === 'CANCELLED') {
        // Turno master cancellato, non includerlo
      } else if (exception && exception.exceptionType === 'MODIFIED') {
        // Turno master modificato
        const effectiveDate = exception.newDate ? this.normalizeDate(exception.newDate) : normalizedMasterDate;
        occurrences.push({
          date: effectiveDate,
          isOriginal: true,
          isException: true,
          exceptionType: exception.exceptionType,
          modifiedTitle: exception.newTitle,
          modifiedNotes: exception.newNotes,
          modifiedDate: exception.newDate ? effectiveDate : undefined
        });
      } else {
        // Turno master normale
        occurrences.push({
          date: normalizedMasterDate,
          isOriginal: true
        });
      }
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
        
        const currentDateKey = currentDate.toISOString();
        const exception = exceptionMap.get(currentDateKey);
        
        if (exception && exception.exceptionType === 'CANCELLED') {
          // Occorrenza cancellata, saltala
        } else if (exception && exception.exceptionType === 'MODIFIED') {
          // Occorrenza modificata
          const effectiveDate = exception.newDate ? this.normalizeDate(exception.newDate) : new Date(currentDate);
          occurrences.push({
            date: effectiveDate,
            isOriginal: false,
            isException: true,
            exceptionType: exception.exceptionType,
            modifiedTitle: exception.newTitle,
            modifiedNotes: exception.newNotes,
            modifiedDate: exception.newDate ? effectiveDate : undefined
          });
        } else {
          // Occorrenza normale
          occurrences.push({
            date: new Date(currentDate),
            isOriginal: false
          });
        }
      }
      
      // Calcola prossima occorrenza
      if (frequency === RecurrenceFrequency.DAILY) {
        currentDate.setDate(currentDate.getDate() + interval);
      } else if (frequency === RecurrenceFrequency.WEEKLY) {
        currentDate.setDate(currentDate.getDate() + (interval * 7));
      }
      
      occurrenceCount++;
      
      // Protezione contro loop infiniti e cap sulle occorrenze
      if (occurrenceCount > maxOccurrences) {
        console.warn(`Raggiunto limite massimo di occorrenze (${maxOccurrences})`);
        break;
      }
    }
    
    // Aggiungi occorrenze spostate che cadono nell'intervallo
    exceptions.forEach(exception => {
      if (exception.exceptionType === 'MODIFIED' && exception.newDate) {
        const newDate = this.normalizeDate(exception.newDate);
        const originalDate = this.normalizeDate(exception.date);
        
        // Se la nuova data è nell'intervallo ma l'originale non lo era
        if (newDate >= normalizedRangeStart && newDate <= normalizedRangeEnd &&
            (originalDate < normalizedRangeStart || originalDate > normalizedRangeEnd)) {
          
          // Verifica che non sia già stata aggiunta
          const alreadyExists = occurrences.some(occ => 
            this.normalizeDate(occ.date).getTime() === newDate.getTime()
          );
          
          if (!alreadyExists) {
            occurrences.push({
              date: newDate,
              isOriginal: originalDate.getTime() === normalizedMasterDate.getTime(),
              isException: true,
              exceptionType: exception.exceptionType,
              modifiedTitle: exception.newTitle,
              modifiedNotes: exception.newNotes,
              modifiedDate: newDate
            });
          }
        }
      }
    });

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

  /**
   * Crea un'eccezione per una data specifica
   * @param date Data dell'eccezione
   * @param exceptionType Tipo di eccezione
   * @param newTitle Nuovo titolo (per modifiche)
   * @param newNotes Nuove note (per modifiche)
   * @returns Oggetto eccezione
   */
  static createException(
    date: Date,
    exceptionType: ExceptionType,
    newTitle?: string,
    newNotes?: string
  ): ShiftException {
    return {
      date: this.normalizeDate(date),
      exceptionType,
      newTitle,
      newNotes
    };
  }

  /**
   * Verifica se una data è un'occorrenza valida considerando le eccezioni
   * @param targetDate Data da verificare
   * @param masterDate Data del turno master
   * @param recurrence Opzioni di ricorrenza
   * @param exceptions Array di eccezioni
   * @returns true se la data è un'occorrenza valida e non cancellata
   */
  static isValidOccurrenceWithExceptions(
    targetDate: Date,
    masterDate: Date,
    recurrence: RecurrenceOptions,
    exceptions: ShiftException[] = []
  ): boolean {
    // Prima verifica se è un'occorrenza valida
    if (!this.isValidOccurrence(targetDate, masterDate, recurrence)) {
      return false;
    }

    // Poi verifica se è cancellata
    const normalizedTarget = this.normalizeDate(targetDate);
    const targetDateKey = normalizedTarget.toISOString();
    
    const exception = exceptions.find(ex => 
      this.normalizeDate(ex.date).toISOString() === targetDateKey
    );
    
    return !(exception && exception.exceptionType === 'CANCELLED');
  }

  /**
   * Calcola la data di fine per terminare una serie ricorrente da una data specifica
   * @param fromDate Data da cui terminare la serie (esclusa)
   * @param masterDate Data del turno master
   * @param recurrence Opzioni di ricorrenza
   * @returns Data di fine per la serie originale
   */
  static calculateEndDateForSplit(
    fromDate: Date,
    masterDate: Date,
    recurrence: RecurrenceOptions
  ): Date {
    const normalizedFrom = this.normalizeDate(fromDate);
    const normalizedMaster = this.normalizeDate(masterDate);
    const normalizedStart = this.normalizeDate(recurrence.startDate);
    
    // Se fromDate è il turno master o prima, termina immediatamente
    if (normalizedFrom <= normalizedMaster) {
      // Termina il giorno prima del turno master
      const endDate = new Date(normalizedMaster);
      endDate.setDate(endDate.getDate() - 1);
      return endDate;
    }
    
    // Trova l'ultima occorrenza valida prima di fromDate
    let lastValidDate = normalizedMaster;
    let currentDate = new Date(normalizedStart);
    let occurrenceCount = 0;
    
    while (currentDate < normalizedFrom) {
      if (this.isValidOccurrence(currentDate, masterDate, recurrence)) {
        lastValidDate = new Date(currentDate);
      }
      
      // Avanza alla prossima possibile occorrenza
      if (recurrence.frequency === RecurrenceFrequency.DAILY) {
        currentDate.setDate(currentDate.getDate() + recurrence.interval);
      } else if (recurrence.frequency === RecurrenceFrequency.WEEKLY) {
        currentDate.setDate(currentDate.getDate() + (recurrence.interval * 7));
      }
      
      occurrenceCount++;
      if (occurrenceCount > 1000) break; // Protezione
    }
    
    return lastValidDate;
  }

  /**
   * Crea le opzioni di ricorrenza per una nuova serie che inizia da una data specifica
   * @param fromDate Data di inizio della nuova serie
   * @param originalRecurrence Opzioni di ricorrenza originali
   * @returns Nuove opzioni di ricorrenza
   */
  static createRecurrenceFromDate(
    fromDate: Date,
    originalRecurrence: RecurrenceOptions
  ): RecurrenceOptions {
    const normalizedFrom = this.normalizeDate(fromDate);
    
    return {
      frequency: originalRecurrence.frequency,
      interval: originalRecurrence.interval,
      startDate: normalizedFrom,
      endDate: originalRecurrence.endDate,
      count: originalRecurrence.count ? undefined : undefined // Reset count per nuova serie
    };
  }
}