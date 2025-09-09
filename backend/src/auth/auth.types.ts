export type UserRole = "admin" | "manager" | "operatore";

// Mapping tra enum Prisma e nostri tipi
export const PrismaRoleMap = {
  'ADMIN': 'admin' as const,
  'MANAGER': 'manager' as const,
  'OPERATORE': 'operatore' as const
} as const;

export interface JWTPayloadUser {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
}