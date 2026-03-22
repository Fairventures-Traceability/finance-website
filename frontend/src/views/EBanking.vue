<template>
  <div class="space-y-6">
    <!-- Filter bar -->
    <div class="card flex flex-wrap items-center gap-4">
      <div class="flex gap-2 flex-wrap">
        <button v-for="f in filters" :key="f.value"
          @click="activeFilter = f.value"
          :class="['px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            activeFilter === f.value ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
          {{ f.label }}
        </button>
      </div>
      <div class="ml-auto">
        <RouterLink v-if="auth.role === 'staff_keuangan'" to="/ebanking/create" class="btn-primary text-sm">
          + Transaksi Baru
        </RouterLink>
      </div>
    </div>

    <!-- List -->
    <div class="card p-0 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-900">Transaksi E-Banking</h2>
        <span class="text-xs text-gray-400">{{ transactions.length }} transaksi</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Referensi</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Dari</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Tujuan</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Jumlah</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Tanggal</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Maker</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="tx in transactions" :key="tx.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-3 font-mono text-xs text-green-700">{{ tx.transaction_reference }}</td>
              <td class="px-6 py-3 text-xs">{{ accountLabel(tx.source_account) }}</td>
              <td class="px-6 py-3 text-xs">{{ accountLabel(tx.destination_type) }}</td>
              <td class="px-6 py-3 text-right font-semibold">{{ fmtIDR(tx.amount) }}</td>
              <td class="px-6 py-3 text-xs text-gray-500">{{ fmtDate(tx.transaction_date) }}</td>
              <td class="px-6 py-3 text-xs text-gray-500">{{ tx.maker_name }}</td>
              <td class="px-6 py-3">
                <div class="flex flex-col gap-1">
                  <span :class="statusBadge(tx.maker_status)" class="px-2 py-0.5 rounded text-xs w-fit">Maker: {{ tx.maker_status }}</span>
                  <span :class="statusBadge(tx.approver_status)" class="px-2 py-0.5 rounded text-xs w-fit">Finance: {{ tx.approver_status }}</span>
                  <span :class="statusBadge(tx.ceo_status)" class="px-2 py-0.5 rounded text-xs w-fit">CEO: {{ tx.ceo_status }}</span>
                </div>
              </td>
              <td class="px-6 py-3">
                <RouterLink :to="`/ebanking/${tx.id}`" class="text-green-600 text-xs hover:underline">Detail →</RouterLink>
              </td>
            </tr>
            <tr v-if="transactions.length === 0">
              <td colspan="8" class="px-6 py-10 text-center text-sm text-gray-400">Tidak ada transaksi</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const transactions = ref<any[]>([]);
const activeFilter = ref('');

const filters = [
  { value: '', label: 'Semua' },
  { value: 'pending_finance', label: 'Menunggu Finance' },
  { value: 'pending_ceo', label: 'Menunggu CEO' },
  { value: 'pending_archive', label: 'Perlu Diarsipkan' },
];

const ACCOUNT_LABELS: Record<string, string> = {
  snbs_mandiri: 'SNBS Mandiri', kups_bni: 'KUPS BNI',
  cash_on_hand: 'Kas', profit_sharing_kups: 'Profit KUPS', external: 'Eksternal',
};
const accountLabel = (k: string) => ACCOUNT_LABELS[k] || k;

const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

const statusBadge = (s: string) => ({
  'bg-gray-100 text-gray-600': s === 'draft' || s === 'pending',
  'bg-green-100 text-green-700': s === 'submitted' || s === 'approved',
  'bg-red-100 text-red-700': s === 'rejected',
});

async function load() {
  try {
    const params = activeFilter.value ? { status: activeFilter.value } : {};
    const { data } = await axios.get('/api/ebanking', { params });
    transactions.value = data;
  } catch { /* silent */ }
}

watch(activeFilter, load);
onMounted(load);
</script>
