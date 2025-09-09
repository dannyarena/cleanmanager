import { Request, Response, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { JWTPayloadUser, PrismaRoleMap } from "./auth.types";
import { getUser } from "./authContext";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const login: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e password sono richiesti" });
    }

    // Trova l'utente per email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Verifica la password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Mappa il ruolo da Prisma al nostro tipo
    const role = PrismaRoleMap[user.role];

    // Crea il payload JWT
    const payload: JWTPayloadUser = {
      sub: user.id,
      email: user.email,
      role: role,
      tenantId: user.tenantId
    };

    // Firma il token (12 ore)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    // Ritorna token e informazioni utente
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: role,
        isManager: user.isManager,
        tenantId: user.tenantId,
        tenantName: user.tenant.name
      }
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
};

export const me: RequestHandler = (req: Request, res: Response) => {
  const user = getUser(req);
  
  if (!user) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }
  
  return res.json(user);
};