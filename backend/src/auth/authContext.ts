import { Request } from "express";
import { JWTPayloadUser } from "./auth.types";

export const setAuth = (req: Request, u: JWTPayloadUser) => {
  (req as any).user = u;
  (req as any).tenantId = u.tenantId;
};

export const getUser = (req: Request): JWTPayloadUser | undefined => (req as any).user;

export const getTenantId = (req: Request): string | undefined => (req as any).tenantId;