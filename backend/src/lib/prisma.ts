import { PrismaClient } from '@prisma/client';

// Configurazione globale del client Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Crea una singola istanza del client Prisma
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// In sviluppo, mantieni l'istanza globale per evitare riconnessioni multiple
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Gestione graceful della disconnessione
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;