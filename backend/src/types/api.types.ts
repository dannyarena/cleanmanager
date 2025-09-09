export interface QueryParams {
  q?: string;
  client_id?: string;
  site_id?: string;
  operator_id?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreateSiteRequest {
  name: string;
  address: string;
  clientId: string;
}

export interface UpdateSiteRequest {
  name?: string;
  address?: string;
  clientId?: string;
}

export interface OperatorResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isManager: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tipi per i turni
export interface QueryShiftsParams extends QueryParams {
  from?: string; // Data inizio range (ISO string)
  to?: string;   // Data fine range (ISO string)
}

export interface CreateShiftRequest {
  title: string;
  date: string; // ISO string
  notes?: string;
  siteIds?: string[];
  operatorIds?: string[];
  recurrence?: {
    frequency: 'daily' | 'weekly';
    interval: number;
    startDate: string; // ISO string
    endDate?: string;  // ISO string
    count?: number;
  };
}

export interface UpdateShiftRequest {
  title?: string;
  date?: string; // ISO string
  notes?: string;
  updateType?: 'single' | 'series'; // Per ricorrenze
}

export interface AssignSitesRequest {
  siteIds: string[];
}

export interface AssignOperatorsRequest {
  operatorIds: string[];
}

export interface ShiftResponse {
  id: string;
  title: string;
  date: Date;
  notes?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  sites: {
    id: string;
    name: string;
    address: string;
    client: {
      id: string;
      name: string;
    };
  }[];
  operators: {
    id: string;
    firstName: string;
    lastName: string;
    isManager: boolean;
  }[];
  recurrence?: {
    id: string;
    frequency: string;
    interval: number;
    startDate: Date;
    endDate?: Date;
    count?: number;
  };
  isRecurring: boolean;
  _count: {
    sites: number;
    operators: number;
  };
}

export interface OperatorConflict {
  operatorId: string;
  operatorName: string;
  conflictingShift: {
    id: string;
    title: string;
    date: Date;
  };
}