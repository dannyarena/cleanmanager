import React, { useState, useEffect, useMemo, useRef } from 'react'
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
import { Shift, Site, User, UpdateShiftRequest } from '../../types'
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

type ApplyType = 'single' | 'series' | 'this_and_future'

interface UpdateAction {
  type: ApplyType
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

export function EditShiftModal({
  open,
  onClose,
  shift,
  sites,
  operators,
  onShiftUpdated
}: EditShiftModalProps) {
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
  // FIX: 'single' come valore valido (prima c'era 'occurrence')
  const [updateAction, setUpdateAction] = useState<UpdateAction>({ type: 'single', confirmed: false })

  // UI: ricerche locali per liste
  const [siteQuery, setSiteQuery] = useState('')
  const [opQuery, setOpQuery] = useState('')

  // snapshot iniziale per dirty check
  const initialFormRef = useRef<FormData | null>(null)
  const initialUpdateActionRef = useRef<UpdateAction | null>(null)

  useEffect(() => {
    if (open && shift) {
      const initial: FormData = {
        title: shift.title,
        date: new Date(shift.date).toISOString().split('T')[0],
        notes: shift.notes || '',
        siteIds: shift.sites.map(s => s.id),
        operatorIds: shift.operators.map(o => o.id)
      }
      setFormData(initial)
      initialFormRef.current = initial

      setError(null)
      setConflicts([])
      setShowConflicts(false)
      setShowUpdateConfirm(false)
      const ua = { type: 'single' as ApplyType, confirmed: false }
      setUpdateAction(ua)
      initialUpdateActionRef.current = ua

      setSiteQuery('')
      setOpQuery('')
    }
  }, [open, shift])

  useEffect(() => {
    if (formData.operatorIds.length > 0 && formData.date && shift) {
      // backend gestirà i conflitti in submit; qui azzeriamo per UI pulita
      setConflicts([])
    } else {
      setConflicts([])
    }
  }, [formData.operatorIds, formData.date, shift])

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

    if (conflicts.length > 0 && !showConflicts) {
      setShowConflicts(true)
      return
    }

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
        updateType: shift.recurrence ? updateAction.type : 'single',
        applyTo: shift.recurrence ? updateAction.type : 'single'
      }

      if (shift.recurrence && (updateData.applyTo === 'this_and_future' || updateData.applyTo === 'single')) {
        updateData.occurrenceDate = shift.date
      }

      const shiftId =
        shift.recurrence && updateData.applyTo === 'single'
          ? shift.id
          : shift.id.includes('_')
            ? shift.id.split('_')[0]
            : shift.id

      const response = await apiService.updateShift(shiftId, updateData, { applyTo: updateData.applyTo })

      if (response.warnings?.operatorConflicts?.length) {
        const backendConflicts: OperatorConflict[] = response.warnings.operatorConflicts.map((c: any) => ({
          operatorId: c.operatorId,
          operatorName: c.operatorName,
          conflictingShifts: [
            {
              id: c.conflictingShiftId,
              title: c.conflictingShiftTitle,
              date: c.conflictDate
            }
          ]
        }))
        setConflicts(backendConflicts)
        if (!showConflicts) {
          setShowConflicts(true)
          setLoading(false)
          return
        }
      }

      const successMsg = !shift.recurrence
        ? 'Turno aggiornato con successo'
        : updateAction.type === 'single'
        ? 'Occorrenza aggiornata con successo'
        : updateAction.type === 'this_and_future'
        ? 'Turno aggiornato da questa occorrenza in poi'
        : 'Intera serie aggiornata con successo'

