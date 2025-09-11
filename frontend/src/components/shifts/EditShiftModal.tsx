import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'
import { Calendar, Users, MapPin, AlertTriangle, X } from 'lucide-react'
import { apiService } from '../../services/api'
import { Shift, Site, User, CreateShiftRequest, UpdateShiftRequest } from '../../types'
import { useToast, toast } from '../ui/toast'

interface EditShiftModalProps {
  open: boolean
  onClose: () => void
  shift: Shift | null
  sites: Site[]
  operators: User[]
  onShiftUpdated: () => void
}

interface FormData {
  title: string
  date: string
  notes: string
  siteIds: string[]
  operatorIds: string[]
}

interface UpdateAction {
  type: 'single' | 'series' | 'this_and_future'
  confirmed: boolean
}

interface OperatorConflict {
  operatorId: string
  operatorName: string
  conflictingShifts: Array<{
    id: string
    title: string
    date: string
  }>
}

export function EditShiftModal({ open, onClose, shift, sites, operators, onShiftUpdated }: EditShiftModalProps) {
  const { addToast } = useToast()
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: '',
    notes: '',
    siteIds: [],
    operatorIds: []
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<OperatorConflict[]>([])
  const [showConflicts, setShowConflicts] = useState(false)
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [updateAction, setUpdateAction] = useState<UpdateAction>({ type: 'occurrence', confirmed: false })

  // Inizializza form con dati del turno
  useEffect(() => {
    if (open && shift) {
      setFormData({
        title: shift.title,
        date: new Date(shift.date).toISOString().split('T')[0],
        notes: shift.notes || '',
        siteIds: shift.sites.map(site => site.id),
        operatorIds: shift.operators.map(op => op.id)
      })
      setError(null)
      setConflicts([])
      setShowConflicts(false)
      setShowUpdateConfirm(false)
      setUpdateAction({ type: 'single', confirmed: false })
    }
  }, [open, shift])

  // Controlla conflitti quando cambiano operatori o data
  useEffect(() => {
    if (formData.operatorIds.length > 0 && formData.date && shift) {
      checkConflicts()
    } else {
      setConflicts([])
    }
  }, [formData.operatorIds, formData.date, shift])

  const checkConflicts = async () => {
    try {
      // I conflitti verranno gestiti direttamente dalla risposta del backend
      // durante l'aggiornamento del turno, quindi resettiamo i conflitti locali
      setConflicts([])
    } catch (error) {
      console.error('Errore nel controllo conflitti:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!shift) return

    if (!formData.title.trim()) {
      setError('Il titolo è obbligatorio')
      return
    }

    if (formData.siteIds.length === 0) {
      setError('Seleziona almeno un sito')
      return
    }

    if (formData.operatorIds.length === 0) {
      setError('Seleziona almeno un operatore')
      return
    }

    // Mostra warning se ci sono conflitti
    if (conflicts.length > 0 && !showConflicts) {
      setShowConflicts(true)
      return
    }

    // Se è un turno ricorrente, chiedi se aggiornare solo questa occorrenza o tutta la serie
    if (shift.recurrence && !showUpdateConfirm) {
      setShowUpdateConfirm(true)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const updateData: UpdateShiftRequest = {
        title: formData.title.trim(),
        date: new Date(formData.date).toISOString(),
        notes: formData.notes.trim() || undefined,
        siteIds: formData.siteIds,
        operatorIds: formData.operatorIds,
        // Manteniamo updateType per compatibilità ma usiamo applyTo
        updateType: shift.recurrence ? updateAction.type : 'single',
        applyTo: shift.recurrence ? updateAction.type : 'single'
      }

      // Aggiungi occurrenceDate se necessario
      if (shift.recurrence && (updateData.applyTo === 'this_and_future' || updateData.applyTo === 'single')) {
        updateData.occurrenceDate = shift.date
      }

      const options = {
        applyTo: updateData.applyTo
      }

      // Per updateType 'single' su turni ricorrenti, usa l'ID completo dell'occorrenza
      // Per 'series' e 'this_and_future', usa l'ID del master
      const shiftId = (shift.recurrence && updateData.applyTo === 'single') 
        ? shift.id // ID completo dell'occorrenza (masterId_YYYY-MM-DD)
        : (shift.id.includes('_') ? shift.id.split('_')[0] : shift.id) // ID del master
      
      const response = await apiService.updateShift(shiftId, updateData, options)
      
      // Gestisci warnings.operatorConflicts[] dalla risposta del backend
      if (response.warnings?.operatorConflicts && response.warnings.operatorConflicts.length > 0) {
        const backendConflicts: OperatorConflict[] = response.warnings.operatorConflicts.map(conflict => ({
          operatorId: conflict.operatorId,
          operatorName: conflict.operatorName,
          conflictingShifts: [{
            id: conflict.conflictingShiftId,
            title: conflict.conflictingShiftTitle,
            date: conflict.conflictDate
          }]
        }))
        
        setConflicts(backendConflicts)
        
        // Se non abbiamo ancora mostrato i conflitti, mostrali ora
        if (!showConflicts) {
          setShowConflicts(true)
          setLoading(false)
          return
        }
      }
      
      // Toast di successo basato sul tipo di aggiornamento
      const getSuccessMessage = () => {
        if (!shift.recurrence) {
          return 'Turno aggiornato con successo'
        }
        switch (updateAction.type) {
          case 'single':
            return 'Occorrenza del turno aggiornata con successo'
          case 'this_and_future':
            return 'Turno aggiornato da questa occorrenza in poi'
          case 'series':
            return 'Intera serie di turni aggiornata con successo'
          default:
            return 'Turno aggiornato con successo'
        }
      }
      
      addToast(toast.success(getSuccessMessage()))
      onShiftUpdated()
    } catch (error: any) {
      const errorMessage = error.message || 'Errore nell\'aggiornamento del turno'
      setError(errorMessage)
      addToast(toast.error('Errore aggiornamento', errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const handleSiteToggle = (siteId: string) => {
    setFormData(prev => ({
      ...prev,
      siteIds: prev.siteIds.includes(siteId)
        ? prev.siteIds.filter(id => id !== siteId)
        : [...prev.siteIds, siteId]
    }))
  }

  const handleOperatorToggle = (operatorId: string) => {
    setFormData(prev => ({
      ...prev,
      operatorIds: prev.operatorIds.includes(operatorId)
        ? prev.operatorIds.filter(id => id !== operatorId)
        : [...prev.operatorIds, operatorId]
    }))
  }

  if (!shift) return null

  const selectedSites = sites.filter(site => formData.siteIds.includes(site.id))
  const selectedOperators = operators.filter(op => formData.operatorIds.includes(op.id))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Modifica Turno
            {shift.recurrence && (
              <Badge variant="secondary" className="ml-2">
                Ricorrente
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informazioni base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Es. Pulizia uffici"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Note aggiuntive per il turno..."
              rows={3}
            />
          </div>

          {/* Selezione Siti */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Siti * ({formData.siteIds.length} selezionati)
            </Label>
            
            {selectedSites.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedSites.map(site => (
                  <Badge key={site.id} variant="secondary" className="flex items-center gap-1">
                    {site.name}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleSiteToggle(site.id)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
              {sites.map(site => (
                <div key={site.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`site-${site.id}`}
                    checked={formData.siteIds.includes(site.id)}
                    onCheckedChange={() => handleSiteToggle(site.id)}
                  />
                  <Label htmlFor={`site-${site.id}`} className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-gray-600">{site.address}</div>
                      {site.client && (
                        <div className="text-xs text-gray-500">{site.client.name}</div>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Selezione Operatori */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Operatori * ({formData.operatorIds.length} selezionati)
            </Label>
            
            {selectedOperators.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedOperators.map(operator => (
                  <Badge key={operator.id} variant="secondary" className="flex items-center gap-1">
                    {operator.firstName} {operator.lastName}
                    {operator.isManager && <span className="text-xs">(Manager)</span>}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleOperatorToggle(operator.id)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
              {operators.map(operator => (
                <div key={operator.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`operator-${operator.id}`}
                    checked={formData.operatorIds.includes(operator.id)}
                    onCheckedChange={() => handleOperatorToggle(operator.id)}
                  />
                  <Label htmlFor={`operator-${operator.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {operator.firstName} {operator.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{operator.email}</div>
                      </div>
                      {operator.isManager && (
                        <Badge variant="outline" className="text-xs">Manager</Badge>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Conferma aggiornamento per turni ricorrenti */}
          {showUpdateConfirm && shift.recurrence && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="space-y-4">
                  <div className="font-medium text-blue-800">
                    Questo è un turno ricorrente. Cosa vuoi aggiornare?
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="updateType"
                        value="single"
                        checked={updateAction.type === 'single'}
                        onChange={(e) => setUpdateAction({ ...updateAction, type: 'single' })}
                      />
                      <span className="text-sm text-blue-800">
                        Solo questa occorrenza
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="updateType"
                        value="this_and_future"
                        checked={updateAction.type === 'this_and_future'}
                        onChange={(e) => setUpdateAction({ ...updateAction, type: 'this_and_future' })}
                      />
                      <span className="text-sm text-blue-800">
                        Da questa occorrenza in poi
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="updateType"
                        value="series"
                        checked={updateAction.type === 'series'}
                        onChange={(e) => setUpdateAction({ ...updateAction, type: 'series' })}
                      />
                      <span className="text-sm text-blue-800">
                        Tutta la serie ricorrente
                      </span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowUpdateConfirm(false)}
                    >
                      Annulla
                    </Button>
                    <Button 
                      type="submit"
                      size="sm" 
                      disabled={loading}
                    >
                      {loading ? 'Aggiornamento...' : 'Conferma Aggiornamento'}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning conflitti */}
          {conflicts.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="font-medium mb-2">Attenzione: Conflitti rilevati</div>
                <div className="space-y-2 text-sm">
                  {conflicts.map(conflict => (
                    <div key={conflict.operatorId} className="border-l-2 border-orange-300 pl-3">
                      <div className="font-medium text-orange-900">
                        {conflict.operatorName}
                      </div>
                      <div className="text-orange-700 mb-1">è già assegnato a:</div>
                      <div className="space-y-1">
                        {conflict.conflictingShifts.map(conflictShift => (
                          <div key={conflictShift.id} className="flex items-center justify-between bg-orange-100 rounded px-2 py-1">
                            <div className="flex-1">
                              <div className="font-medium text-orange-900">{conflictShift.title}</div>
                              <div className="text-xs text-orange-600">
                                {new Date(conflictShift.date).toLocaleDateString('it-IT', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-orange-700 hover:text-orange-900 hover:bg-orange-200 h-6 px-2 text-xs"
                              onClick={() => {
                                // TODO: Implementare navigazione al turno confliggente
                                console.log('Navigate to shift:', conflictShift.id)
                              }}
                            >
                              Visualizza
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm">
                  Puoi comunque procedere con l'aggiornamento del turno.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Errori */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {!showUpdateConfirm && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Aggiornamento...' : 'Aggiorna Turno'}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}