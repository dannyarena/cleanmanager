import { LoginRequest, LoginResponse, User, ApiResponse, ApiError } from '../types'

const API_BASE_URL = 'http://localhost:4000/api'

class AuthService {
  private tokenKey = 'cleanmanager_token'
  private userKey = 'cleanmanager_user'

  // Gestione del token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token)
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.userKey)
  }

  // Gestione dell'utente
  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey)
    return userStr ? JSON.parse(userStr) : null
  }

  setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user))
  }

  // Verifica se l'utente è autenticato
  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`http://localhost:4000/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(error.message || 'Errore durante il login')
    }

    const data: LoginResponse = await response.json()
    const { token, user } = data

    this.setToken(token)
    this.setUser(user)

    return data
  }

  // Logout
  logout(): void {
    this.removeToken()
    window.location.href = '/login'
  }

  // Verifica il token corrente
  async verifyToken(): Promise<User> {
    const response = await fetch(`http://localhost:4000/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      this.logout()
      throw new Error('Sessione scaduta')
    }
    const data: ApiResponse<User> = await response.json()
    
    this.setUser(data.data)
    return data.data
  }

  // Wrapper per le chiamate autenticate
  async authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken()
    
    if (!token) {
      this.logout()
      throw new Error('Token non trovato')
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    // Se il token è scaduto o non valido, effettua il logout
    if (response.status === 401) {
      this.logout()
      throw new Error('Sessione scaduta')
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ message: 'Errore del server' }))
      throw new Error(error.message || 'Errore durante la richiesta')
    }

    return response
  }
}

export const authService = new AuthService()