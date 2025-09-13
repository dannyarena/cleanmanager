// Tipi per l'autenticazione
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'operatore'
  isManager: boolean
  tenantId: string
  tenantName: string
}

export interface LoginRequest {
  email: string
  password: string
  tenantSlug?: string
}

export interface LoginResponse {
  token: string
  user: User
}

// Tipi per i clienti
export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  tenantId: string
  createdAt: string
  updatedAt: string
  _count?: {
    sites: number
  }
}

export interface CreateClientRequest {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

// Tipi per i siti
export interface Site {
  id: string
  name: string
  address: string
  clientId: string
  tenantId: string
  notes?: string
  createdAt: string
  updatedAt: string
  client?: Client
  // Backend may return either a `checklists` array or an _count for checklists
  checklist?: ChecklistItem[]
  checklists?: { id: string; title: string }[]
  _count?: { checklists?: number; shiftSites?: number }
  checkItemsCount?: number
}

export interface CreateSiteRequest {
  name: string
  address: string
  clientId: string
  notes?: string
}

// Tipi per le checklist
export interface ChecklistItem {
  id: string
  title: string
  description?: string
  order: number
  siteId: string
  createdAt: string
  updatedAt: string
}

export interface CreateChecklistItemRequest {
  title: string
  description?: string
  order: number
}

// Tipi per i turni
export interface Shift {
  id: string
  title: string
  date: string
  notes?: string
  tenantId: string
  createdAt: string
  updatedAt: string
  sites: Site[]
  operators: User[]
  recurrence?: ShiftRecurrence
}

export interface ShiftRecurrence {
  id: string
  shiftId: string
  frequency: 'daily' | 'weekly'
  interval: number
  startDate: string
  endDate?: string
  count?: number
  createdAt: string
  updatedAt: string
}

export interface CreateShiftRequest {
  title: string
  date: string
  notes?: string
  siteIds: string[]
  operatorIds: string[]
  recurrence?: {
    frequency: 'daily' | 'weekly'
    interval: number
    startDate: string
    endDate?: string
    count?: number
  }
  updateType?: 'single' | 'series' | 'this_and_future'
}

export interface UpdateShiftRequest extends Partial<CreateShiftRequest> {
  updateType?: 'single' | 'series' | 'this_and_future' // Deprecato, usa applyTo
  applyTo?: 'single' | 'series' | 'this_and_future'
  occurrenceDate?: string
}

export interface DeleteShiftRequest {
  deleteType: 'single' | 'series' | 'this_and_future'
  occurrenceDate?: string
}

// Tipi per le API responses
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}

// Tipi per i filtri e la ricerca
export interface SearchFilters {
  q?: string
  clientId?: string
  siteId?: string
  operatorId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

// Tipi per le tabelle
export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, item: T) => React.ReactNode
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
}

// Tipi per i form
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'multiselect'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: any) => string | undefined
  }
}