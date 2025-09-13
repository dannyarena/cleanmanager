import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { JWTPayloadUser } from "./auth.types";
import { setAuth } from "./authContext";
import { tenantContext } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const jwtRequired: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token mancante" });
  }

  const token = authHeader.substring(7);
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayloadUser;
    setAuth(req, payload);
    
    // Imposta il contesto del tenant per il middleware Prisma
    tenantContext.run({ tenantId: payload.tenantId }, () => {
      return next();
    });
  } catch (error) {
    return res.status(401).json({ error: "Token non valido" });
  }
};

export const jwtOptional: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayloadUser;
      setAuth(req, payload);
      
      // Imposta il contesto del tenant per il middleware Prisma
      tenantContext.run({ tenantId: payload.tenantId }, () => {
        return next();
      });
      return;
    } catch (error) {
      // Token non valido, ma continuiamo senza autenticazione
    }
  }
  
  next();
};