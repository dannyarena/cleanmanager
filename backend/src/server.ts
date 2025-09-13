import app from './app';
import dotenv from 'dotenv';
import path from 'path';

// Carica le variabili d'ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });
const PORT = process.env.PORT || 5000;

// Avvio del server
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
  console.log(`📡 API disponibili su http://localhost:${PORT}/api`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export default app;