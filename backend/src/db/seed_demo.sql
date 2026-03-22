-- ============================================================
-- DEMO SEED DATA — Finance App Fairventures
-- Showcases all capabilities, whole numbers only
-- ============================================================
USE finance_db;

-- ============================================================
-- Reset demo data (keep users + opening balance GL)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE weekly_reconciliations;
TRUNCATE TABLE stock_checks;
TRUNCATE TABLE daily_cash_counts;
TRUNCATE TABLE commodity_purchases;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE payment_request_approvals;
TRUNCATE TABLE payment_request_documents;
TRUNCATE TABLE ebanking_transactions;
DELETE FROM general_ledger_entries WHERE entry_number NOT IN ('0', '1');
DELETE FROM payment_requests;
SET FOREIGN_KEY_CHECKS = 1;

-- Fix opening balances to whole numbers
UPDATE general_ledger_entries SET
  snbs_mandiri_cash_in = 274350000,
  cash_injection = 92128000,
  snbs_mandiri_balance = 80000000,
  kups_bni_balance = 0,
  cash_on_hand_balance = 600000,
  daily_balance_snbs_mandiri = 80000000,
  daily_balance_kups_bni = 0,
  daily_count_cash_on_hand = 600000
WHERE entry_number IN ('0', '1');

-- ============================================================
-- PAYMENT REQUESTS (6 statuses showcased)
-- ============================================================
INSERT INTO payment_requests
  (id, reference_number, submitted_by, submission_deadline, period_start, period_end,
   estimated_fund_needs, previous_fund_released, previous_fund_used, previous_fund_remaining,
   notes, status, submitted_at, rejection_notes, created_at)
VALUES
-- 1. Draft — PM belum submit
(1, 'PR-2026-0001', 4, '2026-01-06 12:00:00', '2026-01-06', '2026-01-12',
 25000000, 0, 0, 0,
 'Pembelian komoditas periode minggu pertama Januari', 'draft',
 NULL, NULL, '2026-01-04 09:00:00'),

-- 2. Submitted — Menunggu review Finance Manager
(2, 'PR-2026-0002', 4, '2026-01-13 12:00:00', '2026-01-13', '2026-01-19',
 18000000, 15000000, 13500000, 1500000,
 'Dana operasional lapangan minggu kedua, sisa dana sebelumnya Rp1.500.000', 'submitted',
 '2026-01-11 10:30:00', NULL, '2026-01-10 14:00:00'),

-- 3. Finance Approved — Menunggu CEO
(3, 'PR-2026-0003', 4, '2026-01-20 12:00:00', '2026-01-20', '2026-01-26',
 30000000, 18000000, 16000000, 2000000,
 'Dana pembelian komoditas skala besar minggu ketiga', 'finance_approved',
 '2026-01-18 09:00:00', NULL, '2026-01-17 11:00:00'),

-- 4. CEO Approved — Menunggu proses E-Banking
(4, 'PR-2026-0004', 4, '2026-01-27 12:00:00', '2026-01-27', '2026-02-02',
 20000000, 30000000, 28000000, 2000000,
 'Penambahan stok komoditas akhir Januari', 'ceo_approved',
 '2026-01-25 08:00:00', NULL, '2026-01-24 15:00:00'),

-- 5. Rejected — Ditolak Finance
(5, 'PR-2026-0005', 4, '2026-02-03 12:00:00', '2026-02-03', '2026-02-09',
 22000000, 20000000, 20000000, 0,
 'Pembelian komoditas awal Februari', 'rejected',
 '2026-02-01 10:00:00', 'Dokumen proforma invoice tidak sesuai spesifikasi. Harap revisi dan ajukan ulang.', '2026-02-01 08:00:00'),

-- 6. Completed — Full cycle selesai
(6, 'PR-2026-0006', 4, '2026-02-10 12:00:00', '2026-02-10', '2026-02-16',
 15000000, 22000000, 20000000, 2000000,
 'Dana operasional lapangan minggu kedua Februari - sudah selesai diproses', 'completed',
 '2026-02-08 09:30:00', NULL, '2026-02-07 16:00:00');

