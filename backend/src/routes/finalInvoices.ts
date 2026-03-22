import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

// GET all final invoices
router.get('/', authenticate, requireRole('project_manager', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    let sql = `
      SELECT fi.*, u.name AS prepared_by_name, pr.reference_number AS pr_reference
      FROM final_invoices fi
      LEFT JOIN users u ON fi.prepared_by = u.id
      LEFT JOIN payment_requests pr ON fi.payment_request_id = pr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (req.user!.role === 'project_manager') {
      sql += ' AND fi.prepared_by=?'; params.push(req.user!.id);
    }
    sql += ' ORDER BY fi.created_at DESC';
    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create final invoice (Project Manager)
router.post('/', authenticate, requireRole('project_manager'), async (req: Request, res: Response) => {
  const { payment_request_id, invoice_date, total_advance_given, total_actual_spending, notes } = req.body;
  if (!payment_request_id || !invoice_date || total_advance_given == null || total_actual_spending == null) {
    res.status(400).json({ error: 'payment_request_id, invoice_date, total_advance_given, total_actual_spending are required' });
    return;
  }
  try {
    const [countRow] = await pool.query('SELECT COUNT(*) as cnt FROM final_invoices') as any[];
    const num = String((countRow as any[])[0].cnt + 1).padStart(4, '0');
    const invoice_number = `INV-${new Date().getFullYear()}-${num}`;

    const remaining = Number(total_advance_given) - Number(total_actual_spending);

    const [result] = await pool.query(`
      INSERT INTO final_invoices
        (invoice_number, payment_request_id, prepared_by, invoice_date,
         total_advance_given, total_actual_spending, remaining_advance, notes)
      VALUES (?,?,?,?,?,?,?,?)
    `, [invoice_number, payment_request_id, req.user!.id, invoice_date,
        total_advance_given, total_actual_spending, remaining, notes || null]) as any[];
    res.status(201).json({ id: (result as any).insertId, invoice_number, remaining_advance: remaining });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single final invoice
router.get('/:id', authenticate, requireRole('project_manager', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT fi.*, u.name AS prepared_by_name,
        pr.reference_number AS pr_reference, pr.estimated_fund_needs
      FROM final_invoices fi
      LEFT JOIN users u ON fi.prepared_by = u.id
      LEFT JOIN payment_requests pr ON fi.payment_request_id = pr.id
      WHERE fi.id=?
    `, [req.params.id]) as any[];
    if (!(rows as any[])[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST approve final invoice
router.post('/:id/approve', authenticate, requireRole('finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    await pool.query(
      "UPDATE final_invoices SET status='approved', approved_by=?, approved_at=NOW() WHERE id=?",
      [req.user!.id, req.params.id]
    );
    res.json({ message: 'Invoice approved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
