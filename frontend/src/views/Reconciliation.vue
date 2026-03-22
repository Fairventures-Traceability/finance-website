<template>
  <div class="space-y-6">
    <div class="card flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Rekonsiliasi Mingguan</h2>
        <p class="text-xs text-gray-400 mt-0.5">Dilakukan setiap Jumat oleh Finance Manager</p>
      </div>
      <button v-if="auth.role === 'finance_manager'" @click="showCreate = true" class="btn-primary text-sm">+ Rekonsiliasi Baru</button>
    </div>

    <!-- Create form -->
    <div v-if="showCreate" class="card border-2 border-green-200">
      <h3 class="font-semibold text-gray-900 mb-4">Buat Rekonsiliasi Minggu Ini</h3>
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 text-sm text-yellow-800">
        ⚠️ Tanggal akhir harus hari <strong>Jumat</strong>. Rekonsiliasi akan menarik semua entri GL dalam periode ini.
      </div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai (Senin)</label><input v-model="createForm.week_start_date" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Tanggal Selesai (Jumat)</label><input v-model="createForm.week_end_date" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" /></div>
      </div>
      <div v-if="createError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-3">{{ createError }}</div>
      <div class="flex gap-3">
        <button @click="showCreate = false" class="btn-secondary text-sm">Batal</button>
        <button @click="createRec" :disabled="creating" class="btn-primary text-sm disabled:opacity-60">{{ creating ? 'Memproses...' : 'Buat Rekonsiliasi' }}</button>
      </div>
    </div>

    <!-- Reconciliation list -->
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Periode</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Total Kas Masuk</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Total Kas Keluar</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Saldo Akhir Kas</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Selisih</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="r in recs" :key="r.id" class="hover:bg-gray-50">
            <td class="px-6 py-3 text-xs">{{ fmtDate(r.week_start_date) }} – {{ fmtDate(r.week_end_date) }}</td>
            <td class="px-6 py-3 text-right text-green-600 font-medium">{{ fmtIDR(r.total_cash_in) }}</td>
            <td class="px-6 py-3 text-right text-red-600 font-medium">{{ fmtIDR(r.total_cash_out) }}</td>
            <td class="px-6 py-3 text-right font-bold">{{ fmtIDR(r.final_cash_balance) }}</td>
            <td class="px-6 py-3">
              <span :class="r.discrepancy_found ? 'badge-expense' : 'badge-income'">{{ r.discrepancy_found ? 'Selisih' : 'Sesuai' }}</span>
            </td>
            <td class="px-6 py-3">
              <span :class="r.status === 'completed' ? 'badge-income' : r.status === 'flagged' ? 'badge-expense' : 'bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-medium'">{{ r.status }}</span>
            </td>
            <td class="px-6 py-3">
              <button @click="openRec(r)" class="text-green-600 text-xs hover:underline">Detail →</button>
            </td>
          </tr>
          <tr v-if="recs.length === 0"><td colspan="7" class="px-6 py-10 text-center text-sm text-gray-400">Belum ada rekonsiliasi</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Detail modal -->
    <div v-if="selected" class="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div class="bg-white rounded-2xl w-full max-w-4xl my-8">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Detail Rekonsiliasi — {{ fmtDate(selected.week_start_date) }} s/d {{ fmtDate(selected.week_end_date) }}</h3>
          <button @click="selected = null" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="card text-center"><p class="text-xs text-gray-400">Total Bank In (SNBS)</p><p class="font-bold text-green-700">{{ fmtIDR(selected.total_bank_in_snbs) }}</p></div>
            <div class="card text-center"><p class="text-xs text-gray-400">Total Bank In (BNI)</p><p class="font-bold text-green-700">{{ fmtIDR(selected.total_bank_in_kups) }}</p></div>
            <div class="card text-center"><p class="text-xs text-gray-400">Saldo Kas Akhir</p><p class="font-bold text-yellow-700">{{ fmtIDR(selected.final_cash_balance) }}</p></div>
          </div>
          <div class="text-sm font-semibold text-gray-700">Entri Buku Besar ({{ selected.ledger_entries?.length || 0 }} entri)</div>
          <div class="overflow-x-auto rounded-xl border border-gray-100">
            <table class="w-full text-xs">
              <thead class="bg-gray-50"><tr>
                <th class="px-4 py-2 text-left">Tanggal</th><th class="px-4 py-2 text-left">Keterangan</th>
                <th class="px-4 py-2 text-right">SNBS In</th><th class="px-4 py-2 text-right">SNBS Out</th>
                <th class="px-4 py-2 text-right">Kas In</th><th class="px-4 py-2 text-right">Kas Out</th>
                <th class="px-4 py-2 text-left">Status</th>
              </tr></thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="e in selected.ledger_entries" :key="e.id" class="hover:bg-gray-50">
                  <td class="px-4 py-2">{{ fmtDate(e.entry_date) }}</td>
                  <td class="px-4 py-2 max-w-48 truncate">{{ e.source_description }}</td>
                  <td class="px-4 py-2 text-right text-green-700">{{ fmtN(e.snbs_mandiri_cash_in) }}</td>
                  <td class="px-4 py-2 text-right text-red-600">{{ fmtN(e.snbs_mandiri_cash_out) }}</td>
                  <td class="px-4 py-2 text-right text-green-700">{{ fmtN(e.cash_on_hand_cash_in) }}</td>
                  <td class="px-4 py-2 text-right text-red-600">{{ fmtN(e.cash_on_hand_cash_out) }}</td>
                  <td class="px-4 py-2"><span :class="e.is_reconciled ? 'badge-income' : 'bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs'">{{ e.is_reconciled ? '✓' : 'Pending' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="selected.status !== 'completed'" class="flex gap-3">
            <input v-model="recNotes" type="text" placeholder="Catatan rekonsiliasi..." class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            <button @click="completeRec" :disabled="completing" class="btn-primary text-sm disabled:opacity-60">{{ completing ? '...' : 'Selesaikan Rekonsiliasi' }}</button>
          </div>
          <div v-else class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">✓ Rekonsiliasi selesai. Semua entri sudah ditandai terekonsiliasi.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const recs = ref<any[]>([]);
const selected = ref<any>(null);
const showCreate = ref(false);
const creating = ref(false);
const completing = ref(false);
const createError = ref('');
const recNotes = ref('');

// Default to current Mon-Fri
const now = new Date();
const day = now.getDay();
const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
const friday = new Date(monday); friday.setDate(monday.getDate() + 4);

const createForm = reactive({
  week_start_date: monday.toISOString().slice(0,10),
  week_end_date: friday.toISOString().slice(0,10),
});

const fmtIDR = (v: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v || 0));
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtN = (v: any) => Number(v) === 0 ? '' : Number(v).toLocaleString('id-ID');

async function load() {
  try { const { data } = await axios.get('/api/reconciliation'); recs.value = data; } catch { /* silent */ }
}
async function createRec() {
  creating.value = true; createError.value = '';
  try { await axios.post('/api/reconciliation', createForm); showCreate.value = false; await load(); }
  catch (e: any) { createError.value = e.response?.data?.error || 'Gagal'; }
  finally { creating.value = false; }
}
async function openRec(r: any) {
  try { const { data } = await axios.get(`/api/reconciliation/${r.id}`); selected.value = data; }
  catch { selected.value = r; }
}
async function completeRec() {
  completing.value = true;
  try { await axios.post(`/api/reconciliation/${selected.value.id}/complete`, { discrepancy_notes: recNotes.value }); await openRec(selected.value); await load(); }
  finally { completing.value = false; }
}

onMounted(load);
</script>
