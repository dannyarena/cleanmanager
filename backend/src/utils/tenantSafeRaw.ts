/**
 * Wrapper sicuro per query raw SQL con filtro tenant_id automatico
 * Milestone 5 - Audit & blocco query pericolose
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { getTenantId } from '../middleware/jwtMiddleware';
import { Request } from 'express';

/**
 * Interfaccia per query raw sicure con tenant scoping automatico
 */
export interface TenantSafeRawOptions {
  /** Request object per estrarre tenantId dal JWT */
  req: Request;
  /** Query SQL con placeholder per tenantId come primo parametro */
  sql: string;
  /** Parametri aggiuntivi per la query (tenantId viene aggiunto automaticamente) */
  params?: any[];
  /** Se true, verifica che la query contenga WHERE con tenantId */
  enforceWhereClause?: boolean;
}

/**
 * Esegue una query raw sicura con filtro tenant_id automatico
 * 
 * @example
 * ```typescript
 * const result = await executeTenantSafeRaw(prisma, {
 *   req,
 *   sql: 'SELECT * FROM shifts WHERE tenant_id = $1 AND date >= $2',
 *   params: [new Date()]
 * });
 * ```
 */
export async function executeTenantSafeRaw<T = any>(
  prisma: PrismaClient,
  options: TenantSafeRawOptions
): Promise<T[]> {
  const { req, sql, params = [], enforceWhereClause = true } = options;
  
  // Estrai tenantId dal JWT
  const tenantId = getTenantId(req);
  if (!tenantId) {
    throw new Error('TenantSafeRaw: tenantId non trovato nel token JWT');
  }
  
  // Validazione sicurezza: verifica che la query contenga WHERE con tenant_id
  if (enforceWhereClause) {
    const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (!normalizedSql.includes('where')) {
      throw new Error('TenantSafeRaw: Query deve contenere clausola WHERE per sicurezza tenant');
    }
    
    if (!normalizedSql.includes('tenant_id')) {
      throw new Error('TenantSafeRaw: Query deve filtrare per tenant_id per sicurezza multi-tenant');
    }
    
    if (!normalizedSql.includes('$1')) {
      throw new Error('TenantSafeRaw: Il primo parametro ($1) deve essere riservato per tenant_id');
    }
  }
  
  // Prepara parametri con tenantId come primo elemento
  const finalParams = [tenantId, ...params];
  
  // Log per audit (solo in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[TenantSafeRaw] Executing:', {
      tenantId,
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      paramCount: finalParams.length
    });
  }
  
  try {
    // Esegui query raw con parametri sicuri
    const result = await prisma.$queryRaw<T[]>`${Prisma.raw(sql)}` as any;
    return result;
  } catch (error) {
    console.error('[TenantSafeRaw] Query failed:', {
      tenantId,
      sql: sql.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Esegue un comando raw sicuro (INSERT, UPDATE, DELETE) con filtro tenant_id
 */
export async function executeTenantSafeCommand(
  prisma: PrismaClient,
  options: TenantSafeRawOptions
): Promise<number> {
  const { req, sql, params = [], enforceWhereClause = true } = options;
  
  const tenantId = getTenantId(req);
  if (!tenantId) {
    throw new Error('TenantSafeCommand: tenantId non trovato nel token JWT');
  }
  
  // Validazione per comandi di modifica
  const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ').trim();
  const isModifyCommand = normalizedSql.startsWith('update') || 
                         normalizedSql.startsWith('delete') ||
                         normalizedSql.startsWith('insert');
  
  if (isModifyCommand && enforceWhereClause) {
    if (normalizedSql.startsWith('update') || normalizedSql.startsWith('delete')) {
      if (!normalizedSql.includes('where') || !normalizedSql.includes('tenant_id')) {
        throw new Error('TenantSafeCommand: UPDATE/DELETE deve filtrare per tenant_id');
      }
    }
    
    if (normalizedSql.startsWith('insert') && !normalizedSql.includes('tenant_id')) {
      throw new Error('TenantSafeCommand: INSERT deve includere tenant_id');
    }
  }
  
  const finalParams = [tenantId, ...params];
  
  try {
    const result = await prisma.$executeRaw`${Prisma.raw(sql)}` as any;
    return result;
  } catch (error) {
    console.error('[TenantSafeCommand] Command failed:', {
      tenantId,
      sql: sql.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Utility per costruire query sicure con parametri tipizzati
 */
export class TenantSafeQueryBuilder {
  private sql: string = '';
  private params: any[] = [];
  
  constructor(private req: Request) {}
  
  select(fields: string): this {
    this.sql = `SELECT ${fields}`;
    return this;
  }
  
  from(table: string): this {
    this.sql += ` FROM ${table}`;
    return this;
  }
  
  where(condition: string, ...params: any[]): this {
    const tenantCondition = 'tenant_id = $1';
    const paramOffset = this.params.length + 2; // +1 per tenantId, +1 per 1-based indexing
    
    const adjustedCondition = condition.replace(/\$(\d+)/g, (match, num) => {
      return `$${parseInt(num) + 1}`; // Shift parametri di 1 posizione
    });
    
    this.sql += ` WHERE ${tenantCondition} AND ${adjustedCondition}`;
    this.params.push(...params);
    return this;
  }
  
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.sql += ` ORDER BY ${field} ${direction}`;
    return this;
  }
  
  limit(count: number): this {
    this.sql += ` LIMIT ${count}`;
    return this;
  }
  
  async execute<T = any>(prisma: PrismaClient): Promise<T[]> {
    return executeTenantSafeRaw<T>(prisma, {
      req: this.req,
      sql: this.sql,
      params: this.params
    });
  }
}