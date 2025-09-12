import React, { useState, useEffect, useMemo } from 'react'
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
import ReactDOM from 'react-dom'

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

// Helper riutilizzabile per rendere gli input date interamente cliccabili
function useClickableDatePicker<T extends HTMLInputElement>() {
  const ref = React.useRef<T | null>(null)
  const openPicker = () => {
    const el = ref.current
    if (!el) return
    try {
      // @ts-expect-error showPicker non tipizzata dappertutto
      if (typeof el.showPicker === 'function') el.showPicker()
      else el.focus()
    } catch {
      el.focus()
    }
  }
  const handlers = {
    onClick: (e: React.MouseEvent<T>) => {
      e.preventDefault()
      openPicker()
    },
    onPointerDown: (e: React.PointerEvent<T>) => {
      e.preventDefault()
      openPicker()
    },
    onKeyDown: (e: React.KeyboardEvent<T>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openPicker()
      }
    }
  }
  return { ref, handlers }
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
  const [siteQuery, setSiteQuery] = useState('')
  const [opQuery, setOpQuery] = useState('')

  // DATE: hook per data di inizio
  const startDatePicker = useClickableDatePicker<HTMLInputElement>()
  // DATE: hook per data fine ricorrenza
  const endDatePicker = useClickableDatePicker<HTMLInputElement>()

  useEffect(() => {
    if (open) {
      const loadDefaults = async () => {
        try {
          const settings = await apiService.getSettings()
          const defaultFrequency = settings.recurrenceDefaultFrequency?.toLowerCase() || 'weekly'
          const defaultInterval = settings.recurrenceDefaultInterval || 1
          
          setFormData({
            title: '',
            date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            notes: '',
            siteIds: [],
            operatorIds: [],
            hasRecurrence: false,
            recurrence: {
              frequency: defaultFrequency as 'daily' | 'weekly',
              interval: defaultInterval,
              endType: 'never'
            }
          })
        } catch (error) {
          console.error('Errore nel caricamento settings:', error)
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
        }
      }
      
      loadDefaults()
      setError(null)
      setConflicts([])
      setShowConflicts(false)
    }
  }, [open, selectedDate])

  useEffect(() => {
    if (formData.operatorIds.length > 0 && formData.date) {
      checkConflicts()
    } else {
      setConflicts([])
    }
  }, [formData.operatorIds, formData.date])

  const checkConflicts = async () => {
    try {
      setConflicts([])
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
          startDate: new Date(formData.date).toISOString(),
          endDate: formData.recurrence.endType === 'date' && formData.recurrence.endDate
            ? new Date(formData.recurrence.endDate).toISOString()
            : undefined,
          count: formData.recurrence.endType === 'count'
            ? formData.recurrence.count
            : undefined
        } : undefined
      }

      const response = await apiService.createShift(shiftData)
      
      if (response.warnings?.operatorConflicts && response.warnings.operatorConflicts.length > 0) {
        const backendConflicts: OperatorConflict[] = response.warnings.operatorConflicts.map((conflict: any) => ({
          operatorId: conflict.operatorId,
          operatorName: conflict.operatorName,
          conflictingShifts: [{
            id: conflict.conflictingShiftId,
            title: conflict.conflictingShiftTitle,
            date: conflict.conflictDate
          }]
        }))
        
        setConflicts(backendConflicts)
        
        if (!showConflicts) {
          setShowConflicts(true)
          setLoading(false)
          return
        }
      }
      
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

  const filteredSites = useMemo(() =>
    sites.filter(
      s =>
        s.name.toLowerCase().includes(siteQuery.toLowerCase()) ||
        s.address?.toLowerCase().includes(siteQuery.toLowerCase()) ||
        s.client?.name?.toLowerCase().includes(siteQuery.toLowerCase())
    ),
    [sites, siteQuery]
  )

  const filteredOperators = useMemo(() =>
    operators.filter(
      o =>
        `${o.firstName} ${o.lastName}`.toLowerCase().includes(opQuery.toLowerCase()) ||
        o.email?.toLowerCase().includes(opQuery.toLowerCase())
    ),
    [operators, opQuery]
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden rounded-2xl">
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <DialogHeader className="px-6 pt-5 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex p-2 rounded-xl bg-primary/10 text-primary">
                  <Calendar className="w-5 h-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-xl">Nuovo Turno</span>
                  <span className="text-sm text-muted-foreground">Crea un nuovo turno assegnando siti e operatori</span>
                </div>
                {formData.hasRecurrence && (
                  <Badge variant="secondary" className="ml-2">Ricorrente</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(formData.date).toLocaleDateString('it-IT')}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <section className="rounded-xl border p-4 lg:p-5">
                <div className="mb-4">
                  <h3 className="font-semibold">Informazioni di base</h3>
                  <p className="text-sm text-muted-foreground">Titolo, data e note del turno</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      ref={startDatePicker.ref}
                      {...startDatePicker.handlers}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Note aggiuntive per il turno..."
                    rows={4}
                  />
                </div>
              </section>

              <section className="rounded-xl border p-4 lg:p-5">
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
                  <div className="mt-4 space-y-4">
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
                                recurrence: { ...prev.recurrence, endType: 'never', count: undefined, endDate: undefined }
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
                                recurrence: { ...prev.recurrence, endType: 'count', endDate: undefined }
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
                                recurrence: { ...prev.recurrence, endType: 'date', count: undefined }
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
                            ref={endDatePicker.ref}
                            {...endDatePicker.handlers}
                            className={`cursor-pointer ${formData.recurrence.endType !== 'date' ? 'cursor-not-allowed opacity-60' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {conflicts.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <div className="font-medium mb-2">Attenzione: Conflitti rilevati</div>
                    <div className="space-y-2 text-sm">
                      {conflicts.map(conflict => (
                        <div key={conflict.operatorId} className="border-l-2 border-orange-300 pl-3">
                          <div className="font-medium text-orange-900">{conflict.operatorName}</div>
                          <div className="text-orange-700 mb-1">è già assegnato a:</div>
                          <div className="space-y-1">
                            {conflict.conflictingShifts.map(shift => (
                              <div key={shift.id} className="flex items-center justify-between bg-orange-100 rounded px-2 py-1">
                                <div className="flex-1">
                                  <div className="font-medium text-orange-900">{shift.title}</div>
                                  <div className="text-xs text-orange-600">
                                    {new Date(shift.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-orange-700 hover:text-orange-900 hover:bg-orange-200 h-6 px-2 text-xs"
                                  onClick={() => console.log('Navigate to shift:', shift.id)}
                                >
                                  Visualizza
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-sm">Puoi comunque procedere con la creazione del turno.</div>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-6">
              <section className="rounded-xl border p-4 lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Siti * <span className="text-muted-foreground font-normal">({formData.siteIds.length} selezionati)</span></h3>
                    <p className="text-sm text-muted-foreground">Seleziona uno o più siti</p>
                  </div>
                  <div className="w-44">
                    <Input placeholder="Cerca sito…" value={siteQuery} onChange={(e) => setSiteQuery(e.target.value)} />
                  </div>
                </div>

                {selectedSites.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedSites.map(site => (
                      <Badge key={site.id} variant="secondary" className="flex items-center gap-1">
                        {site.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => handleSiteToggle(site.id)} />
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto rounded-lg border p-2 space-y-2 bg-background">
                  {filteredSites.map(site => (
                    <div key={site.id} className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/50">
                      <Checkbox id={`site-${site.id}`} checked={formData.siteIds.includes(site.id)} onCheckedChange={() => handleSiteToggle(site.id)} />
                      <Label htmlFor={`site-${site.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{site.name}</div>
                        {site.address && <div className="text-sm text-muted-foreground">{site.address}</div>}
                        {site.client && <div className="text-xs text-muted-foreground">{site.client.name}</div>}
                      </Label>
                    </div>
                  ))}
                  {filteredSites.length === 0 && <div className="text-sm text-muted-foreground px-1 py-4 text-center">Nessun sito trovato.</div>}
                </div>
              </section>

              <section className="rounded-xl border p-4 lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Operatori * <span className="text-muted-foreground font-normal">({formData.operatorIds.length} selezionati)</span></h3>
                    <p className="text-sm text-muted-foreground">Seleziona gli operatori assegnati</p>
                  </div>
                  <div className="w-44">
                    <Input placeholder="Cerca operatore…" value={opQuery} onChange={(e) => setOpQuery(e.target.value)} />
                  </div>
                </div>

                {selectedOperators.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedOperators.map(op => (
                      <Badge key={op.id} variant="secondary" className="flex items-center gap-1">
                        {op.firstName} {op.lastName}
                        {op.isManager && <span className="text-xs">(Manager)</span>}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => handleOperatorToggle(op.id)} />
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto rounded-lg border p-2 space-y-2 bg-background">
                  {filteredOperators.map(op => (
                    <div key={op.id} className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/50">
                      <Checkbox id={`operator-${op.id}`} checked={formData.operatorIds.includes(op.id)} onCheckedChange={() => handleOperatorToggle(op.id)} />
                      <Label htmlFor={`operator-${op.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{op.firstName} {op.lastName}</div>
                            {op.email && <div className="text-sm text-muted-foreground">{op.email}</div>}
                          </div>
                          {op.isManager && <Badge variant="outline" className="text-xs">Manager</Badge>}
                        </div>
                      </Label>
                    </div>
                  ))}
                  {filteredOperators.length === 0 && <div className="text-sm text-muted-foreground px-1 py-4 text-center">Nessun operatore trovato.</div>}
                </div>
              </section>
            </div>
          </div>

          <div className="sticky bottom-0 pt-5 mt-6 bg-gradient-to-t from-background via-background/80 to-transparent">
            <DialogFooter className="gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Creazione...' : 'Crea Turno'}</Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
