import { Router } from 'express';
import pool from '../services/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  const { account_id, name, email, password } = req.body;
  if (!account_id || !password) return res.status(400).json({ error: 'account_id and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (account_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, account_id, name, email',
      [account_id, name || null, email || null, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    return res.status(201).json({ user, token });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'account_exists' });
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { account_id, password } = req.body;
  if (!account_id || !password) return res.status(400).json({ error: 'account_id and password required' });
  try {
    const result = await pool.query('SELECT id, account_id, password_hash, name, email FROM users WHERE account_id = $1', [account_id]);
    if (result.rowCount === 0) return res.status(401).json({ error: 'invalid_credentials' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    delete user.password_hash;
    return res.json({ user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
