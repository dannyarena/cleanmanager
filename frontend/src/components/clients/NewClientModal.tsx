import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { apiService } from '../../services/api'
import { CreateClientRequest, Client } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (client: Client) => void
}

export const NewClientModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CreateClientRequest>({ name: '', email: '', phone: '', address: '', notes: '' })
  const [error, setError] = useState<string | null>(null)

  const handleChange = (k: keyof CreateClientRequest, v: any) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!form.name || form.name.trim() === '') {
      setError('Il nome è obbligatorio')
      return
    }

    try {
      setLoading(true)
      const created = await apiService.createClient(form)
      onCreated?.(created)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Errore durante la creazione del cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome *</label>
            <Input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Nome cliente" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <Input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@esempio.it" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefono</label>
            <Input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+39 02 1234567" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Indirizzo</label>
            <Input value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Via Roma 1, Milano" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Note</label>
            <Textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Eventuali note" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={onClose} disabled={loading}>Annulla</Button>
              <Button type="submit" disabled={loading} onClick={(e) => handleSubmit(e)}>{loading ? 'Salvando...' : 'Crea Cliente'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewClientModal
