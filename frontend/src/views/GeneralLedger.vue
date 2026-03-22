<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="card">
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Tahun</label>
          <select v-model="filters.year" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none">
            <option value="">Semua</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Bulan</label>
          <select v-model="filters.month" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none">
            <option value="">Semua</option>
            <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
          </select>
        </div>
        <button @click="loadData" class="btn-primary text-sm">Tampilkan</button>
        <div class="ml-auto flex gap-2">
          <button v-if="canAddEntry" @click="showAddEntry = true" class="btn-primary text-sm">+ Entri Baru</button>
        </div>
      </div>
    </div>

    <!-- Balance summary -->
    <div class="grid grid-cols-3 gap-4">
      <div class="card text-center border-t-4 border-blue-500">
        <p class="text-xs text-gray-500">Saldo SNBS Mandiri</p>
        <p class="text-lg font-bold text-blue-700 mt-1">{{ formatIDR(latestBalance.snbs) }}</p>
      </div>
      <div class="card text-center border-t-4 border-green-500">
        <p class="text-xs text-gray-500">Saldo KUPS BNI</p>
        <p class="text-lg font-bold text-green-700 mt-1">{{ formatIDR(latestBalance.kups) }}</p>
      </div>
      <div class="card text-center border-t-4 border-yellow-500">
        <p class="text-xs text-gray-500">Kas di Tangan</p>
        <p class="text-lg font-bold text-yellow-700 mt-1">{{ formatIDR(latestBalance.cash) }}</p>
      </div>
    </div>

    <!-- Ledger Table - matches spreadsheet layout -->
    <div class="card p-0 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-900">Buku Besar Umum</h2>
        <span class="text-xs text-gray-400">{{ entries.length }} entri</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-800 text-white">
            <tr>
              <th class="px-3 py-2 text-left whitespace-nowrap sticky left-0 bg-gray-800">No.</th>
              <th class="px-3 py-2 text-left whitespace-nowrap sticky left-8 bg-gray-800">Tanggal</th>
              <th class="px-3 py-2 text-left whitespace-nowrap">Keterangan</th>
              <th class="px-3 py-2 text-left whitespace-nowrap">Bukti</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-blue-900">→ SNBS Mandiri</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-blue-900">Biaya Trx</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-green-900">→ KUPS BNI</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-green-900">Biaya Trx</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-yellow-800">→ Kas</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-purple-900">→ Profit KUPS</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-gray-700">Cash Injection</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-blue-800">SNBS In</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-blue-800">SNBS Out</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-blue-700 font-bold">Saldo SNBS</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-green-800">BNI In</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-green-800">BNI Out</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-green-700 font-bold">Saldo BNI</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-yellow-700">Kas In</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-yellow-700">Kas Out</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-yellow-600 font-bold">Saldo Kas</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-blue-900">Saldo Harian SNBS</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-green-900">Saldo Harian BNI</th>
              <th class="px-3 py-2 text-right whitespace-nowrap bg-yellow-800">Hitung Kas Harian</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="e in entries" :key="e.id" class="hover:bg-gray-50">
              <td class="px-3 py-2 font-mono sticky left-0 bg-white">{{ e.entry_number }}</td>
              <td class="px-3 py-2 whitespace-nowrap sticky left-8 bg-white">{{ formatDate(e.entry_date) }}</td>
              <td class="px-3 py-2 whitespace-nowrap max-w-48 truncate">{{ e.source_description }}</td>
              <td class="px-3 py-2 text-gray-400">{{ e.receipt_reference || '-' }}</td>
              <td class="px-3 py-2 text-right">{{ fmt(e.to_snbs_mandiri) }}</td>
              <td class="px-3 py-2 text-right">{{ fmt(e.snbs_mandiri_transaction_cost) }}</td>
              <td class="px-3 py-2 text-right">{{ fmt(e.to_kups_bni) }}</td>
              <td class="px-3 py-2 text-right">{{ fmt(e.kups_bni_transaction_cost) }}</td>
              <td class="px-3 py-2 text-right">{{ fmt(e.to_cash_on_hand) }}</td>
              <td class="px-3 py-2 text-right">{{ fmt(e.to_profit_sharing_kups) }}</td>
              <td class="px-3 py-2 text-right">{{ fmt(e.cash_injection) }}</td>
              <td class="px-3 py-2 text-right text-green-700">{{ fmt(e.snbs_mandiri_cash_in) }}</td>
              <td class="px-3 py-2 text-right text-red-600">{{ fmt(e.snbs_mandiri_cash_out) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-blue-700">{{ fmt(e.snbs_mandiri_balance) }}</td>
              <td class="px-3 py-2 text-right text-green-700">{{ fmt(e.kups_bni_cash_in) }}</td>
              <td class="px-3 py-2 text-right text-red-600">{{ fmt(e.kups_bni_cash_out) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-green-700">{{ fmt(e.kups_bni_balance) }}</td>
              <td class="px-3 py-2 text-right text-green-700">{{ fmt(e.cash_on_hand_cash_in) }}</td>
              <td class="px-3 py-2 text-right text-red-600">{{ fmt(e.cash_on_hand_cash_out) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-yellow-700">{{ fmt(e.cash_on_hand_balance) }}</td>
              <td class="px-3 py-2 text-right text-blue-600">{{ fmt(e.daily_balance_snbs_mandiri) }}</td>
              <td class="px-3 py-2 text-right text-green-600">{{ fmt(e.daily_balance_kups_bni) }}</td>
              <td class="px-3 py-2 text-right text-yellow-600">{{ fmt(e.daily_count_cash_on_hand) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Entry Modal -->
    <div v-if="showAddEntry" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Tambah Entri Buku Besar</h3>
          <button @click="showAddEntry = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitEntry" class="p-6 grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
            <input v-model="newEntry.entry_date" type="date" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-medium text-gray-600 mb-1">Keterangan</label>
            <input v-model="newEntry.source_description" type="text" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Jenis Entri</label>
            <select v-model="newEntry.entry_type" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash_withdrawal">Penarikan Kas</option>
              <option value="cash_deposit">Setor Kas</option>
              <option value="commodity_purchase">Pembelian Komoditas</option>
              <option value="profit_sharing">Bagi Hasil</option>
              <option value="adjustment">Penyesuaian</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">No. Bukti</label>
            <input v-model="newEntry.receipt_reference" type="text" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">SNBS Mandiri - Masuk</label><input v-model="newEntry.snbs_mandiri_cash_in" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">SNBS Mandiri - Keluar</label><input v-model="newEntry.snbs_mandiri_cash_out" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">KUPS BNI - Masuk</label><input v-model="newEntry.kups_bni_cash_in" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">KUPS BNI - Keluar</label><input v-model="newEntry.kups_bni_cash_out" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Kas - Masuk</label><input v-model="newEntry.cash_on_hand_cash_in" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Kas - Keluar</label><input v-model="newEntry.cash_on_hand_cash_out" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Saldo Harian SNBS</label><input v-model="newEntry.daily_balance_snbs_mandiri" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Hitung Kas Harian</label><input v-model="newEntry.daily_count_cash_on_hand" type="number" step="0.01" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
          <div class="col-span-2 flex gap-3 justify-end pt-2">
            <button type="button" @click="showAddEntry = false" class="btn-secondary text-sm">Batal</button>
            <button type="submit" class="btn-primary text-sm">Simpan Entri</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const entries = ref<any[]>([]);
const showAddEntry = ref(false);
const filters = reactive({ year: '2026', month: '' });

const canAddEntry = computed(() => ['staff_keuangan', 'kasir'].includes(auth.role || ''));

const latestBalance = computed(() => {
  const last = entries.value[entries.value.length - 1];
  return last ? { snbs: last.snbs_mandiri_balance, kups: last.kups_bni_balance, cash: last.cash_on_hand_balance } : { snbs: 0, kups: 0, cash: 0 };
});

const newEntry = reactive({
  entry_date: new Date().toISOString().slice(0, 10),
  source_description: '',
  entry_type: 'bank_transfer',
  receipt_reference: '',
  snbs_mandiri_cash_in: 0,
  snbs_mandiri_cash_out: 0,
  kups_bni_cash_in: 0,
  kups_bni_cash_out: 0,
  cash_on_hand_cash_in: 0,
  cash_on_hand_cash_out: 0,
  daily_balance_snbs_mandiri: null as number | null,
  daily_count_cash_on_hand: null as number | null,
});

const fmt = (v: any) => v == null || Number(v) === 0 ? '' : Number(v).toLocaleString('id-ID');
const formatIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));
const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID');
const monthName = (m: number) => new Date(2000, m - 1).toLocaleDateString('id-ID', { month: 'long' });

async function loadData() {
  try {
    const params: Record<string, string> = {};
    if (filters.year) params.year = filters.year;
    if (filters.month) params.month = filters.month;
    const { data } = await axios.get('/api/general-ledger', { params });
    entries.value = data;
  } catch { /* silent */ }
}

async function submitEntry() {
  try {
    await axios.post('/api/general-ledger', newEntry);
    showAddEntry.value = false;
    await loadData();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Gagal menyimpan entri');
  }
}

onMounted(loadData);
</script>
