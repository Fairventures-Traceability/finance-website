import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('../views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: 'Dashboard' } },
      { path: 'workflow', component: () => import('../views/WorkflowDiagram.vue'), meta: { title: 'Alur Kerja SOP' } },
      {
        path: 'general-ledger',
        component: () => import('../views/GeneralLedger.vue'),
        meta: { title: 'Buku Besar', roles: ['finance_manager', 'staff_keuangan', 'ceo', 'kasir'] },
      },
      { path: 'payment-requests', component: () => import('../views/PaymentRequests.vue'), meta: { title: 'Payment Request' } },
      { path: 'payment-requests/create', component: () => import('../views/PaymentRequestCreate.vue'), meta: { title: 'Buat Payment Request', roles: ['project_manager'] } },
      { path: 'payment-requests/:id', component: () => import('../views/PaymentRequestDetail.vue'), meta: { title: 'Detail Payment Request' } },
      {
        path: 'ebanking',
        component: () => import('../views/EBanking.vue'),
        meta: { title: 'Transaksi E-Banking', roles: ['staff_keuangan', 'finance_manager', 'ceo'] },
      },
      {
        path: 'ebanking/create',
        component: () => import('../views/EBankingCreate.vue'),
        meta: { title: 'Input E-Banking', roles: ['staff_keuangan'] },
      },
      {
        path: 'ebanking/:id',
        component: () => import('../views/EBankingDetail.vue'),
        meta: { title: 'Detail E-Banking', roles: ['staff_keuangan', 'finance_manager', 'ceo'] },
      },
      {
        path: 'cash',
        component: () => import('../views/CashManagement.vue'),
        meta: { title: 'Manajemen Kas', roles: ['kasir', 'finance_manager', 'ceo'] },
      },
      {
        path: 'commodity-purchases',
        component: () => import('../views/CommodityPurchases.vue'),
        meta: { title: 'Pembelian Komoditas', roles: ['staff_lapangan', 'kasir', 'finance_manager', 'ceo'] },
      },
      {
        path: 'stock-checks',
        component: () => import('../views/StockChecks.vue'),
        meta: { title: 'Cek Stok', roles: ['project_manager', 'finance_manager', 'ceo'] },
      },
      {
        path: 'reconciliation',
        component: () => import('../views/Reconciliation.vue'),
        meta: { title: 'Rekonsiliasi Mingguan', roles: ['finance_manager', 'ceo'] },
      },
      {
        path: 'reports',
        component: () => import('../views/Reports.vue'),
        meta: { title: 'Laporan', roles: ['finance_manager', 'ceo'] },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.public) { next(); return; }
  if (!auth.isAuthenticated) { next('/login'); return; }
  const roles = to.meta.roles as string[] | undefined;
  if (roles && !roles.includes(auth.role!)) { next('/dashboard'); return; }
  next();
});

router.afterEach((to) => {
  document.title = `${to.meta.title || 'Home'} — Finance App Fairventures`;
});

export default router;
