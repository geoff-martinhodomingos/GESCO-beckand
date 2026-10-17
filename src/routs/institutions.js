import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
const router = Router();
const plans = new Set(['offline', 'online_offline']);

// Registo público: cria pedido pendente, nunca activa licença automaticamente.
router.post('/requests', async (req, res, next) => {
  try {
    const { name, province, municipality, contactName, contactEmail, contactPhone, plan } = req.body || {};
    if (![name, contactName, contactEmail, plan].every(v => typeof v === 'string' && v.trim()))
      return res.status(400).json({ error: 'Preencha instituição, responsável, email e modalidade.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))
      return res.status(400).json({ error: 'Endereço de email inválido.' });
    if (!plans.has(plan)) return res.status(400).json({ error: 'Modalidade de licença inválida.' });
    const result = await pool.query(
      `INSERT INTO institutions(name, province, municipality, contact_name, contact_email, contact_phone, requested_plan)
       VALUES($1,$2,$3,$4,LOWER($5),$6,$7) RETURNING id,name,status,requested_plan,created_at`,
      [name.trim(), province?.trim() || null, municipality?.trim() || null, contactName.trim(), contactEmail.trim(), contactPhone?.trim() || null, plan]
    );
    res.status(201).json({ message: 'Pedido recebido. Aguarde a aprovação do Administrador Geral.', request: result.rows[0] });
  } catch (e) { next(e); }
});

router.get('/', requireAuth, requireSuperAdmin, async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT id,name,province,municipality,contact_name,contact_email,contact_phone,requested_plan,status,license_code,license_expires_at,created_at FROM institutions ORDER BY created_at DESC');
    res.json({ institutions: result.rows });
  } catch (e) { next(e); }
});

router.post('/:id/decision', requireAuth, requireSuperAdmin, async (req, res, next) => {
  const { decision, expiresAt } = req.body || {};
  if (!['approve', 'reject', 'suspend'].includes(decision)) return res.status(400).json({ error: 'Decisão inválida.' });
  const status = { approve: 'active', reject: 'rejected', suspend: 'suspended' }[decision];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const licenseCode = decision === 'approve' ? `GES-${cryptoRandom()}` : null;
    const result = await client.query(
      `UPDATE institutions SET status=$1, license_code=CASE WHEN $2 THEN $3 ELSE license_code END,
       license_expires_at=CASE WHEN $4::timestamptz IS NOT NULL THEN $4::timestamptz ELSE license_expires_at END,
       approved_at=CASE WHEN $1='active' THEN NOW() ELSE approved_at END, updated_at=NOW()
       WHERE id=$5 RETURNING id,name,status,requested_plan,license_code,license_expires_at`,
      [status, decision === 'approve', licenseCode, expiresAt || null, req.params.id]
    );
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Instituição não encontrada.' }); }
    await client.query('INSERT INTO admin_audit_log(actor_user_id,action,institution_id,details) VALUES($1,$2,$3,$4)', [req.user.sub, `institution_${decision}`, req.params.id, JSON.stringify({ expiresAt: expiresAt || null })]);
    await client.query('COMMIT');
    res.json({ institution: result.rows[0] });
  } catch (e) { await client.query('ROLLBACK'); next(e); }
  finally { client.release(); }
});
function cryptoRandom() { return Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2,'0')).join('').toUpperCase(); }
export default router;
