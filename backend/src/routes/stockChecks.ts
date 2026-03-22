import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

// GET all stock checks
router.get('/', authenticate, requireRole('project_manager', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT sc.*, u.name AS checked_by_name
      FROM stock_checks sc
      LEFT JOIN users u ON sc.checked_by = u.id
      ORDER BY sc.check_date DESC
    `) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create stock check (Project Manager)
router.post('/', authenticate, requireRole('project_manager'), async (req: Request, res: Response) => {
  const { check_date, commodity_type, actual_quantity_kg, expected_quantity_kg, notes } = req.body;
  if (!check_date || !commodity_type || actual_quantity_kg == null) {
    res.status(400).json({ error: 'check_date, commodity_type, actual_quantity_kg are required' });
    return;
  }
  // Warn if not Friday (but allow)
  const dow = new Date(check_date).getDay();
  const isFriday = dow === 5;

  try {
    const [result] = await pool.query(`
      INSERT INTO stock_checks (check_date, checked_by, commodity_type, actual_quantity_kg, expected_quantity_kg, notes)
      VALUES (?,?,?,?,?,?)
    `, [check_date, req.user!.id, commodity_type, actual_quantity_kg, expected_quantity_kg || null, notes || null]) as any[];
    res.status(201).json({
      id: (result as any).insertId,
      warning: !isFriday ? 'Note: Stock checks are typically done on Fridays' : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single stock check
router.get('/:id', authenticate, requireRole('project_manager', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT sc.*, u.name AS checked_by_name FROM stock_checks sc LEFT JOIN users u ON sc.checked_by=u.id WHERE sc.id=?',
      [req.params.id]
    ) as any[];
    if (!(rows as any[])[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST submit stock check
router.post('/:id/submit', authenticate, requireRole('project_manager'), async (req: Request, res: Response) => {
  try {
    await pool.query(
      "UPDATE stock_checks SET status='submitted' WHERE id=? AND checked_by=? AND status='draft'",
      [req.params.id, req.user!.id]
    );
    res.json({ message: 'Stock check submitted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
