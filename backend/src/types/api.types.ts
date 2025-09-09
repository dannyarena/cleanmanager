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