import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

const ALLOWED = ['finance_manager', 'staff_keuangan', 'ceo', 'kasir'];

router.get('/', authenticate, requireRole(...ALLOWED), async (req: Request, res: Response) => {
  try {
    const { year, month, from, to, limit = '100', offset = '0' } = req.query;
    let sql = `
      SELECT g.*, u.name as entered_by_name
      FROM general_ledger_entries g
      LEFT JOIN users u ON g.entered_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (year) { sql += ' AND g.year = ?'; params.push(year); }
    if (month) { sql += ' AND g.month = ?'; params.push(month); }
    if (from) { sql += ' AND g.entry_date >= ?'; params.push(from); }
    if (to) { sql += ' AND g.entry_date <= ?'; params.push(to); }
    sql += ' ORDER BY g.entry_date ASC, g.id ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireRole('staff_keuangan', 'kasir'), async (req: Request, res: Response) => {
  try {
    const {
      entry_date, receipt_reference, source_description, entry_type,
      to_snbs_mandiri = 0, snbs_mandiri_transaction_cost = 0,
      to_kups_bni = 0, kups_bni_transaction_cost = 0,
      to_cash_on_hand = 0, to_profit_sharing_kups = 0, cash_injection = 0,
      snbs_mandiri_cash_in = 0, snbs_mandiri_cash_out = 0,
      kups_bni_cash_in = 0, kups_bni_cash_out = 0,
      cash_on_hand_cash_in = 0, cash_on_hand_cash_out = 0,
      daily_balance_snbs_mandiri, daily_balance_kups_bni, daily_count_cash_on_hand,
      ebanking_transaction_id
    } = req.body;

    const date = new Date(entry_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Get last balances
    const [lastRow] = await pool.query(
      'SELECT snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance FROM general_ledger_entries ORDER BY entry_date DESC, id DESC LIMIT 1'
    ) as any[];
    const last = (lastRow as any[])[0] || { snbs_mandiri_balance: 0, kups_bni_balance: 0, cash_on_hand_balance: 0 };

    const snbs_balance = Number(last.snbs_mandiri_balance) + Number(snbs_mandiri_cash_in) - Number(snbs_mandiri_cash_out);
    const kups_balance = Number(last.kups_bni_balance) + Number(kups_bni_cash_in) - Number(kups_bni_cash_out);
    const cash_balance = Number(last.cash_on_hand_balance) + Number(cash_on_hand_cash_in) - Number(cash_on_hand_cash_out);

    // Generate entry number
    const [countRow] = await pool.query('SELECT COUNT(*) as cnt FROM general_ledger_entries') as any[];
    const entry_number = String((countRow as any[])[0].cnt + 1);

    await pool.query(`
      INSERT INTO general_ledger_entries (
        entry_number, year, month, entry_date, receipt_reference, source_description,
        to_snbs_mandiri, snbs_mandiri_transaction_cost,
        to_kups_bni, kups_bni_transaction_cost,
        to_cash_on_hand, to_profit_sharing_kups, cash_injection,
        snbs_mandiri_cash_in, snbs_mandiri_cash_out, snbs_mandiri_balance,
        kups_bni_cash_in, kups_bni_cash_out, kups_bni_balance,
        cash_on_hand_cash_in, cash_on_hand_cash_out, cash_on_hand_balance,
        daily_balance_snbs_mandiri, daily_balance_kups_bni, daily_count_cash_on_hand,
        ebanking_transaction_id, entered_by, entry_type
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      entry_number, year, month, entry_date, receipt_reference, source_description,
      to_snbs_mandiri, snbs_mandiri_transaction_cost,
      to_kups_bni, kups_bni_transaction_cost,
      to_cash_on_hand, to_profit_sharing_kups, cash_injection,
      snbs_mandiri_cash_in, snbs_mandiri_cash_out, snbs_balance,
      kups_bni_cash_in, kups_bni_cash_out, kups_balance,
      cash_on_hand_cash_in, cash_on_hand_cash_out, cash_balance,
      daily_balance_snbs_mandiri, daily_balance_kups_bni, daily_count_cash_on_hand,
      ebanking_transaction_id || null, req.user!.id, entry_type
    ]);
    res.status(201).json({ message: 'Entry created', entry_number });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary/balances', authenticate, requireRole(...ALLOWED), async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance, entry_date
      FROM general_ledger_entries
      ORDER BY entry_date DESC, id DESC
      LIMIT 1
    `) as any[];
    const latest = (rows as any[])[0] || { snbs_mandiri_balance: 0, kups_bni_balance: 0, cash_on_hand_balance: 0 };
    res.json({
      snbs_mandiri: latest.snbs_mandiri_balance,
      kups_bni: latest.kups_bni_balance,
      cash_on_hand: latest.cash_on_hand_balance,
      total: Number(latest.snbs_mandiri_balance) + Number(latest.kups_bni_balance) + Number(latest.cash_on_hand_balance),
      as_of: latest.entry_date,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});
