import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

// GET all reconciliations
router.get('/', authenticate, requireRole('finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT wr.*, u.name AS reconciled_by_name
      FROM weekly_reconciliations wr
      LEFT JOIN users u ON wr.reconciled_by = u.id
      ORDER BY wr.week_start_date DESC
    `) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST start a new weekly reconciliation
router.post('/', authenticate, requireRole('finance_manager'), async (req: Request, res: Response) => {
  const { week_start_date, week_end_date } = req.body;
  if (!week_start_date || !week_end_date) {
    res.status(400).json({ error: 'week_start_date and week_end_date are required' });
    return;
  }
  // Validate it's a Friday
  const endDay = new Date(week_end_date).getDay();
  if (endDay !== 5) {
    res.status(400).json({ error: 'week_end_date must be a Friday (reconciliation is done on Fridays)' });
    return;
  }
  try {
    // Aggregate ledger data for the week
    const [ledgerSummary] = await pool.query(`
      SELECT
        SUM(snbs_mandiri_cash_in) AS total_bank_in_snbs,
        SUM(snbs_mandiri_cash_out) AS total_bank_out_snbs,
        SUM(kups_bni_cash_in) AS total_bank_in_kups,
        SUM(kups_bni_cash_out) AS total_bank_out_kups,
        SUM(cash_on_hand_cash_in) AS total_cash_in,
        SUM(cash_on_hand_cash_out) AS total_cash_out
      FROM general_ledger_entries
      WHERE entry_date BETWEEN ? AND ?
    `, [week_start_date, week_end_date]) as any[];
    const summary = (ledgerSummary as any[])[0] || {};

    // Get final balances at week end
    const [finalBalances] = await pool.query(`
      SELECT snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance
      FROM general_ledger_entries
      WHERE entry_date <= ?
      ORDER BY entry_date DESC, id DESC LIMIT 1
    `, [week_end_date]) as any[];
    const final = (finalBalances as any[])[0] || {};

    // Check for cash count discrepancies this week
    const [cashCounts] = await pool.query(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN status='discrepancy_noted' THEN 1 ELSE 0 END) AS discrepancies
      FROM daily_cash_counts WHERE count_date BETWEEN ? AND ?
    `, [week_start_date, week_end_date]) as any[];
    const discrepancyFound = Number((cashCounts as any[])[0]?.discrepancies || 0) > 0;

    const [result] = await pool.query(`
      INSERT INTO weekly_reconciliations (
        week_start_date, week_end_date, reconciled_by,
        total_cash_in, total_cash_out,
        total_bank_in_snbs, total_bank_out_snbs,
        total_bank_in_kups, total_bank_out_kups,
        final_cash_balance, final_snbs_balance, final_kups_balance,
        discrepancy_found
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      week_start_date, week_end_date, req.user!.id,
      summary.total_cash_in || 0, summary.total_cash_out || 0,
      summary.total_bank_in_snbs || 0, summary.total_bank_out_snbs || 0,
      summary.total_bank_in_kups || 0, summary.total_bank_out_kups || 0,
      final.cash_on_hand_balance || 0,
      final.snbs_mandiri_balance || 0,
      final.kups_bni_balance || 0,
      discrepancyFound
    ]) as any[];

    res.status(201).json({ id: (result as any).insertId, discrepancy_found: discrepancyFound, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single reconciliation with ledger entries for the week
router.get('/:id', authenticate, requireRole('finance_manager', 'ceo'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT wr.*, u.name AS reconciled_by_name FROM weekly_reconciliations wr LEFT JOIN users u ON wr.reconciled_by=u.id WHERE wr.id=?',
      [req.params.id]
    ) as any[];
    const rec = (rows as any[])[0];
    if (!rec) { res.status(404).json({ error: 'Not found' }); return; }

    // Fetch ledger entries for the week
    const [entries] = await pool.query(`
      SELECT g.*, u.name AS entered_by_name
      FROM general_ledger_entries g
      LEFT JOIN users u ON g.entered_by = u.id
      WHERE g.entry_date BETWEEN ? AND ?
      ORDER BY g.entry_date ASC, g.id ASC
    `, [rec.week_start_date, rec.week_end_date]) as any[];

    // Fetch daily cash counts for the week
    const [cashCounts] = await pool.query(`
      SELECT d.*, u.name AS kasir_name
      FROM daily_cash_counts d
      LEFT JOIN users u ON d.kasir_id = u.id
      WHERE d.count_date BETWEEN ? AND ?
      ORDER BY d.count_date ASC
    `, [rec.week_start_date, rec.week_end_date]) as any[];

    res.json({ ...rec, ledger_entries: entries, cash_counts: cashCounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST complete reconciliation (mark all entries as reconciled)
router.post('/:id/complete', authenticate, requireRole('finance_manager'), async (req: Request, res: Response) => {
  const { discrepancy_notes } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM weekly_reconciliations WHERE id=?', [req.params.id]) as any[];
    const rec = (rows as any[])[0];
    if (!rec) { res.status(404).json({ error: 'Not found' }); return; }

    // Mark all ledger entries in this week as reconciled
    await pool.query(`
      UPDATE general_ledger_entries SET is_reconciled=TRUE, reconciled_by=?, reconciled_at=NOW()
      WHERE entry_date BETWEEN ? AND ? AND is_reconciled=FALSE
    `, [req.user!.id, rec.week_start_date, rec.week_end_date]);

    await pool.query(`
      UPDATE weekly_reconciliations SET status='completed', completed_at=NOW(), discrepancy_notes=? WHERE id=?
    `, [discrepancy_notes || null, req.params.id]);

    res.json({ message: 'Reconciliation completed. All ledger entries marked as reconciled.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
