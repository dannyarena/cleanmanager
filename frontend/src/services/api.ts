import { authService } from './auth'
import { 
  Client, 
  CreateClientRequest, 
  Site, 
  CreateSiteRequest, 
  User, 
  Shift, 
  CreateShiftRequest,
  UpdateShiftRequest,
  DeleteShiftRequest,
  ChecklistItem,
  CreateChecklistItemRequest,
  ApiResponse,
  SearchFilters 
} from '../types'

class ApiService {
  // Clienti
  async getClients(filters?: SearchFilters): Promise<Client[]> {
    const params = new URLSearchParams()
    if (filters?.q) params.append('q', filters.q)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const response = await authService.authenticatedFetch(`/clients?${params}`)
    const data: ApiResponse<Client[]> = await response.json()
    return data.data
  }

  async getClient(id: string): Promise<Client> {
    const response = await authService.authenticatedFetch(`/clients/${id}`)
    const data: ApiResponse<Client> = await response.json()
    return data.data
  }

  async createClient(client: CreateClientRequest): Promise<Client> {
    const response = await authService.authenticatedFetch('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    })
    const data: ApiResponse<Client> = await response.json()
    return data.data
  }

  async updateClient(id: string, client: Partial<CreateClientRequest>): Promise<Client> {
    const response = await authService.authenticatedFetch(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(client),
    })
    const data: ApiResponse<Client> = await response.json()
    return data.data
  }

  async deleteClient(id: string): Promise<void> {
    await authService.authenticatedFetch(`/clients/${id}`, {
      method: 'DELETE',
    })
  }

  // Siti
  async getSites(filters?: SearchFilters): Promise<Site[]> {
    const params = new URLSearchParams()
    if (filters?.q) params.append('q', filters.q)
    if (filters?.clientId) params.append('client_id', filters.clientId)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const response = await authService.authenticatedFetch(`/sites?${params}`)
    const data: ApiResponse<Site[]> = await response.json()
    return data.data
  }

  async getSite(id: string): Promise<Site> {
    const response = await authService.authenticatedFetch(`/sites/${id}`)
    const data: ApiResponse<Site> = await response.json()
    return data.data
  }

  async createSite(site: CreateSiteRequest): Promise<Site> {
    const response = await authService.authenticatedFetch('/sites', {
      method: 'POST',
      body: JSON.stringify(site),
    })
    const data: ApiResponse<Site> = await response.json()
    return data.data
  }