-- ============================================================
-- PAYMENT REQUEST DOCUMENTS
-- ============================================================
INSERT INTO payment_request_documents
  (payment_request_id, document_type, file_name, file_path, uploaded_by, uploaded_at)
VALUES
-- PR-2026-0002 (submitted) — 4 dokumen
(2, 'proforma_invoice',            'Proforma_Invoice_PR0002.pdf',          'uploads/payment-request-docs/demo-pr2-proforma.pdf',       4, '2026-01-11 09:00:00'),
(2, 'fund_estimate',               'Estimasi_Dana_PR0002.pdf',             'uploads/payment-request-docs/demo-pr2-estimate.pdf',        4, '2026-01-11 09:05:00'),
(2, 'commodity_recap',             'Rekap_Komoditas_PR0002.xlsx',          'uploads/payment-request-docs/demo-pr2-rekap.xlsx',          4, '2026-01-11 09:10:00'),
(2, 'previous_fund_usage_report',  'Laporan_Penggunaan_Dana_PR0002.pdf',   'uploads/payment-request-docs/demo-pr2-report.pdf',          4, '2026-01-11 09:15:00'),

-- PR-2026-0003 (finance_approved) — 4 dokumen
(3, 'proforma_invoice',            'Proforma_Invoice_PR0003.pdf',          'uploads/payment-request-docs/demo-pr3-proforma.pdf',       4, '2026-01-18 08:00:00'),
(3, 'fund_estimate',               'Estimasi_Dana_PR0003.pdf',             'uploads/payment-request-docs/demo-pr3-estimate.pdf',        4, '2026-01-18 08:05:00'),
(3, 'commodity_recap',             'Rekap_Komoditas_PR0003.xlsx',          'uploads/payment-request-docs/demo-pr3-rekap.xlsx',          4, '2026-01-18 08:10:00'),
(3, 'previous_fund_usage_report',  'Laporan_Penggunaan_Dana_PR0003.pdf',   'uploads/payment-request-docs/demo-pr3-report.pdf',          4, '2026-01-18 08:15:00'),

-- PR-2026-0004 (ceo_approved) — 4 dokumen
(4, 'proforma_invoice',            'Proforma_Invoice_PR0004.pdf',          'uploads/payment-request-docs/demo-pr4-proforma.pdf',       4, '2026-01-25 07:30:00'),
(4, 'fund_estimate',               'Estimasi_Dana_PR0004.pdf',             'uploads/payment-request-docs/demo-pr4-estimate.pdf',        4, '2026-01-25 07:35:00'),
(4, 'commodity_recap',             'Rekap_Komoditas_PR0004.xlsx',          'uploads/payment-request-docs/demo-pr4-rekap.xlsx',          4, '2026-01-25 07:40:00'),
(4, 'previous_fund_usage_report',  'Laporan_Penggunaan_Dana_PR0004.pdf',   'uploads/payment-request-docs/demo-pr4-report.pdf',          4, '2026-01-25 07:45:00'),

-- PR-2026-0005 (rejected) — 4 dokumen (sudah diupload tapi ditolak)
(5, 'proforma_invoice',            'Proforma_Invoice_PR0005_v1.pdf',       'uploads/payment-request-docs/demo-pr5-proforma.pdf',       4, '2026-02-01 07:00:00'),
(5, 'fund_estimate',               'Estimasi_Dana_PR0005.pdf',             'uploads/payment-request-docs/demo-pr5-estimate.pdf',        4, '2026-02-01 07:05:00'),
(5, 'commodity_recap',             'Rekap_Komoditas_PR0005.xlsx',          'uploads/payment-request-docs/demo-pr5-rekap.xlsx',          4, '2026-02-01 07:10:00'),
(5, 'previous_fund_usage_report',  'Laporan_Penggunaan_Dana_PR0005.pdf',   'uploads/payment-request-docs/demo-pr5-report.pdf',          4, '2026-02-01 07:15:00'),

