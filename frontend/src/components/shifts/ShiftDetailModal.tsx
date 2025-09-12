import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, ConfirmDialog } from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { 
  Calendar, 
  Users, 
  MapPin, 
  Edit, 
  Trash2, 
  Clock, 
  FileText, 
  CheckSquare,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { apiService } from '../../services/api'
import { Shift, Site, User, ChecklistItem, DeleteShiftRequest } from '../../types'
import { EditShiftModal } from './EditShiftModal'
import { useToast, toast } from '../ui/toast'

interface ShiftDetailModalProps {
  open: boolean
  onClose: () => void
  shift: Shift | null
  sites: Site[]
  operators: User[]
  onShiftUpdated: () => void
  onShiftDeleted: () => void
}

interface DeleteAction {
  type: 'single' | 'series' | 'this_and_future'
  confirmed: boolean
}

export function ShiftDetailModal({ 
  open, 
  onClose, 
  shift, 
  sites, 
  operators, 
  onShiftUpdated, 
  onShiftDeleted 
}: ShiftDetailModalProps) {
  const { addToast } = useToast()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSimpleDeleteDialog, setShowSimpleDeleteDialog] = useState(false)
  const [deleteAction, setDeleteAction] = useState<DeleteAction>({ type: 'occurrence', confirmed: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({})
  const [loadingChecklists, setLoadingChecklists] = useState(false)

  // Reset stato quando cambia il turno
  useEffect(() => {
    if (shift) {
      setError(null)
      setShowDeleteConfirm(false)
      setShowSimpleDeleteDialog(false)
      setDeleteAction({ type: 'single', confirmed: false })
      loadChecklists()
    }
  }, [shift])

  const loadChecklists = async () => {
    if (!shift || shift.sites.length === 0) return

    try {
      setLoadingChecklists(true)
      const checklistPromises = shift.sites.map(async (site) => {
        try {
          const checklist = await apiService.getSiteChecklist(site.id)
          return { siteId: site.id, checklist }
        } catch (error) {
          console.error(`Errore nel caricamento checklist per sito ${site.id}:`, error)
          return { siteId: site.id, checklist: [] }
        }
      })

      const results = await Promise.all(checklistPromises)
      const checklistMap: Record<string, ChecklistItem[]> = {}
      results.forEach(({ siteId, checklist }) => {
        checklistMap[siteId] = checklist
      })
      setChecklists(checklistMap)
    } catch (error) {
      console.error('Errore nel caricamento checklist:', error)
    } finally {
      setLoadingChecklists(false)
    }
  }

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const executeDelete = async () => {
    if (!shift) return

    try {
      setLoading(true)
      setError(null)

      // Determina il tipo di eliminazione richiesto dalla UI
      const uiDeleteType = shift.recurrence ? deleteAction.type : 'single';
      // Mappa 1:1 ai valori che si aspetta il backend
      const deleteType = uiDeleteType as 'single' | 'series' | 'this_and_future';

      const options: { deleteType: 'single' | 'series' | 'this_and_future'; occurrenceDate?: string } = { deleteType };

      // Per 'this_and_future' dobbiamo dire da quale occorrenza troncare
      if (deleteType === 'this_and_future' && shift.recurrence) {
        options.occurrenceDate = shift.date; // la data dell'occorrenza mostrata nella modale
      }

      // ID da passare all'API:
      // - 'series' → usa SEMPRE l'ID master (senza suffisso)
      // - 'single' → se abbiamo un ID di occorrenza (con suffisso), lo usiamo così com'è
      //              altrimenti, master + occurrenceDate (ci pensa il backend)
      let targetId = shift.id;
      if (deleteType === 'series') {
        targetId = shift.id.includes('_') ? shift.id.split('_')[0] : shift.id;
      } else if (deleteType === 'single') {
        if (!shift.id.includes('_') && shift.recurrence) {
          options.occurrenceDate = shift.date;
        }
      }

      // Esegui la chiamata
      await apiService.deleteShift(targetId, options);
      
      // Toast di successo
      const successMessage = shift.recurrence && deleteType === 'series' 
        ? 'Serie di turni eliminata con successo'
        : shift.recurrence && deleteType === 'this_and_future'
        ? 'Turno e occorrenze future eliminate con successo'
        : 'Turno eliminato con successo'
      
      addToast(toast.success('Eliminazione completata', successMessage))
      onShiftDeleted()
    } catch (error: any) {
      const errorMessage = error.message || 'Errore nell\'eliminazione del turno'
      setError(errorMessage)
      addToast(toast.error('Errore eliminazione', errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (!shift) return

    // Se è un turno ricorrente, chiedi se eliminare solo questa occorrenza o tutta la serie
    if (shift.recurrence && !showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    // Per i turni singoli, mostra una modale di conferma semplice
    if (!shift.recurrence && !showSimpleDeleteDialog) {
      setShowSimpleDeleteDialog(true)
      return
    }

    // Se siamo già nella conferma (ricorrente o semplice), esegui la cancellazione
    executeDelete()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // time is no longer displayed in the details modal

  const getRecurrenceDescription = (recurrence: Shift['recurrence']) => {
    if (!recurrence) return null

    const frequency = recurrence.frequency === 'daily' ? 'giorno' : 'settimana'
    const interval = recurrence.interval > 1 ? `${recurrence.interval} ` : ''
    
    let description = `Ogni ${interval}${frequency}`
    
    if (recurrence.endDate) {
      description += ` fino al ${new Date(recurrence.endDate).toLocaleDateString('it-IT')}`
    } else if (recurrence.count) {
      description += ` per ${recurrence.count} occorrenze`
    }
    
    return description
  }

  if (!shift) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {shift.title}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifica
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informazioni principali */}
            <div className="grid grid-cols-2 gap-6">
              <Card>
                  <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-card-foreground">
                      {formatDate(shift.date)}
                    </div>
                    {shift.recurrence && (
                      <Badge data-light-foreground="true" variant="secondary" className="mt-2">
                        {getRecurrenceDescription(shift.recurrence)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Note
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shift.notes ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {shift.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nessuna nota aggiunta
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs per Siti, Operatori e Checklist */}
            <Tabs defaultValue="sites" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sites" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Siti ({shift.sites.length})
                </TabsTrigger>
                <TabsTrigger value="operators" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Operatori ({shift.operators.length})
                </TabsTrigger>
                <TabsTrigger value="checklists" className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Checklist
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sites" className="space-y-4">
                {shift.sites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessun sito assegnato
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {shift.sites.map((site) => (
                      <Card key={site.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-card-foreground">{site.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{site.address}</p>
                              {site.client && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Cliente: {site.client.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {checklists[site.id] && checklists[site.id].length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {checklists[site.id].length} checklist
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="operators" className="space-y-4">
                {shift.operators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessun operatore assegnato
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {shift.operators.map((operator) => (
                      <Card key={operator.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium text-card-foreground">
                                  {operator.firstName} {operator.lastName}
                                </h4>
                                <p className="text-sm text-muted-foreground">{operator.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {operator.isManager && (
                                <Badge data-light-foreground="true" variant="secondary">Manager</Badge>
                              )}
                              <Badge variant="outline">
                                {operator.role === 'admin' ? 'Admin' : 'Operatore'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="checklists" className="space-y-4">
                {loadingChecklists ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {shift.sites.map((site) => {
                      const siteChecklist = checklists[site.id] || []
                      return (
                        <Card key={site.id}>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>{site.name}</span>
                              <Badge variant="outline">
                                {siteChecklist.length} elementi
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {siteChecklist.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">
                                Nessuna checklist configurata per questo sito
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {siteChecklist.map((item, index) => (
                                  <div key={item.id} className="flex items-start gap-3 p-3 bg-accent/2 rounded-lg border border-border">
                                    <div className="w-6 h-6 border-2 rounded flex items-center justify-center text-xs font-medium bg-card border-border text-card-foreground">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-medium text-card-foreground">{item.title}</h5>
                                        {item.required && (
                                          <Badge variant="destructive" className="text-xs">Obbligatorio</Badge>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Conferma eliminazione per turni ricorrenti */}
            {showDeleteConfirm && shift.recurrence && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-4">
                    <div className="font-medium">
                      Questo è un turno ricorrente. Cosa vuoi eliminare?
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="deleteType"
                          value="single"
                          checked={deleteAction.type === 'single'}
                          onChange={(e) => setDeleteAction({ ...deleteAction, type: 'single' })}
                        />
                        <span className="text-sm">
                          Solo questa occorrenza ({formatDate(shift.date)})
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="deleteType"
                          value="this_and_future"
                          checked={deleteAction.type === 'this_and_future'}
                          onChange={(e) => setDeleteAction({ ...deleteAction, type: 'this_and_future' })}
                        />
                        <span className="text-sm">
                          Da questa occorrenza in poi
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="deleteType"
                          value="series"
                          checked={deleteAction.type === 'series'}
                          onChange={(e) => setDeleteAction({ ...deleteAction, type: 'series' })}
                        />
                        <span className="text-sm">
                          Tutta la serie ricorrente
                        </span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Annulla
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={loading}
                      >
                        {loading ? 'Eliminazione...' : 'Conferma Eliminazione'}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Errori */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal di modifica */}
      <EditShiftModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        shift={shift}
        sites={sites}
        operators={operators}
        onShiftUpdated={() => {
          setShowEditModal(false)
          onShiftUpdated()
        }}
      />

      {/* Conferma semplice per eliminazione singola non ricorrente */}
      <ConfirmDialog
        open={showSimpleDeleteDialog}
        onOpenChange={setShowSimpleDeleteDialog}
        title="Elimina turno"
        description={shift ? `Sei sicuro di voler eliminare il turno "${shift.title}" del ${new Date(shift.date).toLocaleDateString('it-IT')}? Questa azione non può essere annullata.` : 'Sei sicuro?'}
        onConfirm={() => {
          setShowSimpleDeleteDialog(false)
          executeDelete()
        }}
        loading={loading}
      />
    </>
  )
}