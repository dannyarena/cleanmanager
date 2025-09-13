import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import authRouter from './auth/authRouter';
import clientsRoutes from './routes/clientsRoutes';
import sitesRoutes from './routes/sitesRoutes';
import operatorsRoutes from './routes/operatorsRoutes';
import shiftsRoutes from './routes/shiftsRoutes';
import settingsRoutes from './routes/settingsRoutes';

// Carica le variabili d'ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();

// Middleware di sicurezza
app.use(helmet());

// Configurazione CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware per parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRouter);
app.use('/api/clients', clientsRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/operators', operatorsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/settings', settingsRoutes);

// Route di benvenuto
app.get('/api/welcome', (req, res) => {
  res.json({
    message: 'Benvenuto in Clean Manager! 🧹',
    description: 'API Backend funzionante correttamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: [
      '✅ Server Express configurato',
      '✅ CORS abilitato',
      '✅ Sicurezza con Helmet',
      '✅ Variabili d\'ambiente',
      '✅ TypeScript supportato'
    ]
  });
});

// Route per informazioni API
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Clean Manager API',
    version: '1.0.0',
    description: 'Backend API per l\'applicazione Clean Manager',
    endpoints: {
      welcome: '/api/welcome',
      info: '/api/info',
      health: '/api/health',
      auth: '/auth',
      clients: '/api/clients',
      sites: '/api/sites',
      operators: '/api/operators',
      shifts: '/api/shifts',
      settings: '/api/settings'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Gestione errori 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint non trovato',
    message: `La route ${req.originalUrl} non esiste`,
    availableEndpoints: [
      '/api/welcome', 
      '/api/info', 
      '/api/health',
      '/auth/login',
      '/auth/me',
      '/api/clients',
      '/api/sites',
      '/api/operators',
      '/api/shifts',
      '/api/settings'
    ]
  });
});

// Gestione errori globali
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Errore del server:', err.stack);
  res.status(500).json({
    error: 'Errore interno del server',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Qualcosa è andato storto'
  });
});

export default app;