-- PR-2026-0006 (completed) — 4 dokumen
(6, 'proforma_invoice',            'Proforma_Invoice_PR0006.pdf',          'uploads/payment-request-docs/demo-pr6-proforma.pdf',       4, '2026-02-08 08:00:00'),
(6, 'fund_estimate',               'Estimasi_Dana_PR0006.pdf',             'uploads/payment-request-docs/demo-pr6-estimate.pdf',        4, '2026-02-08 08:05:00'),
(6, 'commodity_recap',             'Rekap_Komoditas_PR0006.xlsx',          'uploads/payment-request-docs/demo-pr6-rekap.xlsx',          4, '2026-02-08 08:10:00'),
(6, 'previous_fund_usage_report',  'Laporan_Penggunaan_Dana_PR0006.pdf',   'uploads/payment-request-docs/demo-pr6-report.pdf',          4, '2026-02-08 08:15:00');

-- ============================================================
-- PAYMENT REQUEST APPROVALS
-- ============================================================
INSERT INTO payment_request_approvals
  (payment_request_id, approver_id, approval_stage, decision, notes, decided_at)
VALUES
-- PR-3: Finance approved
(3, 2, 'finance_validation', 'approved', 'Dokumen lengkap dan valid. Dana disetujui untuk diproses.', '2026-01-19 10:00:00'),

-- PR-4: Finance + CEO approved
(4, 2, 'finance_validation', 'approved', 'Dokumen sesuai. Estimasi dana wajar.', '2026-01-26 09:00:00'),
(4, 1, 'ceo_approval',       'approved', 'Disetujui. Mohon segera proses transfer.', '2026-01-27 11:00:00'),

-- PR-5: Finance rejected
(5, 2, 'finance_validation', 'rejected', 'Dokumen proforma invoice tidak sesuai spesifikasi. Harap revisi dan ajukan ulang.', '2026-02-02 14:00:00'),

-- PR-6: Finance + CEO approved (completed)
(6, 2, 'finance_validation', 'approved', 'Semua dokumen valid.', '2026-02-09 09:00:00'),
(6, 1, 'ceo_approval',       'approved', 'Disetujui penuh.', '2026-02-09 14:00:00');

-- ============================================================
-- E-BANKING TRANSACTIONS (5 status levels)
-- ============================================================
INSERT INTO ebanking_transactions
  (transaction_reference, payment_request_id, source_account, destination_type,
   destination_detail, amount, transaction_cost, transaction_date, transaction_time,
   maker_id, approver_id, ceo_approver_id,
   maker_status, approver_status, ceo_status,
   transfer_proof_path, transfer_proof_archived_at, archived_by,
   notes, created_at)
VALUES
-- 1. Selesai diarsipkan — PR-6 (completed)
('ET-2026-0001', 6, 'snbs_mandiri', 'cash_on_hand',
 NULL, 15000000, 7500, '2026-02-10', '09:15:00',
 3, 2, 1,
 'submitted', 'approved', 'approved',
 'uploads/transfer-proofs/demo-et1-bukti.pdf', '2026-02-10 11:00:00', 3,
 'Transfer dana operasional lapangan PR-2026-0006', '2026-02-09 15:00:00'),

-- 2. CEO Approved, belum diarsipkan — PR-4
('ET-2026-0002', 4, 'snbs_mandiri', 'cash_on_hand',
 NULL, 20000000, 7500, '2026-01-28', '10:00:00',
 3, 2, 1,
 'submitted', 'approved', 'approved',
 NULL, NULL, NULL,
 'Transfer dana pembelian komoditas akhir Januari PR-2026-0004', '2026-01-27 13:00:00'),

-- 3. Finance Approved, menunggu CEO
('ET-2026-0003', NULL, 'snbs_mandiri', 'kups_bni',
 NULL, 10000000, 5000, '2026-02-12', '08:30:00',
 3, 2, NULL,
 'submitted', 'approved', 'pending',
 NULL, NULL, NULL,
 'Penambahan saldo KUPS BNI untuk operasional', '2026-02-11 14:00:00'),

-- 4. Submitted ke Finance, menunggu review
('ET-2026-0004', NULL, 'kups_bni', 'cash_on_hand',
 NULL, 8000000, 5000, '2026-02-18', '09:00:00',
 3, NULL, NULL,
 'submitted', 'pending', 'pending',
 NULL, NULL, NULL,
 'Pencairan kas dari KUPS BNI untuk pembelian lapangan', '2026-02-17 16:00:00'),

