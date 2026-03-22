<template>
  <div class="min-h-screen flex">
    <aside class="w-64 flex flex-col fixed inset-y-0 left-0 z-50" style="background: linear-gradient(180deg, #052e16 0%, #14532d 60%, #166534 100%);">
      <div class="flex items-center gap-3 px-6 py-5 border-b border-green-900">
        <div class="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <span class="text-lg font-semibold tracking-tight text-white">Finance App Fairventures</span>
      </div>

      <nav class="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto">
        <template v-for="section in navSections" :key="section.title">
          <p v-if="hasVisibleItems(section)" class="text-xs font-semibold text-green-400 uppercase tracking-widest px-3 pt-4 pb-1">{{ section.title }}</p>
          <RouterLink
            v-for="item in section.items.filter(i => !i.roles || i.roles.length === 0 || i.roles.includes(auth.role || ''))"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path === item.path || $route.path.startsWith(item.path + '/') ? 'bg-green-600 text-white' : 'text-green-200 hover:bg-green-800 hover:text-white']">
            <span class="text-base w-5 text-center">{{ item.icon }}</span>
            {{ item.label }}
          </RouterLink>
        </template>
      </nav>

      <div class="px-4 py-4 border-t border-green-900">
        <div class="flex items-center gap-3 px-3 py-2">
          <div class="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold shrink-0 text-white">
            {{ auth.user?.name.slice(0, 2).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-green-300 truncate">{{ ROLE_LABELS[auth.role || ''] }}</p>
          </div>
          <button @click="handleLogout" class="text-green-400 hover:text-red-400 transition-colors shrink-0" title="Logout">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <div class="flex-1 ml-64">
      <header class="bg-white border-b border-green-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">{{ $route.meta.title as string }}</h1>
          <p class="text-sm text-gray-400">{{ currentDate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="auth.role === 'kasir' && showWhatsAppReminder" class="bg-orange-100 text-orange-700 text-xs px-3 py-1.5 rounded-lg font-medium animate-pulse">
            ⚠️ Kirim rekap ke WhatsApp sebelum 18:00
          </div>
          <RouterLink v-if="auth.role === 'project_manager'" to="/payment-requests/create" class="btn-primary text-sm">
            + Payment Request
          </RouterLink>
          <RouterLink v-if="auth.role === 'staff_keuangan'" to="/ebanking/create" class="btn-primary text-sm">
            + E-Banking
          </RouterLink>
        </div>
      </header>
      <main class="p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const currentDate = computed(() => new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
const showWhatsAppReminder = computed(() => new Date().getHours() >= 17);

const ROLE_LABELS: Record<string, string> = {
  project_manager: 'Project Manager', finance_manager: 'Finance Manager',
  staff_keuangan: 'Staff Keuangan', ceo: 'CEO', kasir: 'Kasir', staff_lapangan: 'Staff Lapangan',
};

const navSections = [
  {
    title: 'Umum',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: [] as string[] },
      { path: '/workflow', label: 'Alur Kerja SOP', icon: '🗺️', roles: [] as string[] },
    ],
  },
  {
    title: 'Pengajuan Dana',
    items: [
      { path: '/payment-requests', label: 'Payment Request', icon: '📋', roles: [] as string[] },
      { path: '/ebanking', label: 'Transaksi E-Banking', icon: '🏦', roles: ['staff_keuangan', 'finance_manager', 'ceo'] },
    ],
  },
  {
    title: 'Komoditas & Stok',
    items: [
      { path: '/commodity-purchases', label: 'Pembelian Komoditas', icon: '🌾', roles: ['staff_lapangan', 'kasir', 'finance_manager', 'ceo'] },
      { path: '/stock-checks', label: 'Cek Stok', icon: '📦', roles: ['project_manager', 'finance_manager', 'ceo'] },
    ],
  },
  {
    title: 'Keuangan',
    items: [
      { path: '/cash', label: 'Manajemen Kas', icon: '💵', roles: ['kasir', 'finance_manager', 'ceo'] },
      { path: '/general-ledger', label: 'Buku Besar', icon: '📒', roles: ['finance_manager', 'staff_keuangan', 'ceo', 'kasir'] },
      { path: '/reconciliation', label: 'Rekonsiliasi', icon: '🔁', roles: ['finance_manager', 'ceo'] },
      { path: '/reports', label: 'Laporan', icon: '📈', roles: ['finance_manager', 'ceo'] },
    ],
  },
];

function hasVisibleItems(section: typeof navSections[0]) {
  return section.items.some(i => !i.roles || i.roles.length === 0 || i.roles.includes(auth.role || ''));
}

function handleLogout() { auth.logout(); router.push('/login'); }
</script>
