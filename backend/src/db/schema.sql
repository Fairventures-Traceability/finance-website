-- ============================================================
-- COOPERATIVE FINANCE SYSTEM - MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS finance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finance_db;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('project_manager','finance_manager','staff_keuangan','ceo','kasir','staff_lapangan') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed users (password: password123)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin CEO', 'ceo@company.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjO', 'ceo'),
('Finance Manager', 'finance@company.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjO', 'finance_manager'),
('Staff Keuangan', 'staff@company.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjO', 'staff_keuangan'),
('Project Manager', 'pm@company.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjO', 'project_manager'),
('Kasir', 'kasir@company.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjO', 'kasir'),
('Staff Lapangan', 'lapangan@company.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjO', 'staff_lapangan');

-- Payment Requests
CREATE TABLE IF NOT EXISTS payment_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(50) NOT NULL UNIQUE,
  submitted_by INT UNSIGNED NOT NULL,
  submission_deadline DATETIME NOT NULL,
  submitted_at DATETIME,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  estimated_fund_needs DECIMAL(18,2) NOT NULL DEFAULT 0,
  previous_fund_released DECIMAL(18,2) DEFAULT 0,
  previous_fund_used DECIMAL(18,2) DEFAULT 0,
  previous_fund_remaining DECIMAL(18,2) DEFAULT 0,
  notes TEXT,
  status ENUM('draft','submitted','finance_review','finance_approved','ceo_approved','rejected','completed') NOT NULL DEFAULT 'draft',
  rejection_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submitted_by) REFERENCES users(id)
);

-- Payment Request Documents
CREATE TABLE IF NOT EXISTS payment_request_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_request_id INT UNSIGNED NOT NULL,
  document_type ENUM('proforma_invoice','fund_estimate','commodity_recap','previous_fund_usage_report','other') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Payment Request Approvals
CREATE TABLE IF NOT EXISTS payment_request_approvals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_request_id INT UNSIGNED NOT NULL,
  approver_id INT UNSIGNED NOT NULL,
  approval_stage ENUM('finance_validation','ebanking_approval','ceo_approval') NOT NULL,
  decision ENUM('approved','rejected','pending') NOT NULL DEFAULT 'pending',
  notes TEXT,
  decided_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id),
  FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- E-Banking Transactions
CREATE TABLE IF NOT EXISTS ebanking_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_request_id INT UNSIGNED,
  transaction_reference VARCHAR(100) UNIQUE,
  source_account ENUM('snbs_mandiri','kups_bni','cash_on_hand','ending_balance','cash_injection','direct_selling_kups') NOT NULL,
  destination_type ENUM('snbs_mandiri','kups_bni','cash_on_hand','profit_sharing_kups','external') NOT NULL,
  destination_detail VARCHAR(255),
  amount DECIMAL(18,2) NOT NULL,
  transaction_cost DECIMAL(18,2) DEFAULT 0,
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  maker_id INT UNSIGNED NOT NULL,
  approver_id INT UNSIGNED,
  ceo_approver_id INT UNSIGNED,
  maker_status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  approver_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ceo_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  transfer_proof_path VARCHAR(500),
  transfer_proof_archived_at DATETIME,
  archived_by INT UNSIGNED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id),
  FOREIGN KEY (maker_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  FOREIGN KEY (ceo_approver_id) REFERENCES users(id),
  FOREIGN KEY (archived_by) REFERENCES users(id)
);

-- General Ledger
CREATE TABLE IF NOT EXISTS general_ledger_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_number VARCHAR(50) NOT NULL UNIQUE,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  entry_date DATE NOT NULL,
  receipt_reference VARCHAR(100),
  source_description VARCHAR(255),
  to_snbs_mandiri DECIMAL(18,2) DEFAULT 0,
  snbs_mandiri_transaction_cost DECIMAL(18,2) DEFAULT 0,
  to_kups_bni DECIMAL(18,2) DEFAULT 0,
  kups_bni_transaction_cost DECIMAL(18,2) DEFAULT 0,
  to_cash_on_hand DECIMAL(18,2) DEFAULT 0,
  to_profit_sharing_kups DECIMAL(18,2) DEFAULT 0,
  cash_injection DECIMAL(18,2) DEFAULT 0,
  snbs_mandiri_cash_in DECIMAL(18,2) DEFAULT 0,
  snbs_mandiri_cash_out DECIMAL(18,2) DEFAULT 0,
  snbs_mandiri_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  kups_bni_cash_in DECIMAL(18,2) DEFAULT 0,
  kups_bni_cash_out DECIMAL(18,2) DEFAULT 0,
  kups_bni_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  cash_on_hand_cash_in DECIMAL(18,2) DEFAULT 0,
  cash_on_hand_cash_out DECIMAL(18,2) DEFAULT 0,
  cash_on_hand_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  daily_balance_snbs_mandiri DECIMAL(18,2),
  daily_balance_kups_bni DECIMAL(18,2),
  daily_count_cash_on_hand DECIMAL(18,2),
  ebanking_transaction_id INT UNSIGNED,
  entered_by INT UNSIGNED NOT NULL,
  entry_type ENUM('bank_transfer','cash_withdrawal','cash_deposit','commodity_purchase','profit_sharing','adjustment','opening_balance') NOT NULL,
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_by INT UNSIGNED,
  reconciled_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ebanking_transaction_id) REFERENCES ebanking_transactions(id),
  FOREIGN KEY (entered_by) REFERENCES users(id),
  FOREIGN KEY (reconciled_by) REFERENCES users(id)
);

