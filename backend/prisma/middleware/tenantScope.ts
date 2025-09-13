import { Prisma } from '@prisma/client'

const MULTI_TENANT = new Set([
  'User', 'Client', 'Site', 'Shift', 'Checklist', 'CheckItem',
  'ShiftRecurrence', 'ShiftException', 'ShiftExceptionSite', 'ShiftExceptionOperator',
  'ShiftSite', 'ShiftOperator', 'TenantSettings'
])

export function tenantScope(getTenantId: () => string | null) {
  return async (params: Prisma.MiddlewareParams, next: Prisma.Middleware) => {
    const model = params.model ?? ''
    const action = params.action
    const tenantId = getTenantId()

    if (!tenantId || !MULTI_TENANT.has(model)) {
      return next(params) // modelli globali o fasi login senza tenant
    }

    // LIST/COUNT…
    if (['findMany', 'count', 'updateMany', 'deleteMany'].includes(action)) {
      params.args ||= {}
      const existingWhere = params.args.where ?? {}
      
      // Se il where esistente contiene già tenantId, non duplicarlo
      if (existingWhere.tenantId || (existingWhere.AND && existingWhere.AND.some((clause: any) => clause.tenantId))) {
        params.args.where = existingWhere
      } else {
        params.args.where = { AND: [{ tenantId }, existingWhere] }
      }
      return next(params)
    }

    // findUnique → findFirst + AND tenantId
    if (action === 'findUnique') {
      params.action = 'findFirst' as any
      params.args ||= {}
      const existingWhere = params.args.where ?? {}
      
      // Se il where contiene già tenantId come campo diretto, mantienilo così
      if (existingWhere.tenantId) {
        // Verifica che il tenantId nel where corrisponda a quello del tenant corrente
        if (existingWhere.tenantId === tenantId) {
          params.args.where = existingWhere
        } else {
          // Se non corrisponde, restituisci null (nessun risultato)
          params.args.where = { tenantId: 'impossible-match' }
        }
      } else if (existingWhere.AND && existingWhere.AND.some((clause: any) => clause.tenantId)) {
        params.args.where = existingWhere
      } else {
        params.args.where = { AND: [{ tenantId }, existingWhere] }
      }
      return next(params)
    }

    // create/upsert → forza tenantId
    if (['create', 'upsert'].includes(action)) {
      params.args ||= {}
      params.args.data = { ...params.args.data, tenantId }
      return next(params)
    }

    // update/delete: esegui in modo "safe" con many + fetch
    if (action === 'update' || action === 'delete') {
      const delegate = (params as any).prisma?.[model] || (global as any).prisma?.[model]
      if (!delegate) return next(params) // fallback

      const args = params.args || {}
      const existingWhere = args.where ?? {}
      
      // Se il where esistente contiene già tenantId, non duplicarlo
      const where = (existingWhere.tenantId || (existingWhere.AND && existingWhere.AND.some((clause: any) => clause.tenantId))) 
        ? existingWhere 
        : { AND: [{ tenantId }, existingWhere] }

      if (action === 'update') {
        // 1) aggiorno in scoping
        const r = await delegate.updateMany({ where, data: args.data })
        if (r.count !== 1) throw new Error('Not found or cross-tenant update blocked')
        // 2) rileggo l'oggetto aggiornato
        return delegate.findFirst({ where, select: args.select, include: args.include })
      }

      if (action === 'delete') {
        // 1) prelevo l'oggetto da restituire
        const item = await delegate.findFirst({ where, select: args.select, include: args.include })
        if (!item) throw new Error('Not found or cross-tenant delete blocked')
        // 2) elimino in scoping
        await delegate.deleteMany({ where })
        return item
      }
    }

    // default
    return next(params)
  }
}