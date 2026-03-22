import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/payment-request-docs';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET all payment requests
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT pr.*, u.name as submitted_by_name
      FROM payment_requests pr
      LEFT JOIN users u ON pr.submitted_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { sql += ' AND pr.status=?'; params.push(status); }
    // Project manager only sees own requests
    if (req.user!.role === 'project_manager') {
      sql += ' AND pr.submitted_by=?'; params.push(req.user!.id);
    }
    sql += ' ORDER BY pr.created_at DESC';
    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create payment request (Project Manager)
router.post('/', authenticate, requireRole('project_manager'), async (req: Request, res: Response) => {
  const { period_start, period_end, estimated_fund_needs, previous_fund_released, previous_fund_used, notes } = req.body;
  if (!period_start || !period_end || !estimated_fund_needs) {
    res.status(400).json({ error: 'period_start, period_end, estimated_fund_needs are required' });
    return;
  }
  try {
    const [countRow] = await pool.query('SELECT COUNT(*) as cnt FROM payment_requests') as any[];
    const num = String((countRow as any[])[0].cnt + 1).padStart(4, '0');
    const ref = `PR-${new Date().getFullYear()}-${num}`;

    // Next Monday 12:00 WIB
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + daysUntilMonday);
    deadline.setHours(12, 0, 0, 0);

    const [result] = await pool.query(`
      INSERT INTO payment_requests
        (reference_number, submitted_by, submission_deadline, period_start, period_end,
         estimated_fund_needs, previous_fund_released, previous_fund_used, previous_fund_remaining, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `, [
      ref, req.user!.id, deadline, period_start, period_end,
      estimated_fund_needs,
      previous_fund_released || 0,
      previous_fund_used || 0,
      Number(previous_fund_released || 0) - Number(previous_fund_used || 0),
      notes || null
    ]) as any[];
    res.status(201).json({ id: (result as any).insertId, reference_number: ref });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single payment request with documents and approvals
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT pr.*, u.name as submitted_by_name FROM payment_requests pr LEFT JOIN users u ON pr.submitted_by = u.id WHERE pr.id = ?',
      [req.params.id]
    ) as any[];
    if (!(rows as any[])[0]) { res.status(404).json({ error: 'Not found' }); return; }
    const pr = (rows as any[])[0];

    const [docs] = await pool.query(
      'SELECT id, document_type, file_name, file_path, uploaded_at FROM payment_request_documents WHERE payment_request_id = ?',
      [req.params.id]
    ) as any[];
    pr.documents = docs as any[];

    const [approvals] = await pool.query(
      'SELECT a.approval_stage as stage, a.decision, a.notes, a.decided_at, u2.name as approver FROM payment_request_approvals a LEFT JOIN users u2 ON a.approver_id = u2.id WHERE a.payment_request_id = ?',
      [req.params.id]
    ) as any[];
    pr.approvals = approvals as any[];

    res.json(pr);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update draft payment request
router.put('/:id', authenticate, requireRole('project_manager'), async (req: Request, res: Response) => {
  const { period_start, period_end, estimated_fund_needs, previous_fund_released, previous_fund_used, notes } = req.body;
  try {
    await pool.query(`
      UPDATE payment_requests SET
        period_start=?, period_end=?, estimated_fund_needs=?,
        previous_fund_released=?, previous_fund_used=?,
        previous_fund_remaining=?, notes=?, updated_at=NOW()
      WHERE id=? AND submitted_by=? AND status='draft'
    `, [
      period_start, period_end, estimated_fund_needs,
      previous_fund_released || 0, previous_fund_used || 0,
      Number(previous_fund_released || 0) - Number(previous_fund_used || 0),
      notes || null, req.params.id, req.user!.id
    ]);
    res.json({ message: 'Updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload document
router.post('/:id/documents', authenticate, requireRole('project_manager'), upload.single('file'), async (req: Request, res: Response) => {
  const { document_type } = req.body;
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  if (!document_type) { res.status(400).json({ error: 'document_type is required' }); return; }
  try {
    // Check PR belongs to this PM and is in draft/submitted
    const [rows] = await pool.query(
      "SELECT id FROM payment_requests WHERE id=? AND submitted_by=? AND status IN ('draft','submitted')",
      [req.params.id, req.user!.id]
    ) as any[];
    if (!(rows as any[])[0]) { res.status(403).json({ error: 'Not authorized or PR already processed' }); return; }

    await pool.query(`
      INSERT INTO payment_request_documents (payment_request_id, document_type, file_name, file_path, uploaded_by)
      VALUES (?,?,?,?,?)
    `, [req.params.id, document_type, req.file.originalname, req.file.path.replace(/\\/g, '/'), req.user!.id]);

    res.status(201).json({ message: 'Document uploaded', file_name: req.file.originalname });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE document
router.delete('/:id/documents/:docId', authenticate, requireRole('project_manager'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT d.file_path FROM payment_request_documents d JOIN payment_requests pr ON d.payment_request_id=pr.id WHERE d.id=? AND pr.submitted_by=? AND pr.status="draft"',
      [req.params.docId, req.user!.id]
    ) as any[];
    const doc = (rows as any[])[0];
    if (!doc) { res.status(404).json({ error: 'Document not found or PR not in draft' }); return; }
    if (doc.file_path && require('fs').existsSync(doc.file_path)) {
      require('fs').unlinkSync(doc.file_path);
    }
    await pool.query('DELETE FROM payment_request_documents WHERE id=?', [req.params.docId]);
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST submit payment request
router.post('/:id/submit', authenticate, requireRole('project_manager'), async (req: Request, res: Response) => {
  try {
    // Check required document types
    const [docs] = await pool.query(
      'SELECT document_type FROM payment_request_documents WHERE payment_request_id=?',
      [req.params.id]
    ) as any[];
    const docTypes = (docs as any[]).map((d: any) => d.document_type);
    const required = ['proforma_invoice', 'fund_estimate', 'commodity_recap', 'previous_fund_usage_report'];
    const missing = required.filter(r => !docTypes.includes(r));
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required documents: ${missing.join(', ')}` });
      return;
    }

    const [result] = await pool.query(
      "UPDATE payment_requests SET status='submitted', submitted_at=NOW() WHERE id=? AND status='draft' AND submitted_by=?",
      [req.params.id, req.user!.id]
    ) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(400).json({ error: 'Payment request not found or already submitted' });
      return;
    }
    res.json({ message: 'Submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Finance Manager approve (validates documents + checks cash position)
router.post('/:id/approve', authenticate, requireRole('finance_manager', 'ceo'), async (req: Request, res: Response) => {
  const { notes } = req.body;
  try {
    const role = req.user!.role;
    let stage: string, fromStatus: string, toStatus: string;
    if (role === 'finance_manager') {
      stage = 'finance_validation'; fromStatus = 'submitted'; toStatus = 'finance_approved';
    } else {
      stage = 'ceo_approval'; fromStatus = 'finance_approved'; toStatus = 'ceo_approved';
    }
    const [result] = await pool.query(
      'UPDATE payment_requests SET status=? WHERE id=? AND status=?',
      [toStatus, req.params.id, fromStatus]
    ) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(400).json({ error: 'Payment request not in correct state for this approval' });
      return;
    }
    await pool.query(
      "INSERT INTO payment_request_approvals (payment_request_id, approver_id, approval_stage, decision, notes, decided_at) VALUES (?,?,?,'approved',?,NOW())",
      [req.params.id, req.user!.id, stage, notes || null]
    );
    res.json({ message: 'Approved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST reject
router.post('/:id/reject', authenticate, requireRole('finance_manager', 'ceo'), async (req: Request, res: Response) => {
  const { notes } = req.body;
  if (!notes) { res.status(400).json({ error: 'Rejection notes are required' }); return; }
  try {
    const role = req.user!.role;
    const stage = role === 'finance_manager' ? 'finance_validation' : 'ceo_approval';
    await pool.query(
      "UPDATE payment_requests SET status='rejected', rejection_notes=? WHERE id=?",
      [notes, req.params.id]
    );
    await pool.query(
      "INSERT INTO payment_request_approvals (payment_request_id, approver_id, approval_stage, decision, notes, decided_at) VALUES (?,?,?,'rejected',?,NOW())",
      [req.params.id, req.user!.id, stage, notes]
    );
    res.json({ message: 'Rejected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