-- 5. Draft — belum disubmit
('ET-2026-0005', NULL, 'snbs_mandiri', 'external',
 'Rekening Supplier Agro Makmur - BCA 1234567890', 5000000, 10000, '2026-02-20', '10:00:00',
 3, NULL, NULL,
 'draft', 'pending', 'pending',
 NULL, NULL, NULL,
 'Pembayaran supplier benih', '2026-02-19 11:00:00');

-- ============================================================
-- GENERAL LEDGER ENTRIES (tracking running balances)
-- Opening: SNBS=80.000.000 | KUPS=0 | Cash=600.000
-- ============================================================
INSERT INTO general_ledger_entries
  (entry_number, year, month, entry_date, receipt_reference, source_description,
   to_snbs_mandiri, snbs_mandiri_transaction_cost,
   to_kups_bni, kups_bni_transaction_cost,
   to_cash_on_hand, to_profit_sharing_kups, cash_injection,
   snbs_mandiri_cash_in, snbs_mandiri_cash_out, snbs_mandiri_balance,
   kups_bni_cash_in, kups_bni_cash_out, kups_bni_balance,
   cash_on_hand_cash_in, cash_on_hand_cash_out, cash_on_hand_balance,
   daily_balance_snbs_mandiri, daily_balance_kups_bni, daily_count_cash_on_hand,
   ebanking_transaction_id, entered_by, entry_type, is_reconciled)
VALUES
-- Entry 2: Jan 5 — Dana PR-6 cair ke kas (ET-2026-0001, tapi timeline demo pakai Feb)
-- Entry 2: Jan 5 — Cash Injection masuk SNBS dari Direct Selling
('2', 2026, 1, '2026-01-05', 'DS-2026-001', 'Direct Selling via KUPS - Penerimaan Hasil Penjualan',
 0,0, 0,0, 0,0, 50000000,
 50000000, 0, 130000000,
 0, 0, 0,
 0, 0, 600000,
 130000000, 0, 600000,
 NULL, 3, 'cash_deposit', TRUE),

-- Entry 3: Jan 8 — Transfer SNBS → Kas lapangan (PR-2026-0001)
('3', 2026, 1, '2026-01-08', 'ET-2026-REF-01', 'Transfer Dana Operasional - PR-2026-0001',
 0,0, 0,0, 25000000,0,0,
 0, 25000000, 105000000,
 0, 0, 0,
 25000000, 0, 25600000,
 105000000, 0, 25600000,
 NULL, 3, 'cash_withdrawal', TRUE),

-- Entry 4: Jan 13 — Pembelian komoditas (kas keluar)
('4', 2026, 1, '2026-01-13', 'KWT-2026-001', 'Pembelian Komoditas - Kakao 500kg @Rp40.000',
 0,0, 0,0, 0,0,0,
 0, 0, 105000000,
 0, 0, 0,
 0, 20000000, 5600000,
 105000000, 0, 5600000,
 NULL, 3, 'commodity_purchase', TRUE),

-- Entry 5: Jan 15 — Transfer SNBS → KUPS BNI
('5', 2026, 1, '2026-01-15', 'ET-2026-REF-02', 'Transfer SNBS Mandiri ke KUPS BNI',
 0,0, 10000000,5000, 0,0,0,
 0, 10005000, 94995000,
 10000000, 0, 10000000,
 0, 0, 5600000,
 94995000, 10000000, 5600000,
 NULL, 3, 'bank_transfer', TRUE),

-- Entry 6: Jan 18 — Dana PR-2026-0002 cair ke kas
('6', 2026, 1, '2026-01-18', 'ET-2026-REF-03', 'Transfer Dana Operasional - PR-2026-0002',
 0,0, 0,0, 18000000,0,0,
 0, 18000000, 76995000,
 0, 0, 10000000,
 18000000, 0, 23600000,
 76995000, 10000000, 23600000,
 NULL, 3, 'cash_withdrawal', TRUE),

-- Entry 7: Jan 22 — Profit Sharing KUPS
('7', 2026, 1, '2026-01-22', 'PS-2026-001', 'Bagi Hasil KUPS BNI Triwulan IV 2025',
 0,0, 0,0, 0, 3000000,0,
 0, 0, 76995000,
 0, 3000000, 7000000,
 0, 0, 23600000,
 76995000, 7000000, 23600000,
 NULL, 3, 'profit_sharing', TRUE),

