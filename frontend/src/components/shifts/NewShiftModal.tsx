import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'
import { Calendar, Users, MapPin, AlertTriangle, X } from 'lucide-react'
import { apiService } from '../../services/api'
import { Site, User, CreateShiftRequest } from '../../types'

interface NewShiftModalProps {
  open: boolean
  onClose: () => void
  onShiftCreated: () => void
  sites: Site[]
  operators: User[]
  selectedDate?: Date | null
}

interface FormData {
  title: string
  date: string
  notes: string
  siteIds: string[]
  operatorIds: string[]
  hasRecurrence: boolean
  recurrence: {
    frequency: 'daily' | 'weekly'
    interval: number
    endType: 'never' | 'count' | 'date'
    count?: number
    endDate?: string
  }
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

export function NewShiftModal({ open, onClose, onShiftCreated, sites, operators, selectedDate }: NewShiftModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: '',
    siteIds: [],
    operatorIds: [],
    hasRecurrence: false,
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      endType: 'never'
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<OperatorConflict[]>([])
  const [showConflicts, setShowConflicts] = useState(false)

  // Reset form quando si apre il modal
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: '',
        siteIds: [],
        operatorIds: [],
        hasRecurrence: false,
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          endType: 'never'
        }
      })
      setError(null)
      setConflicts([])
      setShowConflicts(false)
    }
  }, [open, selectedDate])

  // Controlla conflitti quando cambiano operatori o data
  useEffect(() => {
    if (formData.operatorIds.length > 0 && formData.date) {
      checkConflicts()
    } else {
      setConflicts([])
    }
  }, [formData.operatorIds, formData.date])

  const checkConflicts = async () => {
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

        const conflictingShifts = existingShifts.filter(shift => 
          shift.operators.some(op => op.id === operatorId)
        )

        if (conflictingShifts.length > 0) {
          conflictingOperators.push({
            operatorId,
            operatorName: `${operator.firstName} ${operator.lastName}`,
            conflictingShifts: conflictingShifts.map(shift => ({
              id: shift.id,
              title: shift.title,
              date: shift.date
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

    try {
      setLoading(true)
      setError(null)

      const shiftData: CreateShiftRequest = {
        title: formData.title.trim(),
        date: new Date(formData.date).toISOString(),
        notes: formData.notes.trim() || undefined,
        siteIds: formData.siteIds,
        operatorIds: formData.operatorIds,
        recurrence: formData.hasRecurrence ? {
          frequency: formData.recurrence.frequency,
          interval: formData.recurrence.interval,
          endDate: formData.recurrence.endType === 'date' ? 
            new Date(formData.recurrence.endDate!).toISOString() : undefined,
          count: formData.recurrence.endType === 'count' ? 
            formData.recurrence.count : undefined
        } : undefined
      }

      await apiService.createShift(shiftData)
      onShiftCreated()
    } catch (error: any) {
      setError(error.message || 'Errore nella creazione del turno')
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

  const selectedSites = sites.filter(site => formData.siteIds.includes(site.id))
  const selectedOperators = operators.filter(op => formData.operatorIds.includes(op.id))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Nuovo Turno
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

          {/* Ricorrenza */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasRecurrence"
                checked={formData.hasRecurrence}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, hasRecurrence: !!checked }))
                }
              />
              <Label htmlFor="hasRecurrence">Turno ricorrente</Label>
            </div>

            {formData.hasRecurrence && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequenza</Label>
                    <Select
                      value={formData.recurrence.frequency}
                      onValueChange={(value: 'daily' | 'weekly') => 
                        setFormData(prev => ({
                          ...prev,
                          recurrence: { ...prev.recurrence, frequency: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Giornaliero</SelectItem>
                        <SelectItem value="weekly">Settimanale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ogni</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.recurrence.interval}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, interval: parseInt(e.target.value) || 1 }
                          }))
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">
                        {formData.recurrence.frequency === 'daily' ? 'giorni' : 'settimane'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Termina</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="never"
                        name="endType"
                        checked={formData.recurrence.endType === 'never'}
                        onChange={() => 
                          setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, endType: 'never' }
                          }))
                        }
                      />
                      <Label htmlFor="never">Mai</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="count"
                        name="endType"
                        checked={formData.recurrence.endType === 'count'}
                        onChange={() => 
                          setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, endType: 'count' }
                          }))
                        }
                      />
                      <Label htmlFor="count">Dopo</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={formData.recurrence.count || ''}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, count: parseInt(e.target.value) || undefined }
                          }))
                        }
                        className="w-20"
                        disabled={formData.recurrence.endType !== 'count'}
                      />
                      <span className="text-sm text-gray-600">occorrenze</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="date"
                        name="endType"
                        checked={formData.recurrence.endType === 'date'}
                        onChange={() => 
                          setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, endType: 'date' }
                          }))
                        }
                      />
                      <Label htmlFor="date">Il</Label>
                      <Input
                        type="date"
                        value={formData.recurrence.endDate || ''}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, endDate: e.target.value }
                          }))
                        }
                        disabled={formData.recurrence.endType !== 'date'}
                        min={formData.date}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                        {conflict.conflictingShifts.map(shift => (
                          <li key={shift.id}>{shift.title}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm">
                  Puoi comunque procedere con la creazione del turno.
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Turno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}