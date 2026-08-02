import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../services/db';

export interface AuthRequest extends Request {
  user?: any;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing_authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid_authorization' });
  const token = parts[1];
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const userId = payload.userId;
    const result = await pool.query('SELECT id, account_id, name, email, role FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) return res.status(401).json({ error: 'user_not_found' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'invalid_token' });
  }
}
