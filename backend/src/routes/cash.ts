import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

// GET current balance position (for Finance Manager coordination with Kasir)
router.get('/balance', authenticate, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance, entry_date
      FROM general_ledger_entries ORDER BY entry_date DESC, id DESC LIMIT 1
    `) as any[];
    const bal = (rows as any[])[0] || { snbs_mandiri_balance: 0, kups_bni_balance: 0, cash_on_hand_balance: 0 };
    res.json({
      snbs_mandiri: Number(bal.snbs_mandiri_balance),
      kups_bni: Number(bal.kups_bni_balance),
      cash_on_hand: Number(bal.cash_on_hand_balance),
      total: Number(bal.snbs_mandiri_balance) + Number(bal.kups_bni_balance) + Number(bal.cash_on_hand_balance),
      as_of: bal.entry_date,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Kasir confirms funds received from bank + updates cash on hand in GL
router.post('/confirm-receipt', authenticate, requireRole('kasir'), async (req: Request, res: Response) => {
  const { ebanking_transaction_id, receipt_date, amount_received, notes } = req.body;
  if (!receipt_date || !amount_received) {
    res.status(400).json({ error: 'receipt_date and amount_received are required' });
    return;
  }
  try {
    // Get last balances
    const [lastRow] = await pool.query(
      'SELECT snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance FROM general_ledger_entries ORDER BY entry_date DESC, id DESC LIMIT 1'
    ) as any[];
    const last = (lastRow as any[])[0] || { snbs_mandiri_balance: 0, kups_bni_balance: 0, cash_on_hand_balance: 0 };
    const new_cash = Number(last.cash_on_hand_balance) + Number(amount_received);

    const [countRow] = await pool.query('SELECT COUNT(*) as cnt FROM general_ledger_entries') as any[];
    const entry_number = String((countRow as any[])[0].cnt + 1);
    const d = new Date(receipt_date);

    await pool.query(`
      INSERT INTO general_ledger_entries (
        entry_number, year, month, entry_date, source_description,
        snbs_mandiri_balance, kups_bni_balance,
        cash_on_hand_cash_in, cash_on_hand_balance,
        ebanking_transaction_id, entered_by, entry_type
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      entry_number, d.getFullYear(), d.getMonth() + 1, receipt_date,
      notes || 'Penerimaan dana dari bank',
      last.snbs_mandiri_balance, last.kups_bni_balance,
      amount_received, new_cash,
      ebanking_transaction_id || null, req.user!.id, 'cash_deposit'
    ]);

    res.status(201).json({ message: 'Cash receipt recorded', new_cash_balance: new_cash, entry_number });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET daily cash counts
router.get('/daily-count', authenticate, requireRole('kasir', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    let sql = `
      SELECT d.*, u.name as kasir_name
      FROM daily_cash_counts d
      LEFT JOIN users u ON d.kasir_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (from) { sql += ' AND d.count_date >= ?'; params.push(from); }
    if (to) { sql += ' AND d.count_date <= ?'; params.push(to); }
    sql += ' ORDER BY d.count_date DESC LIMIT 60';
    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET today's cash count
router.get('/daily-count/today', authenticate, requireRole('kasir', 'finance_manager', 'ceo'), async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      'SELECT d.*, u.name as kasir_name FROM daily_cash_counts d LEFT JOIN users u ON d.kasir_id=u.id WHERE d.count_date=?',
      [today]
    ) as any[];
    res.json((rows as any[])[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create/update daily cash count
router.post('/daily-count', authenticate, requireRole('kasir'), async (req: Request, res: Response) => {
  const { count_date, physical_count, discrepancy_notes } = req.body;
  if (!count_date || physical_count == null) {
    res.status(400).json({ error: 'count_date and physical_count are required' });
    return;
  }
  try {
    // Get GL balance at end of this date
    const [ledgerRow] = await pool.query(
      'SELECT cash_on_hand_balance FROM general_ledger_entries WHERE entry_date <= ? ORDER BY entry_date DESC, id DESC LIMIT 1',
      [count_date]
    ) as any[];
    const ledger_balance = Number((ledgerRow as any[])[0]?.cash_on_hand_balance || 0);
    const discrepancy = Number(physical_count) - ledger_balance;
    const status = Math.abs(discrepancy) < 1 ? 'matched' : 'discrepancy_noted';

    await pool.query(`
      INSERT INTO daily_cash_counts (count_date, kasir_id, physical_count, general_ledger_balance, discrepancy, discrepancy_notes, status)
      VALUES (?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        physical_count=VALUES(physical_count),
        general_ledger_balance=VALUES(general_ledger_balance),
        discrepancy=VALUES(discrepancy),
        discrepancy_notes=VALUES(discrepancy_notes),
        status=VALUES(status),
        updated_at=NOW()
    `, [count_date, req.user!.id, physical_count, ledger_balance, discrepancy, discrepancy_notes || null, status]);

    res.status(201).json({ discrepancy, ledger_balance, physical_count: Number(physical_count), status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST mark WhatsApp sent (Kasir sends notes+cash by 18:00)
router.post('/daily-count/:id/send-whatsapp', authenticate, requireRole('kasir'), async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 18) {
      // Still allow but flag as late
      await pool.query(
        'UPDATE daily_cash_counts SET whatsapp_sent_at=NOW(), whatsapp_sent_by=?, count_completed_at=NOW(), status=IF(status="discrepancy_noted","discrepancy_noted","resolved") WHERE id=?',
        [req.user!.id, req.params.id]
      );
      res.json({ message: 'Marked as sent (after 18:00 deadline)', late: true });
    } else {
      await pool.query(
        'UPDATE daily_cash_counts SET whatsapp_sent_at=NOW(), whatsapp_sent_by=?, count_completed_at=NOW() WHERE id=?',
        [req.user!.id, req.params.id]
      );
      res.json({ message: 'Marked as sent to WhatsApp', late: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET cash movement summary for a date range
router.get('/summary', authenticate, requireRole('kasir', 'finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const [rows] = await pool.query(`
      SELECT
        SUM(cash_on_hand_cash_in) AS total_cash_in,
        SUM(cash_on_hand_cash_out) AS total_cash_out,
        SUM(snbs_mandiri_cash_in) AS total_snbs_in,
        SUM(snbs_mandiri_cash_out) AS total_snbs_out,
        SUM(kups_bni_cash_in) AS total_kups_in,
        SUM(kups_bni_cash_out) AS total_kups_out,
        COUNT(*) AS entry_count
      FROM general_ledger_entries
      WHERE entry_date BETWEEN ? AND ?
    `, [from || '2000-01-01', to || '2099-12-31']) as any[];
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