-- Seed opening balance (matching your spreadsheet data)
INSERT INTO general_ledger_entries (
  entry_number, year, month, entry_date, source_description,
  snbs_mandiri_balance, kups_bni_balance, cash_on_hand_balance,
  daily_balance_snbs_mandiri, daily_balance_kups_bni, daily_count_cash_on_hand,
  snbs_mandiri_cash_in, cash_injection,
  entered_by, entry_type
) VALUES
('0', 2025, 12, '2025-12-31', 'Opening Balance Dec 31',
  79531184.32, 0, 601210.00,
  79531184.32, 0, 601210.00,
  274350429.00, 92128000.00,
  1, 'opening_balance'),
('1', 2026, 1, '2026-01-01', 'Opening Balance Jan 1',
  79531184.32, 0, 601210.00,
  79531184.32, 0, 601210.00,
  0, 92128000.00,
  1, 'opening_balance');

-- Commodity Purchases
CREATE TABLE IF NOT EXISTS commodity_purchases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_date DATE NOT NULL,
  payment_request_id INT UNSIGNED,
  farmer_name VARCHAR(150) NOT NULL,
  farmer_id_card VARCHAR(50),
  commodity_type VARCHAR(100) NOT NULL,
  quantity_kg DECIMAL(10,3) NOT NULL,
  price_per_kg DECIMAL(18,2) NOT NULL,
  total_amount DECIMAL(18,2) NOT NULL,
  payment_method ENUM('cash','bank_transfer') NOT NULL,
  receipt_number VARCHAR(100),
  receipt_file_path VARCHAR(500),
  field_staff_id INT UNSIGNED NOT NULL,
  kasir_id INT UNSIGNED,
  verification_status ENUM('pending','verified','disputed') NOT NULL DEFAULT 'pending',
  verified_at DATETIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id),
  FOREIGN KEY (field_staff_id) REFERENCES users(id),
  FOREIGN KEY (kasir_id) REFERENCES users(id)
);

-- Daily Cash Counts
CREATE TABLE IF NOT EXISTS daily_cash_counts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  count_date DATE NOT NULL UNIQUE,
  kasir_id INT UNSIGNED NOT NULL,
  physical_count DECIMAL(18,2) NOT NULL,
  general_ledger_balance DECIMAL(18,2) NOT NULL,
  discrepancy DECIMAL(18,2) NOT NULL DEFAULT 0,
  discrepancy_notes TEXT,
  status ENUM('pending','matched','discrepancy_noted','resolved') NOT NULL DEFAULT 'pending',
  whatsapp_sent_at DATETIME,
  whatsapp_sent_by INT UNSIGNED,
  count_completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (kasir_id) REFERENCES users(id),
  FOREIGN KEY (whatsapp_sent_by) REFERENCES users(id)
);

-- Weekly Reconciliations
CREATE TABLE IF NOT EXISTS weekly_reconciliations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  reconciled_by INT UNSIGNED NOT NULL,
  total_cash_in DECIMAL(18,2) DEFAULT 0,
  total_cash_out DECIMAL(18,2) DEFAULT 0,
  total_bank_in_snbs DECIMAL(18,2) DEFAULT 0,
  total_bank_out_snbs DECIMAL(18,2) DEFAULT 0,
  total_bank_in_kups DECIMAL(18,2) DEFAULT 0,
  total_bank_out_kups DECIMAL(18,2) DEFAULT 0,
  final_cash_balance DECIMAL(18,2) DEFAULT 0,
  final_snbs_balance DECIMAL(18,2) DEFAULT 0,
  final_kups_balance DECIMAL(18,2) DEFAULT 0,
  discrepancy_found BOOLEAN DEFAULT FALSE,
  discrepancy_notes TEXT,
  status ENUM('draft','completed','flagged') NOT NULL DEFAULT 'draft',
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reconciled_by) REFERENCES users(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  type ENUM('payment_request','approval_needed','cash_alert','reconciliation','deadline_reminder','whatsapp_reminder') NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT UNSIGNED,
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT UNSIGNED NOT NULL,
  old_value JSON,
  new_value JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
