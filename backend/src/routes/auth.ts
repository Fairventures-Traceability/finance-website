import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/connection';
import { generateToken, authenticate } from '../middleware/auth';

export const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?',
      [email]
    ) as any[];
    const user = rows[0];
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});