  async updateSite(id: string, site: Partial<CreateSiteRequest>): Promise<Site> {
    const response = await authService.authenticatedFetch(`/sites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(site),
    })
    const data: ApiResponse<Site> = await response.json()
    return data.data
  }

  async deleteSite(id: string): Promise<void> {
    await authService.authenticatedFetch(`/sites/${id}`, {
      method: 'DELETE',
    })
  }

  // Checklist per sito
  async getSiteChecklist(siteId: string): Promise<ChecklistItem[]> {
    const response = await authService.authenticatedFetch(`/sites/${siteId}/checklist`)
    const json = await response.json();

    // Backend returns either a wrapped { data: [...] } or an object { id, title, siteId, checkItems: [...] }
    if (json?.data && Array.isArray(json.data)) {
      return json.data
    }

    if (Array.isArray(json)) {
      return json
    }

    if (json?.checkItems && Array.isArray(json.checkItems)) {
      // Map backend CheckItem shape to frontend ChecklistItem shape (shallow)
      return json.checkItems.map((it: any) => ({
        id: it.id,
        title: it.title,
        description: it.description || undefined,
        required: !!it.required,
        order: it.order ?? 0,
        siteId: json.siteId || siteId,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt
      }))
    }

    return []
  }

  async updateSiteChecklist(siteId: string, items: CreateChecklistItemRequest[]): Promise<ChecklistItem[]> {
    const response = await authService.authenticatedFetch(`/sites/${siteId}/checklist`, {
      method: 'PUT',
      body: JSON.stringify({ title: `Checklist for ${siteId}`, checkItems: items }),
    })
    const json = await response.json();

    if (json?.data && Array.isArray(json.data)) {
      return json.data
    }

    if (Array.isArray(json)) {
      return json
    }

    if (json?.checkItems && Array.isArray(json.checkItems)) {
      return json.checkItems.map((it: any) => ({
        id: it.id,
        title: it.title,
        description: it.description || undefined,
        required: !!it.required,
        order: it.order ?? 0,
        siteId: json.siteId || siteId,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt
      }))
    }

    return []
  }

  // Operatori
  async getOperators(filters?: SearchFilters): Promise<User[]> {
    const params = new URLSearchParams()
    if (filters?.q) params.append('q', filters.q)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const response = await authService.authenticatedFetch(`/operators?${params}`)
    const data: ApiResponse<User[]> = await response.json()
    return data.data
  }

  async getOperator(id: string): Promise<User> {
    const response = await authService.authenticatedFetch(`/operators/${id}`)
    return response.json()
  }

  async createOperator(operator: {
    email: string
    firstName: string
    lastName: string
    password: string
    role: 'operatore' | 'admin'
    isManager?: boolean
  }): Promise<User> {
    const response = await authService.authenticatedFetch('/operators', {
      method: 'POST',
      body: JSON.stringify(operator),
    })
    return response.json()
  }

  async updateOperator(id: string, operator: {
    email?: string
    firstName?: string
    lastName?: string
    password?: string
    role?: 'operatore' | 'admin'
    isManager?: boolean
  }): Promise<User> {
    const response = await authService.authenticatedFetch(`/operators/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(operator),
    })
    return response.json()
  }

  async deleteOperator(id: string): Promise<void> {
    await authService.authenticatedFetch(`/operators/${id}`, {
      method: 'DELETE',
    })
  }

  // Turni
  async getShifts(filters?: SearchFilters): Promise<Shift[]> {
    const params = new URLSearchParams()
    if (filters?.from) params.append('from', filters.from)
    if (filters?.to) params.append('to', filters.to)
    if (filters?.operatorId) params.append('operator_id', filters.operatorId)
    if (filters?.siteId) params.append('site_id', filters.siteId)

    const response = await authService.authenticatedFetch(`/shifts?${params}`)
    const data: ApiResponse<Shift[]> = await response.json()
    return data.data
  }

  async getShift(id: string): Promise<Shift> {
    const response = await authService.authenticatedFetch(`/shifts/${id}`)
    const data: ApiResponse<Shift> = await response.json()
    return data.data
  }

  async createShift(shift: CreateShiftRequest): Promise<any> {
    const response = await authService.authenticatedFetch('/shifts', {
      method: 'POST',
      body: JSON.stringify(shift),
    })
    const data = await response.json()
    return data
  }

  async updateShift(id: string, shift: UpdateShiftRequest, options?: { applyTo?: 'single' | 'series' | 'this_and_future' }): Promise<any> {
    const requestBody = {
      ...shift,
      applyTo: options?.applyTo || shift.applyTo || shift.updateType || 'single'
    }
    
    const response = await authService.authenticatedFetch(`/shifts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    })
    const data = await response.json()
    return data
  }

  async deleteShift(id: string, options?: { deleteType: 'single' | 'series' | 'this_and_future', occurrenceDate?: string }): Promise<void> {
    const requestBody = {
      deleteType: options?.deleteType || 'single',
      ...(options?.occurrenceDate && { occurrenceDate: options.occurrenceDate })
    }
    
    await authService.authenticatedFetch(`/shifts/${id}`, {
      method: 'DELETE',
      body: JSON.stringify(requestBody),
    })
  }

  async assignShiftSites(shiftId: string, siteIds: string[]): Promise<void> {
    await authService.authenticatedFetch(`/shifts/${shiftId}/sites`, {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    })
  }

  async assignShiftOperators(shiftId: string, operatorIds: string[]): Promise<void> {
    await authService.authenticatedFetch(`/shifts/${shiftId}/operators`, {
      method: 'POST',
      body: JSON.stringify({ operatorIds }),
    })
  }

  // Settings
  async getSettings(): Promise<any> {
    const response = await authService.authenticatedFetch('/settings')
    const data: ApiResponse<any> = await response.json()
    return data.data
  }

  async updateSettings(settings: any): Promise<any> {
    const response = await authService.authenticatedFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    const data: ApiResponse<any> = await response.json()
    return data.data
  }
}

export const apiService = new ApiService()