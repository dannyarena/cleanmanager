import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'async_hooks'

// Contesto per il tenant
export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>()

// Funzione per ottenere il tenantId dal contesto
export function getTenantId(): string | null {
  const context = tenantContext.getStore()
  return context?.tenantId || null
}

// Set di modelli multi-tenant
const MULTI_TENANT = new Set([
  'User','Client','Site','Shift','Checklist','CheckItem',
  'ShiftRecurrence','ShiftException','ShiftExceptionSite','ShiftExceptionOperator',
  'ShiftSite','ShiftOperator','TenantSettings'
])

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const basePrisma = new PrismaClient({
  log: ['query'],
})

// Estensione Prisma per tenant scoping
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = getTenantId()
        
        if (!tenantId || !MULTI_TENANT.has(model)) {
          return query(args)
        }
        
        // TenantSettings ha già constraint unico su tenantId, skip middleware
        if (model === 'TenantSettings') {
          return query(args)
        }

        // READ: findMany/count/updateMany/deleteMany
        if (['findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
          args.where = { AND: [{ tenantId }, args.where ?? {}] }
        }

        // findUnique/update/delete => degrada a First + AND tenantId
        if (['findUnique', 'findFirst', 'update', 'delete'].includes(operation)) {
          // Per User.findUnique con solo email, usa findFirst per cercare in tutti i tenant
          if (operation === 'findUnique' && model === 'User' && args.where?.email && !args.where?.id && !args.where?.tenantId_email) {
            // Converti findUnique in findFirst per il login
            const result = await basePrisma.user.findFirst({
              where: args.where,
              include: args.include,
              select: args.select
            })
            return result
          }
          args.where = { AND: [{ tenantId }, args.where ?? {}] }
        }

        // create/upsert => forza tenantId nei dati
        if (['create', 'upsert'].includes(operation)) {
          if (operation === 'create') {
            args.data = { ...args.data, tenantId }
          } else if (operation === 'upsert') {
            args.create = { ...args.create, tenantId }
            args.update = { ...args.update, tenantId }
          }
        }

        return query(args)
      },
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as any

process.on('beforeExit', async () => {
  await basePrisma.$disconnect()
})

export default prisma