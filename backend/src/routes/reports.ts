import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

export const router = Router();

// GET available years from GL entries
router.get('/years', authenticate, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT year FROM general_ledger_entries ORDER BY year DESC'
    ) as any[];
    res.json((rows as any[]).map((r: any) => r.year));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET report summary data
router.get('/summary', authenticate, requireRole('finance_manager', 'ceo'), async (req: Request, res: Response) => {
  const { year, month } = req.query;
  if (!year) { res.status(400).json({ error: 'year is required' }); return; }
  try {
    const params: any[] = [year];
    let monthFilter = '';
    if (month) { monthFilter = 'AND month = ?'; params.push(month); }

    // GL aggregates
    const [glRows] = await pool.query(`
      SELECT
        SUM(snbs_mandiri_cash_in)   AS total_snbs_in,
        SUM(snbs_mandiri_cash_out)  AS total_snbs_out,
        SUM(kups_bni_cash_in)       AS total_kups_in,
        SUM(kups_bni_cash_out)      AS total_kups_out,
        SUM(cash_on_hand_cash_in)   AS total_cash_in,
        SUM(cash_on_hand_cash_out)  AS total_cash_out,
        SUM(cash_injection)         AS total_injection,
        SUM(to_profit_sharing_kups) AS total_profit_sharing,
        MAX(snbs_mandiri_balance)   AS latest_snbs,
        MAX(kups_bni_balance)       AS latest_kups,
        MAX(cash_on_hand_balance)   AS latest_cash
      FROM general_ledger_entries
      WHERE year = ? ${monthFilter}
    `, params) as any[];

    // Commodity purchases
    const [cpRows] = await pool.query(`
      SELECT
        COUNT(*)                      AS total_transactions,
        SUM(total_amount)             AS total_spent,
        SUM(quantity_kg)              AS total_kg,
        COUNT(DISTINCT commodity_type) AS commodity_types
      FROM commodity_purchases
      WHERE YEAR(purchase_date) = ? ${month ? 'AND MONTH(purchase_date) = ?' : ''}
    `, month ? [year, month] : [year]) as any[];

    // Payment requests
    const [prRows] = await pool.query(`
      SELECT status, COUNT(*) AS cnt, SUM(estimated_fund_needs) AS total
      FROM payment_requests
      WHERE YEAR(created_at) = ? ${month ? 'AND MONTH(created_at) = ?' : ''}
      GROUP BY status
    `, month ? [year, month] : [year]) as any[];

    // Monthly GL breakdown for chart
    const [monthlyRows] = await pool.query(`
      SELECT month,
        SUM(cash_on_hand_cash_in)  AS cash_in,
        SUM(cash_on_hand_cash_out) AS cash_out,
        SUM(snbs_mandiri_cash_in)  AS bank_in,
        SUM(snbs_mandiri_cash_out) AS bank_out
      FROM general_ledger_entries
      WHERE year = ?
      GROUP BY month ORDER BY month
    `, [year]) as any[];

    const gl = (glRows as any[])[0];
    const cp = (cpRows as any[])[0];

    res.json({
      gl,
      commodity: cp,
      paymentRequests: prRows,
      monthlyBreakdown: monthlyRows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET CSV download
router.get('/download/:type', authenticate, requireRole('finance_manager', 'ceo'), async (req: Request, res: Response) => {
  const { year, month } = req.query;
  const { type } = req.params;
  if (!year) { res.status(400).json({ error: 'year is required' }); return; }

  try {
    let csv = '';
    const params: any[] = [year];
    const monthFilter = month ? 'AND month = ?' : '';
    if (month) params.push(month);

    if (type === 'general-ledger') {
      const [rows] = await pool.query(`
        SELECT entry_number, entry_date, source_description, receipt_reference,
          snbs_mandiri_cash_in, snbs_mandiri_cash_out, snbs_mandiri_balance,
          kups_bni_cash_in, kups_bni_cash_out, kups_bni_balance,
          cash_on_hand_cash_in, cash_on_hand_cash_out, cash_on_hand_balance,
          cash_injection, to_profit_sharing_kups, entry_type
        FROM general_ledger_entries
        WHERE year = ? ${monthFilter}
        ORDER BY entry_date, id
      `, params) as any[];
      const data = rows as any[];
      csv = 'No,Tanggal,Keterangan,Bukti,SNBS In,SNBS Out,Saldo SNBS,BNI In,BNI Out,Saldo BNI,Kas In,Kas Out,Saldo Kas,Cash Injection,Profit KUPS,Jenis\n';
      csv += data.map(r =>
        [r.entry_number, r.entry_date, `"${r.source_description || ''}"`, r.receipt_reference || '',
         r.snbs_mandiri_cash_in, r.snbs_mandiri_cash_out, r.snbs_mandiri_balance,
         r.kups_bni_cash_in, r.kups_bni_cash_out, r.kups_bni_balance,
         r.cash_on_hand_cash_in, r.cash_on_hand_cash_out, r.cash_on_hand_balance,
         r.cash_injection, r.to_profit_sharing_kups, r.entry_type].join(',')
      ).join('\n');

    } else if (type === 'payment-requests') {
      const [rows] = await pool.query(`
        SELECT pr.reference_number, u.name as submitted_by, pr.period_start, pr.period_end,
          pr.estimated_fund_needs, pr.previous_fund_released, pr.previous_fund_used,
          pr.previous_fund_remaining, pr.status, pr.submitted_at, pr.notes
        FROM payment_requests pr
        LEFT JOIN users u ON pr.submitted_by = u.id
        WHERE YEAR(pr.created_at) = ? ${month ? 'AND MONTH(pr.created_at) = ?' : ''}
        ORDER BY pr.created_at
      `, month ? [year, month] : [year]) as any[];
      const data = rows as any[];
      csv = 'No Referensi,Diajukan Oleh,Periode Mulai,Periode Akhir,Dana Diajukan,Dana Dilepas,Dana Terpakai,Sisa Dana,Status,Tanggal Submit,Catatan\n';
      csv += data.map(r =>
        [r.reference_number, `"${r.submitted_by}"`, r.period_start, r.period_end,
         r.estimated_fund_needs, r.previous_fund_released, r.previous_fund_used,
         r.previous_fund_remaining, r.status, r.submitted_at || '', `"${r.notes || ''}"`].join(',')
      ).join('\n');

    } else if (type === 'commodity-purchases') {
      const [rows] = await pool.query(`
        SELECT cp.purchase_date, cp.farmer_name, cp.commodity_type,
          cp.quantity_kg, cp.price_per_kg, cp.total_amount,
          cp.payment_method, cp.receipt_number, cp.verification_status,
          u1.name as field_staff, u2.name as kasir
        FROM commodity_purchases cp
        LEFT JOIN users u1 ON cp.field_staff_id = u1.id
        LEFT JOIN users u2 ON cp.kasir_id = u2.id
        WHERE YEAR(cp.purchase_date) = ? ${month ? 'AND MONTH(cp.purchase_date) = ?' : ''}
        ORDER BY cp.purchase_date
      `, month ? [year, month] : [year]) as any[];
      const data = rows as any[];
      csv = 'Tanggal,Nama Petani,Komoditas,Qty (kg),Harga/kg,Total,Metode Bayar,No Kwitansi,Status Verifikasi,Staff Lapangan,Kasir\n';
      csv += data.map(r =>
        [r.purchase_date, `"${r.farmer_name}"`, r.commodity_type,
         r.quantity_kg, r.price_per_kg, r.total_amount,
         r.payment_method, r.receipt_number || '', r.verification_status,
         `"${r.field_staff || ''}"`, `"${r.kasir || ''}"`].join(',')
      ).join('\n');
    } else {
      res.status(400).json({ error: 'Invalid report type' }); return;
    }

    const periodLabel = month ? `${year}-${String(month).padStart(2, '0')}` : year;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-${type}-${periodLabel}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
