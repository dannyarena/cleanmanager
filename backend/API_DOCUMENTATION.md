# CleanManager API Documentation

## Turni (Shifts) API

### Aggiornamento Turni

#### PATCH /shifts/:id

Aggiorna un turno esistente con supporto per turni ricorrenti.

**Parametri URL:**
- `id` (string): ID del turno da aggiornare

**Body della richiesta:**
```json
{
  "title": "string (opzionale)",
  "date": "string (ISO 8601, opzionale)",
  "notes": "string (opzionale)",
  "siteIds": "string[] (opzionale)",
  "operatorIds": "string[] (opzionale)",
  "updateType": "'single' | 'series' | 'this_and_future' (opzionale)"
}
```

**Valori updateType:**
- `single`: Aggiorna solo questa occorrenza specifica (default per turni non ricorrenti)
- `series`: Aggiorna tutta la serie ricorrente
- `this_and_future`: Divide la serie e aggiorna da questa occorrenza in poi

**Comportamento per updateType:**

1. **single**: 
   - Crea un'eccezione per l'occorrenza specifica
   - La serie originale rimane invariata
   - Solo l'occorrenza selezionata viene modificata

2. **series**:
   - Aggiorna il turno master della serie
   - Tutte le occorrenze future seguiranno le nuove impostazioni
   - Le eccezioni esistenti vengono mantenute

3. **this_and_future**:
   - Calcola la data di fine per la serie originale (giorno prima dell'occorrenza corrente)
   - Aggiorna la serie originale con la nuova data di fine
   - Crea una nuova serie ricorrente a partire dall'occorrenza corrente
   - Copia le assegnazioni di siti e operatori alla nuova serie

**Risposta:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "date": "string",
    "notes": "string",
    "sites": [...],
    "operators": [...],
    "recurrence": {...}
  },
  "message": "string"
}
```

### Eliminazione Turni

#### DELETE /shifts/:id

Elimina un turno esistente con supporto per turni ricorrenti.

**Parametri URL:**
- `id` (string): ID del turno da eliminare

**Body della richiesta:**
```json
{
  "deleteType": "'single' | 'series' | 'this_and_future' (opzionale)"
}
```

**Valori deleteType:**
- `single`: Elimina solo questa occorrenza specifica (default per turni non ricorrenti)
- `series`: Elimina tutta la serie ricorrente
- `this_and_future`: Elimina da questa occorrenza in poi

**Comportamento per deleteType:**

1. **single**: 
   - Crea un'eccezione per nascondere l'occorrenza specifica
   - La serie originale rimane attiva per le altre occorrenze

2. **series**:
   - Elimina completamente il turno master e tutte le sue occorrenze
   - Rimuove tutte le eccezioni associate

3. **this_and_future**:
   - Calcola la data di fine per la serie (giorno prima dell'occorrenza corrente)
   - Se la data di fine calcolata è precedente alla data di inizio, elimina l'intera serie
   - Altrimenti, aggiorna la serie con la nuova data di fine

**Risposta:**
```json
{
  "success": true,
  "message": "string"
}
```

## Esempi di Utilizzo

### Esempio 1: Aggiornare solo un'occorrenza
```javascript
// Frontend
await apiService.updateShift('shift-123_2024-01-15', {
  title: 'Pulizia Straordinaria',
  updateType: 'single'
})
```

### Esempio 2: Aggiornare da un'occorrenza in poi
```javascript
// Frontend
await apiService.updateShift('shift-123_2024-01-15', {
  operatorIds: ['op1', 'op2'],
  updateType: 'this_and_future'
})
```

### Esempio 3: Eliminare da un'occorrenza in poi
```javascript
// Frontend
await apiService.deleteShift('shift-123_2024-01-15', {
  deleteType: 'this_and_future'
})
```

## Note Tecniche

### Formato ID per Occorrenze
Per le occorrenze di turni ricorrenti, l'ID ha il formato: `{shiftId}_{YYYY-MM-DD}`

Esempio: `shift-123_2024-01-15`

### Gestione delle Eccezioni
Le eccezioni vengono create automaticamente per:
- Modifiche di occorrenze singole (`updateType: 'single'`)
- Eliminazioni di occorrenze singole (`deleteType: 'single'`)

### Validazioni
- `updateType` e `deleteType` sono ignorati per turni non ricorrenti
- Per turni ricorrenti senza questi parametri, il comportamento default è `single`
- I permessi vengono verificati: solo Admin e Manager possono modificare turni
- Gli operatori possono modificare solo i propri turni assegnati

### Gestione Errori
Gli errori comuni includono:
- `400`: Parametri non validi o turno non ricorrente con updateType/deleteType
- `403`: Permessi insufficienti
- `404`: Turno non trovato
- `500`: Errori del server durante l'operazione