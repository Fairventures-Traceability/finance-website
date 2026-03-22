import express from 'express';
import cors from 'cors';
import path from 'path';
import { router as authRouter } from './routes/auth';
import { router as dashboardRouter } from './routes/dashboard';
import { router as generalLedgerRouter } from './routes/generalLedger';
import { router as paymentRequestsRouter } from './routes/paymentRequests';
import { router as ebankingRouter } from './routes/ebankingTransactions';
import { router as cashRouter } from './routes/cash';
import { router as commodityRouter } from './routes/commodityPurchases';
import { router as stockRouter } from './routes/stockChecks';
import { router as reconciliationRouter } from './routes/reconciliation';
import { router as finalInvoicesRouter } from './routes/finalInvoices';
import { router as notificationsRouter } from './routes/notifications';
import { router as reportsRouter } from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/general-ledger', generalLedgerRouter);
app.use('/api/payment-requests', paymentRequestsRouter);
app.use('/api/ebanking', ebankingRouter);
app.use('/api/cash', cashRouter);
app.use('/api/commodity-purchases', commodityRouter);
app.use('/api/stock-checks', stockRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api/final-invoices', finalInvoicesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports', reportsRouter);

app.listen(PORT, () => {
  console.log(`Finance API server running on http://localhost:${PORT}`);
  console.log('Routes:');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/dashboard');
  console.log('  GET  /api/general-ledger');
  console.log('  GET  /api/payment-requests');
  console.log('  GET  /api/ebanking');
  console.log('  GET  /api/cash/balance');
  console.log('  GET  /api/commodity-purchases');
  console.log('  GET  /api/stock-checks');
  console.log('  GET  /api/reconciliation');
  console.log('  GET  /api/final-invoices');
});