      addToast(toast.success(successMsg))
      onShiftUpdated()
    } catch (err: any) {
      const msg = err?.message || "Errore nell'aggiornamento del turno"
      setError(msg)
      addToast(toast.error('Errore aggiornamento', msg))
    } finally {
      setLoading(false)
    }
  }

  const handleSiteToggle = (siteId: string) => {
    setFormData(prev => ({
      ...prev,
      siteIds: prev.siteIds.includes(siteId) ? prev.siteIds.filter(id => id !== siteId) : [...prev.siteIds, siteId]
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

  const arraysEqualSet = (a: string[] = [], b: string[] = []) => {
    if (a.length !== b.length) return false
    const sa = new Set(a)
    for (const v of b) if (!sa.has(v)) return false
    return true
  }

  const isDirty = useMemo(() => {
    const initial = initialFormRef.current
    const initialUpdate = initialUpdateActionRef.current
    if (!initial) return false
    if (formData.title !== initial.title) return true
    if (formData.date !== initial.date) return true
    if ((formData.notes || '') !== (initial.notes || '')) return true
    if (!arraysEqualSet(formData.siteIds, initial.siteIds)) return true
    if (!arraysEqualSet(formData.operatorIds, initial.operatorIds)) return true
    if (initialUpdate && updateAction.type !== initialUpdate.type) return true
    return false
  }, [formData, updateAction])

  if (!shift) return null

  const selectedSites = sites.filter(s => formData.siteIds.includes(s.id))
  const selectedOperators = operators.filter(o => formData.operatorIds.includes(o.id))

  // filtri locali
  const filteredSites = useMemo(
    () =>
      sites.filter(
        s =>
          s.name.toLowerCase().includes(siteQuery.toLowerCase()) ||
          s.address?.toLowerCase().includes(siteQuery.toLowerCase()) ||
          s.client?.name?.toLowerCase().includes(siteQuery.toLowerCase())
      ),
    [sites, siteQuery]
  )

  const filteredOperators = useMemo(
    () =>
      operators.filter(
        o =>
          `${o.firstName} ${o.lastName}`.toLowerCase().includes(opQuery.toLowerCase()) ||
          o.email?.toLowerCase().includes(opQuery.toLowerCase())
      ),
    [operators, opQuery]
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="
          max-w-4xl w-full p-0 overflow-hidden
          rounded-2xl
        "
      >
        {/* Header sticky */}
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <DialogHeader className="px-6 pt-5 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex p-2 rounded-xl bg-primary/10 text-primary">
                  <Calendar className="w-5 h-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-xl">Modifica Turno</span>
                  <span className="text-sm text-muted-foreground">
                    Gestisci informazioni, siti e operatori in un colpo d’occhio
                  </span>
                </div>
                {shift.recurrence && (
                  <Badge variant="secondary" className="ml-2">Ricorrente</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(formData.date || shift.date).toLocaleDateString('it-IT')}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body scrollable */}
        <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonna sinistra */}
            <div className="space-y-6">
              {/* Card info base */}
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
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Aggiungi indicazioni utili per il turno…"
                    rows={4}
                  />
                </div>
              </section>

              {/* Card conferma ricorrenza */}
              {showUpdateConfirm && shift.recurrence && (
                <section className="rounded-xl border p-4 lg:p-5 bg-blue-50/40 dark:bg-blue-950/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                        Questo è un turno ricorrente. Cosa vuoi aggiornare?
                      </h4>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setUpdateAction(a => ({ ...a, type: 'single' }))}
                          className={`px-3 py-2 rounded-lg border text-sm ${
                            updateAction.type === 'single'
                              ? 'border-blue-500 bg-white dark:bg-transparent'
                              : 'border-transparent bg-white/60 dark:bg-transparent'
                          }`}
                        >
                          Solo questa occorrenza
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpdateAction(a => ({ ...a, type: 'this_and_future' }))}
                          className={`px-3 py-2 rounded-lg border text-sm ${
                            updateAction.type === 'this_and_future'
                              ? 'border-blue-500 bg-white dark:bg-transparent'
                              : 'border-transparent bg-white/60 dark:bg-transparent'
                          }`}
                        >
                          Da questa in poi
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpdateAction(a => ({ ...a, type: 'series' }))}
                          className={`px-3 py-2 rounded-lg border text-sm ${
                            updateAction.type === 'series'
                              ? 'border-blue-500 bg-white dark:bg-transparent'
                              : 'border-transparent bg-white/60 dark:bg-transparent'
                          }`}
                        >
                          Tutta la serie
                        </button>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowUpdateConfirm(false)}>
                          Annulla
                        </Button>
                        <Button type="submit" size="sm" disabled={loading || !isDirty}>
                          {loading ? 'Aggiornamento…' : 'Conferma aggiornamento'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Warning conflitti */}
              {conflicts.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <div className="font-medium mb-2">Attenzione: conflitti rilevati</div>
                    <div className="space-y-2 text-sm">
                      {conflicts.map(conflict => (
                        <div key={conflict.operatorId} className="border-l-2 border-orange-300 pl-3">
                          <div className="font-medium text-orange-900">{conflict.operatorName}</div>
                          <div className="text-orange-700 mb-1">è già assegnato a:</div>
                          <div className="space-y-1">
                            {conflict.conflictingShifts.map(s => (
                              <div key={s.id} className="flex items-center justify-between bg-orange-100 rounded px-2 py-1">
                                <div className="flex-1">
                                  <div className="font-medium text-orange-900">{s.title}</div>
                                  <div className="text-xs text-orange-600">
                                    {new Date(s.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-orange-700 hover:text-orange-900 hover:bg-orange-200 h-6 px-2 text-xs"
                                  onClick={() => console.log('Navigate to shift:', s.id)}
                                >
                                  Visualizza
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-sm">Puoi comunque procedere con l’aggiornamento.</div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Errori */}
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Colonna destra */}
            <div className="space-y-6">
              {/* SITI */}
              <section className="rounded-xl border p-4 lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Siti *{' '}
                      <span className="text-muted-foreground font-normal">
                        ({formData.siteIds.length} selezionati)
                      </span>
                    </h3>
                    <p className="text-sm text-muted-foreground">Seleziona uno o più siti</p>
                  </div>
                  <div className="w-44">
                    <Input
                      placeholder="Cerca sito…"
                      value={siteQuery}
                      onChange={(e) => setSiteQuery(e.target.value)}
                    />
                  </div>
                </div>

                {selectedSites.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedSites.map((site) => (
                      <Badge key={site.id} variant="secondary" className="flex items-center gap-1">
                        {site.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => handleSiteToggle(site.id)} />
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto rounded-lg border p-2 space-y-2 bg-background">
                  {filteredSites.map((site) => (
                    <div key={site.id} className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/50">
                      <Checkbox
                        id={`site-${site.id}`}
                        checked={formData.siteIds.includes(site.id)}
                        onCheckedChange={() => handleSiteToggle(site.id)}
                      />
                      <Label htmlFor={`site-${site.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{site.name}</div>
                        {site.address && <div className="text-sm text-muted-foreground">{site.address}</div>}
                        {site.client && (
                          <div className="text-xs text-muted-foreground">{site.client.name}</div>
                        )}
                      </Label>
                    </div>
                  ))}
                  {filteredSites.length === 0 && (
                    <div className="text-sm text-muted-foreground px-1 py-4 text-center">Nessun sito trovato.</div>
                  )}
                </div>
              </section>

              {/* OPERATORI */}
              <section className="rounded-xl border p-4 lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" /> Operatori *{' '}
                      <span className="text-muted-foreground font-normal">
                        ({formData.operatorIds.length} selezionati)
                      </span>
                    </h3>
                    <p className="text-sm text-muted-foreground">Seleziona gli operatori assegnati</p>
                  </div>
                  <div className="w-44">
                    <Input
                      placeholder="Cerca operatore…"
                      value={opQuery}
                      onChange={(e) => setOpQuery(e.target.value)}
                    />
                  </div>
                </div>

                {selectedOperators.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedOperators.map((op) => (
                      <Badge key={op.id} variant="secondary" className="flex items-center gap-1">
                        {op.firstName} {op.lastName}
                        {op.isManager && <span className="text-xs">(Manager)</span>}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => handleOperatorToggle(op.id)} />
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto rounded-lg border p-2 space-y-2 bg-background">
                  {filteredOperators.map((op) => (
                    <div key={op.id} className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/50">
                      <Checkbox
                        id={`operator-${op.id}`}
                        checked={formData.operatorIds.includes(op.id)}
                        onCheckedChange={() => handleOperatorToggle(op.id)}
                      />
                      <Label htmlFor={`operator-${op.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {op.firstName} {op.lastName}
                            </div>
                            {op.email && <div className="text-sm text-muted-foreground">{op.email}</div>}
                          </div>
                          {op.isManager && <Badge variant="outline" className="text-xs">Manager</Badge>}
                        </div>
                      </Label>
                    </div>
                  ))}
                  {filteredOperators.length === 0 && (
                    <div className="text-sm text-muted-foreground px-1 py-4 text-center">Nessun operatore trovato.</div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Footer sticky (mostrato solo se non stiamo mostrando la conferma ricorrenza) */}
          {!showUpdateConfirm && (
            <div className="sticky bottom-0 pt-5 mt-6 bg-gradient-to-t from-background via-background/80 to-transparent">
              <DialogFooter className="gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annulla
                </Button>
                <Button type="submit" disabled={loading || !isDirty}>
                  {loading ? 'Aggiornamento…' : 'Aggiorna turno'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
