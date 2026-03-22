<template>
  <div class="space-y-6">
    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      <div class="card">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Aset</p>
        <p class="text-2xl font-bold text-gray-900">{{ formatIDR(data.balances.total) }}</p>
        <p class="text-xs text-gray-400 mt-1">Per {{ data.balances.as_of ? formatDate(data.balances.as_of) : '-' }}</p>
      </div>
      <div class="card border-l-4 border-green-500">
        <p class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">SNBS Mandiri</p>
        <p class="text-xl font-bold text-gray-900">{{ formatIDR(data.balances.snbs_mandiri) }}</p>
      </div>
      <div class="card border-l-4 border-green-500">
        <p class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">KUPS BNI</p>
        <p class="text-xl font-bold text-gray-900">{{ formatIDR(data.balances.kups_bni) }}</p>
      </div>
      <div class="card border-l-4 border-yellow-500">
        <p class="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">Kas di Tangan</p>
        <p class="text-xl font-bold text-gray-900">{{ formatIDR(data.balances.cash_on_hand) }}</p>
      </div>
    </div>

    <!-- Pending Actions -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="card xl:col-span-2">
        <h2 class="text-base font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h2>
        <div v-if="data.recentActivity.length === 0" class="text-sm text-gray-400 py-4 text-center">Belum ada transaksi</div>
        <div class="space-y-3">
          <div v-for="(item, i) in data.recentActivity" :key="i" class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
            <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-sm">
              {{ item.entry_type === 'bank_transfer' ? '🏦' : item.entry_type === 'commodity_purchase' ? '🌾' : '💵' }}
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{{ item.source_description || item.entry_type }}</p>
              <p class="text-xs text-gray-400">{{ item.entered_by_name }} · {{ formatDate(item.entry_date) }}</p>
            </div>
            <div class="text-right text-sm">
              <p v-if="Number(item.snbs_mandiri_cash_in) > 0" class="text-green-600 font-medium">+{{ formatIDR(item.snbs_mandiri_cash_in) }}</p>
              <p v-if="Number(item.snbs_mandiri_cash_out) > 0" class="text-red-600 font-medium">-{{ formatIDR(item.snbs_mandiri_cash_out) }}</p>
              <p v-if="Number(item.cash_on_hand_cash_in) > 0" class="text-green-600 font-medium">+{{ formatIDR(item.cash_on_hand_cash_in) }}</p>
              <p v-if="Number(item.cash_on_hand_cash_out) > 0" class="text-red-600 font-medium">-{{ formatIDR(item.cash_on_hand_cash_out) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Pending PRs -->
        <div class="card">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Aksi Diperlukan</h3>
          <div v-if="data.pendingApprovals > 0" class="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
            <span class="text-xl">⏳</span>
            <div>
              <p class="text-sm font-semibold text-orange-800">{{ data.pendingApprovals }} Persetujuan</p>
              <RouterLink to="/payment-requests" class="text-xs text-orange-600 hover:underline">Lihat sekarang →</RouterLink>
            </div>
          </div>
          <div v-else class="text-sm text-gray-400 text-center py-2">Tidak ada aksi diperlukan</div>
        </div>

        <!-- Daily Cash Count Status -->
        <div v-if="auth.role === 'kasir' || auth.role === 'finance_manager'" class="card">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Kas Harian Hari Ini</h3>
          <div v-if="data.todayCashCount" :class="['p-3 rounded-xl', data.todayCashCount.status === 'matched' ? 'bg-green-50' : 'bg-red-50']">
            <p class="text-sm font-semibold" :class="data.todayCashCount.status === 'matched' ? 'text-green-800' : 'text-red-800'">
              {{ data.todayCashCount.status === 'matched' ? '✓ Sesuai' : '⚠️ Selisih' }}
            </p>
            <p class="text-xs text-gray-500 mt-1">Fisik: {{ formatIDR(data.todayCashCount.physical_count) }}</p>
            <p v-if="data.todayCashCount.status !== 'matched'" class="text-xs text-red-600">
              Selisih: {{ formatIDR(data.todayCashCount.discrepancy) }}
            </p>
          </div>
          <div v-else class="text-sm text-gray-400 text-center py-2">
            Belum ada hitung kas hari ini
            <RouterLink v-if="auth.role === 'kasir'" to="/cash" class="block text-green-600 text-xs mt-1 hover:underline">Input sekarang →</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const data = reactive({
  balances: { snbs_mandiri: 0, kups_bni: 0, cash_on_hand: 0, total: 0, as_of: '' },
  pendingPR: 0,
  pendingApprovals: 0,
  todayCashCount: null as any,
  recentActivity: [] as any[],
});

const formatIDR = (v: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

onMounted(async () => {
  try {
    const { data: d } = await axios.get('/api/dashboard');
    Object.assign(data, d);
  } catch { /* use defaults */ }
});
</script>
