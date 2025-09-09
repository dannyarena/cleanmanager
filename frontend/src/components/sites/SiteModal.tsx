import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { apiService } from '../../services/api'
import { CreateSiteRequest, Site, Client } from '../../types'

interface Props {
	open: boolean
	onClose: () => void
	onCreated?: (site: Site) => void
	site?: Site | null
	onUpdated?: (site: Site) => void
}

export const SiteModal: React.FC<Props> = ({ open, onClose, onCreated, site, onUpdated }) => {
		// ...existing code...
	const [loading, setLoading] = useState(false)
	const [clients, setClients] = useState<Client[]>([])
	const [form, setForm] = useState<CreateSiteRequest>({ name: '', address: '', clientId: '', notes: '' })
	const [error, setError] = useState<string | null>(null)

	const isEdit = !!site?.id

	useEffect(() => {
		// Load clients for the client select
		let mounted = true
		const load = async () => {
			try {
				const data = await apiService.getClients()
				if (mounted) setClients(data)
			} catch (err) {
				console.error('Errore caricamento clienti:', err)
			}
		}
		load()
		return () => { mounted = false }
	}, [])

	useEffect(() => {
		if (site) {
			setForm({
				name: site.name || '',
				address: site.address || '',
				clientId: site.clientId || '',
				notes: site.notes || ''
			})
		} else if (!open) {
			// reset when modal closed
			setForm({ name: '', address: '', clientId: '', notes: '' })
			setError(null)
		}
	}, [site, open])

	const handleChange = (k: keyof CreateSiteRequest, v: any) => {
		setForm(prev => ({ ...prev, [k]: v }))
	}

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault()
		setError(null)

		if (!form.name || form.name.trim() === '') {
			setError('Il nome è obbligatorio')
			return
		}
		if (!form.address || form.address.trim() === '') {
			setError('L\'indirizzo è obbligatorio')
			return
		}
		if (!form.clientId || form.clientId.trim() === '') {
			setError('Seleziona un cliente')
			return
		}

		try {
			setLoading(true)
			if (isEdit && site) {
				const updated = await apiService.updateSite(site.id, form)
				onUpdated?.(updated)
				onClose()
			} else {
				const created = await apiService.createSite(form)
				onCreated?.(created)
				onClose()
			}
		} catch (err: any) {
			setError(err?.message || 'Errore durante il salvataggio del sito')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
			<DialogContent className="max-w-3xl p-12 max-h-[95vh]">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Modifica Sito' : 'Nuovo Sito'}</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">Nome *</label>
						<Input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Nome sito" />
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">Indirizzo *</label>
						<Input value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Via Roma 1, Milano" />
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">Cliente *</label>
						<select
							value={form.clientId}
							onChange={(e) => handleChange('clientId', e.target.value)}
							className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							<option value="">Seleziona cliente</option>
							{clients.map(c => (
								<option key={c.id} value={c.id}>{c.name}</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">Note</label>
						<Textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Eventuali note" />
					</div>

					{error && <div className="text-sm text-red-600">{error}</div>}

					<DialogFooter>
						<div className="flex justify-end space-x-2">
							<Button variant="ghost" onClick={onClose} disabled={loading}>Annulla</Button>
							<Button type="submit" disabled={loading} onClick={(e) => handleSubmit(e)}>{loading ? (isEdit ? 'Aggiornando...' : 'Salvando...') : (isEdit ? 'Aggiorna Sito' : 'Crea Sito')}</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export default SiteModal

