import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate } from '../middleware/auth';

export const router = Router();

// GET my notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE recipient_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user!.id]
    ) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mark as read
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE id=? AND recipient_id=?',
      [req.params.id, req.user!.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mark all as read
router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE recipient_id=? AND is_read=FALSE',
      [req.user!.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
