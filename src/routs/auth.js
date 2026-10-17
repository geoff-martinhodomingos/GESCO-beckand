import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
const router = Router();
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Indique email e palavra-passe.' });
    const result = await pool.query('SELECT id, institution_id, full_name, email, password_hash, role, active FROM users WHERE email=$1 LIMIT 1', [email]);
    const user = result.rows[0];
    if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Credenciais inválidas.' });
    if (user.role !== 'super_admin' && user.institution_id) {
      const inst = await pool.query('SELECT status, requested_plan, license_expires_at FROM institutions WHERE id=$1', [user.institution_id]);
      const i = inst.rows[0];
      if (!i || i.status !== 'active') return res.status(403).json({ error: 'A instituição não está activa.' });
      if (i.requested_plan === 'online_offline' && i.license_expires_at && new Date(i.license_expires_at) < new Date()) return res.status(403).json({ error: 'A assinatura expirou.' });
    }
    const token = jwt.sign({ sub: user.id, role: user.role, institutionId: user.institution_id }, process.env.JWT_SECRET, { expiresIn: '8h', issuer: 'gesco-api' });
    res.json({ token, user: { id: user.id, name: user.full_name, email: user.email, role: user.role, institutionId: user.institution_id } });
  } catch (e) { next(e); }
});
export default router;
