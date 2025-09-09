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
import { Shift, Site, User, CreateShiftRequest } from '../../types'

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
  type: 'occurrence' | 'series'
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
      setUpdateAction({ type: 'occurrence', confirmed: false })
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
    if (!shift) return

    try {
      const selectedDate = new Date(formData.date)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const existingShifts = await apiService.getShifts({
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString()
      })

      const conflictingOperators: OperatorConflict[] = []

      formData.operatorIds.forEach(operatorId => {
        const operator = operators.find(op => op.id === operatorId)
        if (!operator) return

        const conflictingShifts = existingShifts.filter(existingShift => 
          existingShift.id !== shift.id && // Escludi il turno corrente
          existingShift.operators.some(op => op.id === operatorId)
        )

        if (conflictingShifts.length > 0) {
          conflictingOperators.push({
            operatorId,
            operatorName: `${operator.firstName} ${operator.lastName}`,
            conflictingShifts: conflictingShifts.map(conflictShift => ({
              id: conflictShift.id,
              title: conflictShift.title,
              date: conflictShift.date
            }))
          })
        }
      })

      setConflicts(conflictingOperators)
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

      const updateData: Partial<CreateShiftRequest> = {
        title: formData.title.trim(),
        date: new Date(formData.date).toISOString(),
        notes: formData.notes.trim() || undefined,
        siteIds: formData.siteIds,
        operatorIds: formData.operatorIds
      }

      // Aggiungi parametro per specificare se aggiornare solo occorrenza o serie
      const updateParams = shift.recurrence && updateAction.type === 'series' 
        ? { ...updateData, updateType: 'series' }
        : { ...updateData, updateType: 'occurrence' }

      await apiService.updateShift(shift.id, updateParams)
      onShiftUpdated()
    } catch (error: any) {
      setError(error.message || 'Errore nell\'aggiornamento del turno')
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
                        value="occurrence"
                        checked={updateAction.type === 'occurrence'}
                        onChange={(e) => setUpdateAction({ ...updateAction, type: 'occurrence' })}
                      />
                      <span className="text-sm text-blue-800">
                        Solo questa occorrenza
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
                <div className="space-y-1 text-sm">
                  {conflicts.map(conflict => (
                    <div key={conflict.operatorId}>
                      <strong>{conflict.operatorName}</strong> è già assegnato a:
                      <ul className="ml-4 list-disc">
                        {conflict.conflictingShifts.map(conflictShift => (
                          <li key={conflictShift.id}>{conflictShift.title}</li>
                        ))}
                      </ul>
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