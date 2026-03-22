import { Router, Request, Response } from 'express';

export const router = Router();

const transactions = [
  { id: 1, description: 'Salary Deposit', amount: 6200.00, type: 'income', date: '2026-03-15', category: 'Income', account: 'Business Checking' },
  { id: 2, description: 'Office Rent', amount: -2400.00, type: 'expense', date: '2026-03-14', category: 'Housing', account: 'Business Checking' },
  { id: 3, description: 'AWS Services', amount: -320.50, type: 'expense', date: '2026-03-13', category: 'Technology', account: 'Business Checking' },
  { id: 4, description: 'Client Payment - Acme Corp', amount: 4500.00, type: 'income', date: '2026-03-12', category: 'Income', account: 'Business Checking' },
  { id: 5, description: 'Team Lunch', amount: -185.00, type: 'expense', date: '2026-03-11', category: 'Food', account: 'Business Checking' },
  { id: 6, description: 'Software Subscriptions', amount: -450.00, type: 'expense', date: '2026-03-10', category: 'Technology', account: 'Business Checking' },
  { id: 7, description: 'Consulting Invoice #108', amount: 3200.00, type: 'income', date: '2026-03-09', category: 'Income', account: 'Business Savings' },
  { id: 8, description: 'Insurance Premium', amount: -620.00, type: 'expense', date: '2026-03-08', category: 'Insurance', account: 'Business Checking' },
  { id: 9, description: 'Marketing Campaign', amount: -1200.00, type: 'expense', date: '2026-03-07', category: 'Marketing', account: 'Business Checking' },
  { id: 10, description: 'Dividend Payment', amount: 845.25, type: 'income', date: '2026-03-06', category: 'Investments', account: 'Investment Account' },
  { id: 11, description: 'Office Supplies', amount: -234.75, type: 'expense', date: '2026-03-05', category: 'Office', account: 'Business Checking' },
  { id: 12, description: 'Client Retainer - Beta LLC', amount: 2800.00, type: 'income', date: '2026-03-04', category: 'Income', account: 'Business Checking' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json(transactions);
});

router.get('/:id', (req: Request, res: Response) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  if (!transaction) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json(transaction);
});
