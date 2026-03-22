import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate } from '../middleware/auth';

export const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user!.role;

    // Current balances
    const [balanceRows] = await pool.query(`
      SELECT snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance, entry_date
      FROM general_ledger_entries ORDER BY entry_date DESC, id DESC LIMIT 1
    `) as any[];
    const bal = (balanceRows as any[])[0] || { snbs_mandiri_balance: 0, kups_bni_balance: 0, cash_on_hand_balance: 0 };

    // Pending payment requests
    const [prRows] = await pool.query(
      "SELECT COUNT(*) as cnt FROM payment_requests WHERE status IN ('submitted','finance_approved')"
    ) as any[];
    const pendingPR = (prRows as any[])[0].cnt;

    // Pending approvals for this role
    let pendingApprovals = 0;
    if (role === 'finance_manager') {
      const [r] = await pool.query("SELECT COUNT(*) as cnt FROM payment_requests WHERE status='submitted'") as any[];
      pendingApprovals = (r as any[])[0].cnt;
    } else if (role === 'ceo') {
      const [r] = await pool.query("SELECT COUNT(*) as cnt FROM payment_requests WHERE status='finance_approved'") as any[];
      pendingApprovals = (r as any[])[0].cnt;
    }

    // Today's cash count
    const today = new Date().toISOString().slice(0, 10);
    const [countRows] = await pool.query(
      'SELECT * FROM daily_cash_counts WHERE count_date = ?', [today]
    ) as any[];
    const todayCashCount = (countRows as any[])[0] || null;

    // Recent ledger entries
    const [recentRows] = await pool.query(`
      SELECT g.entry_date, g.source_description, g.snbs_mandiri_cash_in, g.snbs_mandiri_cash_out,
             g.kups_bni_cash_in, g.kups_bni_cash_out, g.cash_on_hand_cash_in, g.cash_on_hand_cash_out,
             g.entry_type, u.name as entered_by_name
      FROM general_ledger_entries g
      LEFT JOIN users u ON g.entered_by = u.id
      ORDER BY g.entry_date DESC, g.id DESC LIMIT 5
    `) as any[];

    res.json({
      balances: {
        snbs_mandiri: Number(bal.snbs_mandiri_balance),
        kups_bni: Number(bal.kups_bni_balance),
        cash_on_hand: Number(bal.cash_on_hand_balance),
        total: Number(bal.snbs_mandiri_balance) + Number(bal.kups_bni_balance) + Number(bal.cash_on_hand_balance),
        as_of: bal.entry_date,
      },
      pendingPR,
      pendingApprovals,
      todayCashCount,
      recentActivity: recentRows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
