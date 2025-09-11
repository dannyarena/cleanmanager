import { Request, Response, NextFunction, RequestHandler } from "express";
import { UserRole } from "./auth.types";
import { getUser, getTenantId } from "./authContext";

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getUser(req);
    
    if (!user) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Permessi insufficienti" });
    }
    
    return next();
  };
};

export const requireTenant: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = getTenantId(req);
  
  if (!tenantId) {
    return res.status(400).json({ error: "Tenant ID mancante" });
  }

  return next();
};