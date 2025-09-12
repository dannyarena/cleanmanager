import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { apiService } from '../../services/api'
import { User } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (user: User) => void
  onUpdated?: (user: User) => void
  user?: User | null
}

export const OperatorModal: React.FC<Props> = ({ open, onClose, onCreated, onUpdated, user }) => {
  const isEdit = !!user?.id
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'operatore',
    isManager: false
  })

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        password: '',
        role: user.role || 'operatore',
        isManager: !!user.isManager
      })
    } else if (!open) {
      setForm({ email: '', firstName: '', lastName: '', password: '', role: 'operatore', isManager: false })
      setError(null)
    }
  }, [user, open])

  const handleChange = (k: string, v: any) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (!form.email || !form.firstName || !form.lastName) {
      setError('Email, nome e cognome sono obbligatori')
      return
    }

    try {
      setLoading(true)
      if (isEdit && user) {
        const updated = await apiService.updateOperator(user.id, {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password || undefined,
          role: form.role as 'operatore' | 'admin',
          isManager: form.isManager
        })
        onUpdated?.(updated)
        onClose()
      } else {
        const created = await apiService.createOperator({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password || 'changeme',
          role: form.role as 'operatore' | 'admin',
          isManager: form.isManager
        })
        onCreated?.(created)
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl p-10">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica Operatore' : 'Nuovo Operatore'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@esempio.it" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Nome *</label>
              <Input value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} placeholder="Nome" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Cognome *</label>
              <Input value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} placeholder="Cognome" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">Password {isEdit ? '(lascia vuoto per non cambiare)' : '*'}</label>
            <Input type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} placeholder={isEdit ? 'Nuova password (opzionale)' : 'Password iniziale'} />
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Ruolo</label>
              <select className="mt-1 block w-full rounded-md border-gray-200 p-2" value={form.role} onChange={(e) => handleChange('role', e.target.value)}>
                <option value="operatore">Operatore</option>
                <option value="admin">Amministratore</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input id="isManager" type="checkbox" checked={form.isManager} onChange={(e) => handleChange('isManager', e.target.checked)} className="h-4 w-4" />
              <label htmlFor="isManager" className="text-sm text-muted-foreground">Manager</label>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={onClose} disabled={loading}>Annulla</Button>
              <Button type="submit" disabled={loading}>{loading ? (isEdit ? 'Aggiornando...' : 'Salvando...') : (isEdit ? 'Aggiorna Operatore' : 'Crea Operatore')}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default OperatorModal
