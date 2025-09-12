import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { apiService } from '../../services/api'
import { ChecklistItem, CreateChecklistItemRequest } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  siteId: string
  onSaved?: (items: ChecklistItem[]) => void
}

const ChecklistModal: React.FC<Props> = ({ open, onClose, siteId, onSaved }) => {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Array<Partial<ChecklistItem> & { order: number }>>([])
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    if (!open) return
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const data = await apiService.getSiteChecklist(siteId)
        if (mounted) setItems(data.map(i => ({ ...i, order: i.order ?? 0 })))
      } catch (err) {
        console.error('Errore caricamento checklist:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [open, siteId])

  const addItem = () => {
    const order = items.length > 0 ? Math.max(...items.map(i => i.order || 0)) + 1 : 0
    if (!newTitle || newTitle.trim() === '') return
    setItems(prev => [...prev, { title: newTitle.trim(), description: '', required: false, order }])
    setNewTitle('')
  }

  const updateItem = (index: number, patch: Partial<ChecklistItem>) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index).map((it, idx) => ({ ...it, order: idx })))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
        const payload: CreateChecklistItemRequest[] = items.map((it, idx) => ({
          title: (it.title || '').trim(),
          description: it.description,
          order: it.order ?? idx,
        }))

      const result = await apiService.updateSiteChecklist(siteId, payload)
      onSaved?.(result)
      onClose()
    } catch (err) {
      console.error('Errore salvataggio checklist:', err)
      alert('Errore durante il salvataggio della checklist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-3xl p-8 max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Gestisci Checklist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input placeholder="Nuova attività..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Button onClick={addItem}>Aggiungi</Button>
          </div>

          <div className="space-y-3">
            {loading && <div className="text-sm text-muted">Caricamento...</div>}
            {!loading && items.length === 0 && <div className="text-sm text-muted">Nessuna attività presente</div>}

            {items.map((it, idx) => (
              <div key={idx} className="p-3 border border-input rounded-md bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Input value={it.title || ''} onChange={(e) => updateItem(idx, { title: e.target.value })} placeholder="Titolo attività" />
                    <Textarea value={it.description || ''} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Descrizione (opzionale)" />
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <Button variant="ghost" onClick={() => removeItem(idx)} className="text-red-600">Rimuovi</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>Annulla</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvataggio...' : 'Salva checklist'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChecklistModal
