import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/transfer-proofs';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET all e-banking transactions
router.get('/', authenticate, requireRole('staff_keuangan', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const { status, payment_request_id } = req.query;
    let sql = `
      SELECT e.*,
        u_maker.name AS maker_name,
        u_approver.name AS approver_name,
        u_ceo.name AS ceo_approver_name,
        pr.reference_number AS pr_reference
      FROM ebanking_transactions e
      LEFT JOIN users u_maker ON e.maker_id = u_maker.id
      LEFT JOIN users u_approver ON e.approver_id = u_approver.id
      LEFT JOIN users u_ceo ON e.ceo_approver_id = u_ceo.id
      LEFT JOIN payment_requests pr ON e.payment_request_id = pr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status === 'pending_finance') {
      sql += " AND e.maker_status='submitted' AND e.approver_status='pending'";
    } else if (status === 'pending_ceo') {
      sql += " AND e.approver_status='approved' AND e.ceo_status='pending'";
    } else if (status === 'pending_archive') {
      sql += " AND e.ceo_status='approved' AND e.transfer_proof_path IS NULL";
    }
    if (payment_request_id) { sql += ' AND e.payment_request_id=?'; params.push(payment_request_id); }
    sql += ' ORDER BY e.created_at DESC';
    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single transaction
router.get('/:id', authenticate, requireRole('staff_keuangan', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*,
        u_maker.name AS maker_name,
        u_approver.name AS approver_name,
        u_ceo.name AS ceo_approver_name,
        pr.reference_number AS pr_reference
      FROM ebanking_transactions e
      LEFT JOIN users u_maker ON e.maker_id = u_maker.id
      LEFT JOIN users u_approver ON e.approver_id = u_approver.id
      LEFT JOIN users u_ceo ON e.ceo_approver_id = u_ceo.id
      LEFT JOIN payment_requests pr ON e.payment_request_id = pr.id
      WHERE e.id = ?
    `, [req.params.id]) as any[];
    if (!(rows as any[])[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create e-banking transaction (Staff Keuangan / Maker)
router.post('/', authenticate, requireRole('staff_keuangan'), async (req: Request, res: Response) => {
  const {
    payment_request_id, source_account, destination_type,
    destination_detail, amount, transaction_cost = 0,
    transaction_date, transaction_time, notes
  } = req.body;
  if (!source_account || !destination_type || !amount || !transaction_date) {
    res.status(400).json({ error: 'source_account, destination_type, amount, transaction_date are required' });
    return;
  }
  try {
    const ref = `EBK-${Date.now()}`;
    const [result] = await pool.query(`
      INSERT INTO ebanking_transactions
        (payment_request_id, transaction_reference, source_account, destination_type,
         destination_detail, amount, transaction_cost, transaction_date, transaction_time,
         maker_id, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [
      payment_request_id || null, ref, source_account, destination_type,
      destination_detail || null, amount, transaction_cost,
      transaction_date, transaction_time || null, req.user!.id, notes || null
    ]) as any[];
    res.status(201).json({ id: (result as any).insertId, transaction_reference: ref });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST submit for Finance Manager approval (Maker submits)
router.post('/:id/submit', authenticate, requireRole('staff_keuangan'), async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query(
      "UPDATE ebanking_transactions SET maker_status='submitted' WHERE id=? AND maker_id=? AND maker_status='draft'",
      [req.params.id, req.user!.id]
    ) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(400).json({ error: 'Transaction not found or already submitted' });
      return;
    }
    res.json({ message: 'Submitted for Finance Manager approval' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Finance Manager approve
router.post('/:id/approve-finance', authenticate, requireRole('finance_manager'), async (req: Request, res: Response) => {
  const { notes } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE ebanking_transactions SET approver_status='approved', approver_id=? WHERE id=? AND maker_status='submitted' AND approver_status='pending'",
      [req.user!.id, req.params.id]
    ) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(400).json({ error: 'Transaction not in correct state for Finance approval' });
      return;
    }
    if (notes) {
      await pool.query("UPDATE ebanking_transactions SET notes=CONCAT(IFNULL(notes,''), ' | Finance: ', ?) WHERE id=?", [notes, req.params.id]);
    }
    res.json({ message: 'Approved by Finance Manager, awaiting CEO approval' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Finance Manager reject
router.post('/:id/reject-finance', authenticate, requireRole('finance_manager'), async (req: Request, res: Response) => {
  const { notes } = req.body;
  try {
    await pool.query(
      "UPDATE ebanking_transactions SET approver_status='rejected', approver_id=?, maker_status='draft', notes=CONCAT(IFNULL(notes,''), ' | Finance Reject: ', ?) WHERE id=?",
      [req.user!.id, notes || '', req.params.id]
    );
    res.json({ message: 'Rejected by Finance Manager' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST CEO final approval
router.post('/:id/approve-ceo', authenticate, requireRole('ceo'), async (req: Request, res: Response) => {
  const { notes } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE ebanking_transactions SET ceo_status='approved', ceo_approver_id=? WHERE id=? AND approver_status='approved' AND ceo_status='pending'",
      [req.user!.id, req.params.id]
    ) as any[];
    if ((result as any).affectedRows === 0) {
      res.status(400).json({ error: 'Transaction not in correct state for CEO approval' });
      return;
    }
    if (notes) {
      await pool.query("UPDATE ebanking_transactions SET notes=CONCAT(IFNULL(notes,''), ' | CEO: ', ?) WHERE id=?", [notes, req.params.id]);
    }
    res.json({ message: 'CEO approved. Staff Keuangan can now execute and archive proof.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST CEO reject
router.post('/:id/reject-ceo', authenticate, requireRole('ceo'), async (req: Request, res: Response) => {
  const { notes } = req.body;
  try {
    await pool.query(
      "UPDATE ebanking_transactions SET ceo_status='rejected', ceo_approver_id=?, notes=CONCAT(IFNULL(notes,''), ' | CEO Reject: ', ?) WHERE id=?",
      [req.user!.id, notes || '', req.params.id]
    );
    res.json({ message: 'Rejected by CEO' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST archive transfer proof + auto-create general ledger entry (Staff Keuangan)
router.post('/:id/archive-proof', authenticate, requireRole('staff_keuangan'), upload.single('proof'), async (req: Request, res: Response) => {
  try {
    // Get the transaction
    const [rows] = await pool.query('SELECT * FROM ebanking_transactions WHERE id=? AND ceo_status="approved"', [req.params.id]) as any[];
    const tx = (rows as any[])[0];
    if (!tx) { res.status(400).json({ error: 'Transaction not found or not yet CEO-approved' }); return; }
    if (tx.transfer_proof_path) { res.status(400).json({ error: 'Proof already archived' }); return; }

    const proofPath = req.file ? req.file.path : null;

    // Update transaction
    await pool.query(
      'UPDATE ebanking_transactions SET transfer_proof_path=?, transfer_proof_archived_at=NOW(), archived_by=? WHERE id=?',
      [proofPath, req.user!.id, req.params.id]
    );

    // Auto-create general ledger entry
    const [lastRow] = await pool.query(
      'SELECT snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance FROM general_ledger_entries ORDER BY entry_date DESC, id DESC LIMIT 1'
    ) as any[];
    const last = (lastRow as any[])[0] || { snbs_mandiri_balance: 0, kups_bni_balance: 0, cash_on_hand_balance: 0 };

    // Calculate movements based on destination
    let snbs_in = 0, snbs_out = 0, kups_in = 0, kups_out = 0, cash_in = 0, cash_out = 0;
    const amt = Number(tx.amount);
    const cost = Number(tx.transaction_cost);

    if (tx.source_account === 'snbs_mandiri') {
      snbs_out = amt + cost;
    } else if (tx.source_account === 'kups_bni') {
      kups_out = amt + cost;
    }

    if (tx.destination_type === 'snbs_mandiri') snbs_in = amt;
    else if (tx.destination_type === 'kups_bni') kups_in = amt;
    else if (tx.destination_type === 'cash_on_hand') cash_in = amt;

    const snbs_bal = Number(last.snbs_mandiri_balance) + snbs_in - snbs_out;
    const kups_bal = Number(last.kups_bni_balance) + kups_in - kups_out;
    const cash_bal = Number(last.cash_on_hand_balance) + cash_in - cash_out;

    const [countRow] = await pool.query('SELECT COUNT(*) as cnt FROM general_ledger_entries') as any[];
    const entry_number = String((countRow as any[])[0].cnt + 1);
    const entry_date = tx.transaction_date;
    const d = new Date(entry_date);

    await pool.query(`
      INSERT INTO general_ledger_entries (
        entry_number, year, month, entry_date, receipt_reference, source_description,
        to_snbs_mandiri, snbs_mandiri_transaction_cost,
        to_kups_bni, kups_bni_transaction_cost,
        to_cash_on_hand,
        snbs_mandiri_cash_in, snbs_mandiri_cash_out, snbs_mandiri_balance,
        kups_bni_cash_in, kups_bni_cash_out, kups_bni_balance,
        cash_on_hand_cash_in, cash_on_hand_cash_out, cash_on_hand_balance,
        ebanking_transaction_id, entered_by, entry_type
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      entry_number, d.getFullYear(), d.getMonth() + 1, entry_date,
      tx.transaction_reference,
      `Transfer ${tx.source_account} → ${tx.destination_type}`,
      tx.destination_type === 'snbs_mandiri' ? amt : 0,
      tx.source_account === 'snbs_mandiri' ? cost : 0,
      tx.destination_type === 'kups_bni' ? amt : 0,
      tx.source_account === 'kups_bni' ? cost : 0,
      tx.destination_type === 'cash_on_hand' ? amt : 0,
      snbs_in, snbs_out, snbs_bal,
      kups_in, kups_out, kups_bal,
      cash_in, cash_out, cash_bal,
      tx.id, req.user!.id, 'bank_transfer'
    ]);

    // Update linked payment request to completed if it exists
    if (tx.payment_request_id) {
      await pool.query(
        "UPDATE payment_requests SET status='completed' WHERE id=? AND status='ceo_approved'",
        [tx.payment_request_id]
      );
    }

    res.json({ message: 'Proof archived and general ledger updated', entry_number });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
