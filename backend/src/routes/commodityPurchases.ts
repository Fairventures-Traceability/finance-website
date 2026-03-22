import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/receipts';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET all purchases
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, payment_request_id, from, to } = req.query;
    let sql = `
      SELECT cp.*,
        u_field.name AS field_staff_name,
        u_kasir.name AS kasir_name,
        pr.reference_number AS pr_reference
      FROM commodity_purchases cp
      LEFT JOIN users u_field ON cp.field_staff_id = u_field.id
      LEFT JOIN users u_kasir ON cp.kasir_id = u_kasir.id
      LEFT JOIN payment_requests pr ON cp.payment_request_id = pr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (req.user!.role === 'staff_lapangan') {
      sql += ' AND cp.field_staff_id=?'; params.push(req.user!.id);
    }
    if (status) { sql += ' AND cp.verification_status=?'; params.push(status); }
    if (payment_request_id) { sql += ' AND cp.payment_request_id=?'; params.push(payment_request_id); }
    if (from) { sql += ' AND cp.purchase_date >= ?'; params.push(from); }
    if (to) { sql += ' AND cp.purchase_date <= ?'; params.push(to); }
    sql += ' ORDER BY cp.purchase_date DESC, cp.id DESC';
    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single purchase
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT cp.*, u_field.name AS field_staff_name, u_kasir.name AS kasir_name
      FROM commodity_purchases cp
      LEFT JOIN users u_field ON cp.field_staff_id = u_field.id
      LEFT JOIN users u_kasir ON cp.kasir_id = u_kasir.id
      WHERE cp.id=?
    `, [req.params.id]) as any[];
    if (!(rows as any[])[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create purchase record (Staff Lapangan)
router.post('/', authenticate, requireRole('staff_lapangan'), upload.single('receipt_file'), async (req: Request, res: Response) => {
  const {
    purchase_date, payment_request_id, farmer_name, farmer_id_card,
    commodity_type, quantity_kg, price_per_kg, payment_method,
    receipt_number, notes
  } = req.body;
  if (!purchase_date || !farmer_name || !commodity_type || !quantity_kg || !price_per_kg || !payment_method) {
    res.status(400).json({ error: 'purchase_date, farmer_name, commodity_type, quantity_kg, price_per_kg, payment_method are required' });
    return;
  }
  try {
    const total = Number(quantity_kg) * Number(price_per_kg);
    const [result] = await pool.query(`
      INSERT INTO commodity_purchases
        (purchase_date, payment_request_id, farmer_name, farmer_id_card,
         commodity_type, quantity_kg, price_per_kg, total_amount,
         payment_method, receipt_number, receipt_file_path, field_staff_id, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      purchase_date, payment_request_id || null, farmer_name, farmer_id_card || null,
      commodity_type, quantity_kg, price_per_kg, total,
      payment_method, receipt_number || null,
      req.file ? req.file.path : null,
      req.user!.id, notes || null
    ]) as any[];
    res.status(201).json({ id: (result as any).insertId, total_amount: total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST kasir verifies purchase + auto-update cash on hand in GL
router.post('/:id/verify', authenticate, requireRole('kasir'), async (req: Request, res: Response) => {
  const { payment_method, notes } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM commodity_purchases WHERE id=? AND verification_status='pending'",
      [req.params.id]
    ) as any[];
    const purchase = (rows as any[])[0];
    if (!purchase) { res.status(404).json({ error: 'Purchase not found or already verified' }); return; }

    await pool.query(
      "UPDATE commodity_purchases SET verification_status='verified', kasir_id=?, verified_at=NOW(), payment_method=?, notes=CONCAT(IFNULL(notes,''), IF(?='','', CONCAT(' | Kasir: ', ?))) WHERE id=?",
      [req.user!.id, payment_method || purchase.payment_method, notes || '', notes || '', req.params.id]
    );

    // If cash payment: record cash outflow in general ledger
    if ((payment_method || purchase.payment_method) === 'cash') {
      const [lastRow] = await pool.query(
        'SELECT cash_on_hand_balance, snbs_mandiri_balance, kups_bni_balance FROM general_ledger_entries ORDER BY entry_date DESC, id DESC LIMIT 1'
      ) as any[];
      const last = (lastRow as any[])[0] || { cash_on_hand_balance: 0, snbs_mandiri_balance: 0, kups_bni_balance: 0 };
      const new_cash = Number(last.cash_on_hand_balance) - Number(purchase.total_amount);

      const [countRow] = await pool.query('SELECT COUNT(*) as cnt FROM general_ledger_entries') as any[];
      const entry_number = String((countRow as any[])[0].cnt + 1);
      const d = new Date(purchase.purchase_date);

      await pool.query(`
        INSERT INTO general_ledger_entries (
          entry_number, year, month, entry_date, receipt_reference, source_description,
          snbs_mandiri_balance, kups_bni_balance,
          cash_on_hand_cash_out, cash_on_hand_balance,
          entered_by, entry_type
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        entry_number, d.getFullYear(), d.getMonth() + 1, purchase.purchase_date,
        purchase.receipt_number || `CP-${purchase.id}`,
        `Pembelian ${purchase.commodity_type} dari ${purchase.farmer_name}`,
        last.snbs_mandiri_balance, last.kups_bni_balance,
        purchase.total_amount, new_cash,
        req.user!.id, 'commodity_purchase'
      ]);
    }

    res.json({ message: 'Purchase verified' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