-- Entry 8: Jan 25 — Pembelian komoditas besar
('8', 2026, 1, '2026-01-25', 'KWT-2026-002', 'Pembelian Komoditas - Kopi Robusta 800kg @Rp35.000',
 0,0, 0,0, 0,0,0,
 0, 0, 76995000,
 0, 0, 7000000,
 0, 28000000, -4400000,
 76995000, 7000000, -4400000,
 NULL, 3, 'commodity_purchase', FALSE),

-- Koreksi: Kasir setor kas utk nutup minus
('9', 2026, 1, '2026-01-26', 'ADJ-2026-001', 'Penyesuaian - Dana PR-2026-0003 masuk kas',
 0,0, 0,0, 30000000,0,0,
 0, 30000000, 46995000,
 0, 0, 7000000,
 30000000, 0, 25600000,
 46995000, 7000000, 25600000,
 NULL, 3, 'cash_withdrawal', FALSE),

-- Entry 10: Feb 3 — Dana PR-2026-0004 (CEO approved ebanking)
('10', 2026, 2, '2026-02-03', 'ET-2026-REF-04', 'Transfer Dana - PR-2026-0004 (CEO Approved)',
 0,0, 0,0, 20000000,0,0,
 0, 20007500, 26987500,
 0, 0, 7000000,
 20000000, 0, 45600000,
 26987500, 7000000, 45600000,
 2, 3, 'cash_withdrawal', FALSE),

-- Entry 11: Feb 10 — Dana PR-2026-0006 selesai (Completed)
('11', 2026, 2, '2026-02-10', 'ET-2026-0001', 'Transfer Dana Selesai - PR-2026-0006 (Completed)',
 0,0, 0,0, 15000000,0,0,
 0, 15007500, 11980000,
 0, 0, 7000000,
 15000000, 0, 60600000,
 11980000, 7000000, 60600000,
 1, 3, 'cash_withdrawal', FALSE);

-- ============================================================
-- COMMODITY PURCHASES
-- ============================================================
INSERT INTO commodity_purchases
  (purchase_date, payment_request_id, farmer_name, farmer_id_card,
   commodity_type, quantity_kg, price_per_kg, total_amount,
   payment_method, receipt_number, receipt_file_path,
   field_staff_id, kasir_id, verification_status, verified_at, notes, created_at)
VALUES
-- Verified purchases
('2026-01-13', 1, 'Bapak Suharto',    '3201010101010001', 'Kakao',          200, 40000, 8000000,  'cash',          'KWT-2026-001-A', NULL, 6, 5, 'verified', '2026-01-13 16:00:00', 'Kualitas grade A, kadar air 7%',             '2026-01-13 10:00:00'),
('2026-01-13', 1, 'Ibu Sumiati',      '3201010101010002', 'Kakao',          300, 40000, 12000000, 'cash',          'KWT-2026-001-B', NULL, 6, 5, 'verified', '2026-01-13 16:30:00', 'Kualitas grade B, kadar air 8%',             '2026-01-13 11:00:00'),
('2026-01-25', 2, 'Bapak Rajiman',    '3201010101010003', 'Kopi Robusta',   400, 35000, 14000000, 'cash',          'KWT-2026-002-A', NULL, 6, 5, 'verified', '2026-01-25 17:00:00', 'Biji kering sangrai ringan',                 '2026-01-25 09:00:00'),
('2026-01-25', 2, 'Bapak Widodo',     '3201010101010004', 'Kopi Robusta',   400, 35000, 14000000, 'cash',          'KWT-2026-002-B', NULL, 6, 5, 'verified', '2026-01-25 17:30:00', 'Biji kering sangrai ringan',                 '2026-01-25 10:00:00'),
('2026-02-03', 4, 'Ibu Kartini',      '3201010101010005', 'Kakao',          350, 42000, 14700000, 'bank_transfer', 'KWT-2026-003-A', NULL, 6, 5, 'verified', '2026-02-04 09:00:00', 'Transfer via BRI, bukti terlampir',          '2026-02-03 08:00:00'),
('2026-02-03', 4, 'Bapak Supriyono',  '3201010101010006', 'Kakao',          150, 42000, 6300000,  'cash',          'KWT-2026-003-B', NULL, 6, 5, 'verified', '2026-02-04 09:30:00', 'Pembelian langsung di kebun',                '2026-02-03 09:00:00'),

