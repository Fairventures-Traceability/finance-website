<template>
  <div class="space-y-6">
    <!-- Controls -->
    <div class="card">
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Tahun</label>
          <select v-model="filters.year" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none">
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Bulan</label>
          <select v-model="filters.month" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none">
            <option value="">Semua Bulan</option>
            <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
          </select>
        </div>
        <button @click="loadReport" :disabled="loading" class="btn-primary text-sm disabled:opacity-60">
          {{ loading ? 'Memuat...' : 'Tampilkan Laporan' }}
        </button>
      </div>
    </div>

    <div v-if="report">
      <!-- Summary Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="card text-center border-t-4 border-green-500">
          <p class="text-xs text-gray-500 mb-1">Total Dana Masuk (Bank)</p>
          <p class="text-lg font-bold text-green-700">{{ fmtIDR(totalBankIn) }}</p>
        </div>
        <div class="card text-center border-t-4 border-red-400">
          <p class="text-xs text-gray-500 mb-1">Total Dana Keluar (Bank)</p>
          <p class="text-lg font-bold text-red-600">{{ fmtIDR(totalBankOut) }}</p>
        </div>
        <div class="card text-center border-t-4 border-yellow-500">
          <p class="text-xs text-gray-500 mb-1">Pembelian Komoditas</p>
          <p class="text-lg font-bold text-yellow-700">{{ fmtIDR(report.commodity.total_spent || 0) }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ report.commodity.total_transactions || 0 }} transaksi · {{ Number(report.commodity.total_kg || 0).toLocaleString('id-ID') }} kg</p>
        </div>
        <div class="card text-center border-t-4 border-purple-500">
          <p class="text-xs text-gray-500 mb-1">Cash Injection</p>
          <p class="text-lg font-bold text-purple-700">{{ fmtIDR(report.gl.total_injection || 0) }}</p>
        </div>
      </div>

      <!-- Current Balances -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="card bg-green-50 border border-green-200">
          <p class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Saldo SNBS Mandiri</p>
          <p class="text-xl font-bold text-green-800">{{ fmtIDR(report.gl.latest_snbs || 0) }}</p>
        </div>
        <div class="card bg-emerald-50 border border-emerald-200">
          <p class="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Saldo KUPS BNI</p>
          <p class="text-xl font-bold text-emerald-800">{{ fmtIDR(report.gl.latest_kups || 0) }}</p>
        </div>
        <div class="card bg-yellow-50 border border-yellow-200">
          <p class="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Kas di Tangan</p>
          <p class="text-xl font-bold text-yellow-800">{{ fmtIDR(report.gl.latest_cash || 0) }}</p>
        </div>
      </div>

      <!-- Payment Request Summary -->
      <div class="card mb-6">
        <h2 class="text-base font-semibold text-gray-900 mb-4">Ringkasan Payment Request</h2>
        <div v-if="report.paymentRequests.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="pr in report.paymentRequests" :key="pr.status"
               class="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
            <div>
              <p class="text-xs text-gray-500">{{ statusLabel(pr.status) }}</p>
              <p class="text-sm font-semibold text-gray-900">{{ pr.cnt }} pengajuan</p>
            </div>
            <p class="text-sm font-bold text-green-700">{{ fmtIDR(pr.total || 0) }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">Tidak ada data payment request untuk periode ini.</p>
      </div>

      <!-- Monthly Breakdown -->
      <div class="card mb-6" v-if="report.monthlyBreakdown.length">
        <h2 class="text-base font-semibold text-gray-900 mb-4">Arus Kas per Bulan</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left py-2 px-3 text-gray-500 font-medium">Bulan</th>
                <th class="text-right py-2 px-3 text-green-700 font-medium">Kas Masuk</th>
                <th class="text-right py-2 px-3 text-red-600 font-medium">Kas Keluar</th>
                <th class="text-right py-2 px-3 text-green-700 font-medium">Bank Masuk</th>
                <th class="text-right py-2 px-3 text-red-600 font-medium">Bank Keluar</th>
                <th class="text-right py-2 px-3 text-gray-700 font-medium">Net</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="row in report.monthlyBreakdown" :key="row.month" class="hover:bg-gray-50">
                <td class="py-2 px-3 font-medium text-gray-900">{{ monthName(row.month) }}</td>
                <td class="py-2 px-3 text-right text-green-700">{{ fmt(row.cash_in) }}</td>
                <td class="py-2 px-3 text-right text-red-600">{{ fmt(row.cash_out) }}</td>
                <td class="py-2 px-3 text-right text-green-700">{{ fmt(row.bank_in) }}</td>
                <td class="py-2 px-3 text-right text-red-600">{{ fmt(row.bank_out) }}</td>
                <td class="py-2 px-3 text-right font-semibold"
                    :class="(Number(row.cash_in) + Number(row.bank_in) - Number(row.cash_out) - Number(row.bank_out)) >= 0 ? 'text-green-700' : 'text-red-600'">
                  {{ fmtIDR(Number(row.cash_in) + Number(row.bank_in) - Number(row.cash_out) - Number(row.bank_out)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="card text-center py-12 text-gray-400">
      Pilih tahun dan klik "Tampilkan Laporan" untuk melihat data.
    </div>

    <!-- Download Reports -->
    <div class="card">
      <h2 class="text-base font-semibold text-gray-900 mb-4">Unduh Laporan (CSV)</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          v-for="dl in downloadTypes"
          :key="dl.type"
          @click="download(dl.type)"
          :disabled="downloading === dl.type"
          class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left disabled:opacity-60"
        >
          <span class="text-2xl">{{ dl.icon }}</span>
          <div>
            <p class="text-sm font-medium text-gray-900">{{ dl.name }}</p>
            <p class="text-xs text-gray-400">{{ downloading === dl.type ? 'Mengunduh...' : dl.desc }}</p>
          </div>
        </button>
      </div>
      <p class="text-xs text-gray-400 mt-3">* File CSV dapat dibuka di Microsoft Excel. Tahun & bulan yang dipilih di atas akan digunakan.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const filters = ref({ year: new Date().getFullYear(), month: '' });
const availableYears = ref<number[]>([]);
const report = ref<any>(null);
const loading = ref(false);
const downloading = ref<string | null>(null);

const downloadTypes = [
  { type: 'general-ledger',      name: 'Buku Besar',           desc: 'Seluruh entri GL periode ini', icon: '📒' },
  { type: 'payment-requests',    name: 'Payment Request',      desc: 'Semua PR periode ini',         icon: '📋' },
  { type: 'commodity-purchases', name: 'Pembelian Komoditas',  desc: 'Detail transaksi komoditas',   icon: '🌾' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Diajukan', finance_approved: 'Disetujui Finance',
  ceo_approved: 'Disetujui CEO', rejected: 'Ditolak', completed: 'Selesai',
};
const statusLabel = (s: string) => STATUS_LABELS[s] || s;
const monthName = (m: number) => new Date(2000, Number(m) - 1).toLocaleDateString('id-ID', { month: 'long' });
const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));
const fmt = (v: any) => v == null || Number(v) === 0 ? '-' : Number(v).toLocaleString('id-ID');

const totalBankIn = computed(() => Number(report.value?.gl?.total_snbs_in || 0) + Number(report.value?.gl?.total_kups_in || 0));
const totalBankOut = computed(() => Number(report.value?.gl?.total_snbs_out || 0) + Number(report.value?.gl?.total_kups_out || 0));

async function loadReport() {
  loading.value = true;
  try {
    const params: any = { year: filters.value.year };
    if (filters.value.month) params.month = filters.value.month;
    const { data } = await axios.get('/api/reports/summary', { params });
    report.value = data;
  } catch (err: any) {
    alert(err.response?.data?.error || 'Gagal memuat laporan');
  } finally {
    loading.value = false;
  }
}

async function download(type: string) {
  downloading.value = type;
  try {
    const params: any = { year: filters.value.year };
    if (filters.value.month) params.month = filters.value.month;
    const res = await axios.get(`/api/reports/download/${type}`, { params, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    const period = filters.value.month
      ? `${filters.value.year}-${String(filters.value.month).padStart(2, '0')}`
      : String(filters.value.year);
    a.href = url;
    a.download = `laporan-${type}-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('Gagal mengunduh laporan');
  } finally {
    downloading.value = null;
  }
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/reports/years');
    availableYears.value = data;
    if (data.length) {
      filters.value.year = data[0];
      await loadReport();
    }
  } catch { /* silent */ }
});
</script>
