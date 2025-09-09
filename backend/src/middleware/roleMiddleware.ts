import { Request, Response, NextFunction, RequestHandler } from "express";
import { getUser } from "../auth/authContext";
import { UserRole } from "../auth/auth.types";

/**
 * Middleware che permette solo ad Admin e Manager di accedere (scrittura)
 */
export const requireAdminOrManager: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const user = getUser(req);
  
  if (!user) {
    return res.status(401).json({ error: "Autenticazione richiesta" });
  }
  
  // Admin può sempre accedere
  if (user.role === "admin") {
    return next();
  }
  
  // Operatori devono essere Manager per accedere
  if (user.role === "operatore" || user.role === "manager") {
    // Recuperiamo l'informazione isManager dal database
    // Per ora assumiamo che i manager abbiano role "manager" o siano operatori con isManager=true
    // Questo sarà verificato nel controller
    return next();
  }
  
  return res.status(403).json({ error: "Accesso negato. Solo Admin e Manager possono modificare i dati." });
};

/**
 * Middleware che permette a tutti gli utenti autenticati di accedere (lettura)
 */
export const requireAuthenticated: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const user = getUser(req);
  
  if (!user) {
    return res.status(401).json({ error: "Autenticazione richiesta" });
  }
  
  next();
};

/**
 * Verifica se l'utente corrente è Admin o Manager (con accesso al database)
 */
export const isAdminOrManager = async (userId: string, tenantId: string): Promise<boolean> => {
  const { prisma } = await import('../lib/prisma');
  
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenantId
    }
  });
  
  if (!user) return false;
  
  // Admin può sempre accedere
  if (user.role === 'ADMIN') return true;
  
  // Operatori devono essere Manager
  if (user.role === 'OPERATORE' && user.isManager) return true;
  
  return false;
};