-- Pending verification
('2026-02-10', 6, 'Bapak Haryanto',   '3201010101010007', 'Kopi Arabika',   250, 55000, 13750000, 'cash',          'KWT-2026-004-A', NULL, 6, NULL, 'pending', NULL, 'Menunggu verifikasi kasir',                '2026-02-10 09:00:00'),
('2026-02-10', 6, 'Ibu Sulastri',     '3201010101010008', 'Kopi Arabika',   200, 55000, 11000000, 'bank_transfer', 'KWT-2026-004-B', NULL, 6, NULL, 'pending', NULL, 'Menunggu verifikasi kasir',                '2026-02-10 10:00:00'),

-- Disputed
('2026-01-20', NULL, 'Bapak Eko Prasetyo', '3201010101010009', 'Kakao',     100, 38000, 3800000,  'cash',          'KWT-2026-DISP',  NULL, 6, 5, 'disputed', NULL, 'Berat tidak sesuai timbangan kasir, selisih 5kg', '2026-01-20 14:00:00');

-- ============================================================
-- DAILY CASH COUNTS
-- ============================================================
INSERT INTO daily_cash_counts
  (count_date, kasir_id, physical_count, general_ledger_balance,
   discrepancy, discrepancy_notes, status, whatsapp_sent_at, count_completed_at, created_at)
VALUES
('2026-01-08', 5, 25600000,  25600000,  0,        NULL,                                                    'matched',           '2026-01-08 17:30:00', '2026-01-08 17:00:00', '2026-01-08 17:00:00'),
('2026-01-13', 5, 5500000,   5600000,   -100000,  'Selisih Rp100.000 - kemungkinan uang kembalian',        'discrepancy_noted', '2026-01-13 17:45:00', '2026-01-13 17:30:00', '2026-01-13 17:30:00'),
('2026-01-15', 5, 5600000,   5600000,   0,        NULL,                                                    'matched',           '2026-01-15 17:20:00', '2026-01-15 17:00:00', '2026-01-15 17:00:00'),
('2026-01-18', 5, 23600000,  23600000,  0,        NULL,                                                    'matched',           '2026-01-18 17:15:00', '2026-01-18 17:00:00', '2026-01-18 17:00:00'),
('2026-01-22', 5, 23600000,  23600000,  0,        NULL,                                                    'matched',           '2026-01-22 17:10:00', '2026-01-22 17:00:00', '2026-01-22 17:00:00'),
('2026-01-25', 5, -4400000,  -4400000,  0,        'Saldo negatif sementara, dana PR-0003 belum masuk',     'discrepancy_noted', '2026-01-25 17:30:00', '2026-01-25 17:00:00', '2026-01-25 17:00:00'),
('2026-01-26', 5, 25600000,  25600000,  0,        NULL,                                                    'resolved',          '2026-01-26 17:00:00', '2026-01-26 16:45:00', '2026-01-26 16:45:00'),
('2026-02-03', 5, 45600000,  45600000,  0,        NULL,                                                    'matched',           '2026-02-03 17:10:00', '2026-02-03 17:00:00', '2026-02-03 17:00:00'),
('2026-02-10', 5, 61000000,  60600000,  400000,   'Selisih Rp400.000 - sedang investigasi',                'discrepancy_noted', '2026-02-10 17:45:00', '2026-02-10 17:30:00', '2026-02-10 17:30:00');

-- ============================================================
-- STOCK CHECKS
-- ============================================================
INSERT INTO stock_checks
  (check_date, checked_by, commodity_type,
   actual_quantity_kg, expected_quantity_kg, discrepancy_kg,
   notes, status, created_at)
