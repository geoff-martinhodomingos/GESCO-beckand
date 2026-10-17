import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import institutionRoutes from './routes/institutions.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
const origins = (process.env.CORS_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || origins.includes(origin)) return cb(null, true); return cb(new Error('Origem não autorizada por CORS.')); }, methods: ['GET','POST','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
app.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'GESCO API', database: 'connected' }); }
  catch { res.status(503).json({ status: 'error', service: 'GESCO API', database: 'unavailable' }); }
});
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use((err, _req, res, _next) => { console.error(err.message); res.status(500).json({ error: 'Erro interno. Tente novamente mais tarde.' }); });

async function bootstrap() {
  // Criação inicial do Administrador Geral só quando as variáveis foram definidas.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD !== 'CHANGE_THIS_BEFORE_DEPLOY') {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (!exists.rowCount) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await pool.query("INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,'super_admin')", ['Administrador Geral GESCO', email, hash]);
      console.log('Administrador Geral inicial criado. Guarde as credenciais com segurança.');
    }
  }
  const port = Number(process.env.PORT || 10000);
  app.listen(port, () => console.log(`GESCO API activa na porta ${port}`));
}
bootstrap().catch(err => { console.error('Falha ao iniciar API:', err.message); process.exit(1); });
