import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { apiService } from '../../services/api'
import { Site } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  clientId: string | null
}

export const ClientSitesModal: React.FC<Props> = ({ open, onClose, clientId }) => {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!clientId) return
      try {
        setLoading(true)
        // apiService.getSites is expected to return Site[]
        const data = await apiService.getSites({ clientId })
        if (mounted && Array.isArray(data)) setSites(data)
      } catch (err) {
        console.error('Errore caricamento siti cliente:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (open) load()
    return () => { mounted = false }
  }, [clientId, open])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle>Siti assegnati</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-auto">
          {loading && <div className="text-sm text-muted">Caricamento...</div>}
          {!loading && sites.length === 0 && (
            <div className="text-sm text-muted">Nessun sito assegnato a questo cliente.</div>
          )}
          {!loading && sites.map(s => (
            <div key={s.id} className="p-3 border rounded-md bg-card">
              <div className="font-medium text-card-foreground">{s.name}</div>
              <div className="text-sm text-muted">{s.address}</div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>Chiudi</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ClientSitesModal