VALUES
('2026-01-10', 4, 'Kakao',        450, 450,  0,    'Stok kakao awal Januari, kondisi baik semua',                    'submitted', '2026-01-10 14:00:00'),
('2026-01-17', 4, 'Kakao',        250, 250,  0,    'Penurunan stok 200kg setelah pengiriman ke gudang pusat',        'submitted', '2026-01-17 14:30:00'),
('2026-01-17', 4, 'Kopi Robusta', 780, 800, -20,   'Stok kopi masuk 800kg, keluar 20kg sampel - selisih wajar',      'reviewed',  '2026-01-17 14:45:00'),
('2026-01-24', 4, 'Kakao',        200, 250, -50,   'Stok turun akibat penjualan 50kg ke pengepul',                   'submitted', '2026-01-24 15:00:00'),
('2026-01-24', 4, 'Kopi Robusta', 750, 780, -30,   'Penyusutan alami 30kg, kualitas terjaga',                        'submitted', '2026-01-24 15:15:00'),
('2026-01-31', 4, 'Kakao',        530, 530,  0,    'Penambahan stok 330kg dari pembelian, semua sesuai',             'reviewed',  '2026-01-31 15:00:00'),
('2026-01-31', 4, 'Kopi Robusta', 730, 750, -20,   'Penyusutan alami 20kg',                                         'submitted', '2026-01-31 15:15:00'),
('2026-02-07', 4, 'Kopi Arabika',   0,   0,  0,    'Stok awal kopi arabika, belum masuk - menunggu pembelian',       'draft',     '2026-02-07 14:00:00');

-- ============================================================
-- WEEKLY RECONCILIATIONS
-- ============================================================
INSERT INTO weekly_reconciliations
  (week_start_date, week_end_date, reconciled_by,
   total_cash_in, total_cash_out,
   total_bank_in_snbs, total_bank_out_snbs,
   total_bank_in_kups, total_bank_out_kups,
   final_cash_balance, final_snbs_balance, final_kups_balance,
   discrepancy_found, discrepancy_notes, status, completed_at, created_at)
VALUES
-- Minggu 1: Jan 6-10 (selesai)
('2026-01-06', '2026-01-10', 2,
 25000000, 0,
 50000000, 25000000,
 0, 0,
 25600000, 105000000, 0,
 FALSE, NULL, 'completed', '2026-01-10 18:00:00', '2026-01-10 17:00:00'),

-- Minggu 2: Jan 13-17 (ada discrepancy)
('2026-01-13', '2026-01-17', 2,
 18000000, 20000000,
 0, 10005000,
 10000000, 0,
 5600000, 94995000, 10000000,
 TRUE, 'Selisih kas Rp100.000 pada tanggal 13 Januari belum diselesaikan', 'flagged', '2026-01-17 18:00:00', '2026-01-17 17:00:00'),

-- Minggu 3: Jan 20-24 (selesai)
('2026-01-20', '2026-01-24', 2,
 30000000, 28000000,
 0, 0,
 0, 3000000,
 25600000, 76995000, 7000000,
 FALSE, NULL, 'completed', '2026-01-24 18:00:00', '2026-01-24 17:00:00'),

-- Minggu 4: Jan 27-31 (draft — baru dibuat)
('2026-01-27', '2026-01-31', 2,
 20000000, 20000000,
 0, 20007500,
 0, 0,
 25600000, 46995000, 7000000,
 FALSE, NULL, 'draft', NULL, '2026-02-03 09:00:00');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
INSERT INTO notifications
  (recipient_id, title, body, type, reference_type, reference_id, is_read, created_at)
VALUES
-- CEO
(1, 'Persetujuan CEO Diperlukan', 'PR-2026-0003 telah disetujui Finance Manager dan menunggu persetujuan CEO.',  'approval_needed',     'payment_request', 3, TRUE,  '2026-01-19 10:05:00'),
(1, 'Persetujuan CEO Diperlukan', 'PR-2026-0004 telah disetujui Finance Manager dan menunggu persetujuan CEO.',  'approval_needed',     'payment_request', 4, TRUE,  '2026-01-26 09:05:00'),
(1, 'Persetujuan CEO Diperlukan', 'Transaksi E-Banking ET-2026-0003 menunggu persetujuan CEO.',                  'approval_needed',     'ebanking',        3, FALSE, '2026-02-11 14:05:00'),
(1, 'Persetujuan CEO Diperlukan', 'PR-2026-0006 telah disetujui Finance Manager dan menunggu persetujuan CEO.',  'approval_needed',     'payment_request', 6, TRUE,  '2026-02-09 09:05:00'),

-- Finance Manager
(2, 'Payment Request Baru',       'PR-2026-0002 telah diajukan oleh Project Manager dan menunggu validasi.',     'payment_request',     'payment_request', 2, TRUE,  '2026-01-11 10:35:00'),
(2, 'Payment Request Baru',       'PR-2026-0003 telah diajukan dan menunggu validasi Finance Manager.',          'payment_request',     'payment_request', 3, TRUE,  '2026-01-18 09:05:00'),
(2, 'Rekonsiliasi Flagged',       'Rekonsiliasi minggu 13-17 Januari ditandai discrepancy. Harap tinjau.',       'reconciliation',      NULL,              NULL, FALSE, '2026-01-17 18:05:00'),
(2, 'Payment Request Baru',       'PR-2026-0005 telah diajukan dan menunggu validasi Finance Manager.',          'payment_request',     'payment_request', 5, TRUE,  '2026-02-01 10:05:00'),
(2, 'Payment Request Baru',       'PR-2026-0006 telah diajukan dan menunggu validasi Finance Manager.',          'payment_request',     'payment_request', 6, TRUE,  '2026-02-08 09:35:00'),
(2, 'E-Banking Baru',             'Transaksi ET-2026-0004 disubmit Staff Keuangan dan menunggu persetujuan.',   'approval_needed',     'ebanking',        4, FALSE, '2026-02-17 16:05:00'),

-- Project Manager
(4, 'PR Disetujui Finance',       'PR-2026-0003 telah disetujui Finance Manager. Menunggu persetujuan CEO.',    'approval_needed',     'payment_request', 3, TRUE,  '2026-01-19 10:10:00'),
(4, 'PR Disetujui CEO',           'PR-2026-0004 telah disetujui CEO. Proses E-Banking sedang berjalan.',        'payment_request',     'payment_request', 4, TRUE,  '2026-01-27 11:05:00'),
(4, 'PR Ditolak',                 'PR-2026-0005 ditolak oleh Finance Manager. Cek detail untuk alasan penolakan.','payment_request',   'payment_request', 5, FALSE, '2026-02-02 14:05:00'),
(4, 'PR Selesai',                 'PR-2026-0006 telah selesai diproses. Dana telah dicairkan.',                  'payment_request',     'payment_request', 6, FALSE, '2026-02-10 11:05:00'),
(4, 'Deadline Pengajuan',         'Deadline pengajuan PR adalah Senin 17 Feb 2026 pukul 12.00 WIB.',            'deadline_reminder',   NULL,              NULL, FALSE, '2026-02-14 08:00:00'),

-- Kasir
(5, 'Pembelian Perlu Verifikasi', 'Ada 2 pembelian komoditas baru dari Staff Lapangan menunggu verifikasi.',    'cash_alert',          NULL,              NULL, FALSE, '2026-02-10 10:05:00'),
(5, 'Rekap WhatsApp',             'Jangan lupa kirim rekap kas harian sebelum pukul 18.00 hari ini.',           'whatsapp_reminder',   NULL,              NULL, TRUE,  '2026-02-10 17:00:00'),
(5, 'Selisih Kas Terdeteksi',     'Hitung kas 10 Feb menunjukkan selisih Rp400.000. Harap investigasi.',        'cash_alert',          NULL,              NULL, FALSE, '2026-02-10 17:50:00'),

-- Staff Keuangan
(3, 'Transaksi Perlu Diarsipkan', 'ET-2026-0002 telah disetujui CEO. Harap upload bukti transfer dan arsipkan.','approval_needed',    'ebanking',        2, FALSE, '2026-01-27 11:10:00'),
(3, 'Transaksi Selesai Diarsipkan','ET-2026-0001 berhasil diarsipkan dan buku besar telah diperbarui.',         'payment_request',    'ebanking',        1, TRUE,  '2026-02-10 11:05:00'),

-- Staff Lapangan
(6, 'Pembelian Terverifikasi',    'Pembelian KWT-2026-003-A dan 003-B telah diverifikasi oleh Kasir.',          'cash_alert',          NULL,              NULL, TRUE,  '2026-02-04 09:35:00');
