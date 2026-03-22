<template>
  <div class="space-y-6">
    <!-- Create form (Staff Lapangan) -->
    <div v-if="auth.role === 'staff_lapangan' && showForm" class="card">
      <h2 class="text-base font-semibold text-gray-900 mb-4">Catat Pembelian Komoditas</h2>
      <form @submit.prevent="submitPurchase" class="grid grid-cols-2 gap-4">
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Tanggal</label><input v-model="form.purchase_date" type="date" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Jenis Komoditas</label><input v-model="form.commodity_type" type="text" required placeholder="cth: Kelapa Sawit" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Nama Petani</label><input v-model="form.farmer_name" type="text" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">NIK Petani</label><input v-model="form.farmer_id_card" type="text" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Kuantitas (kg)</label><input v-model="form.quantity_kg" type="number" step="0.001" required min="0" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Harga/kg (IDR)</label><input v-model="form.price_per_kg" type="number" step="0.01" required min="0" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <div v-if="form.quantity_kg && form.price_per_kg" class="col-span-2 bg-green-50 rounded-xl px-4 py-3">
          <p class="text-sm font-bold text-blue-800">Total: {{ fmtIDR(Number(form.quantity_kg) * Number(form.price_per_kg)) }}</p>
        </div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Metode Bayar</label>
          <select v-model="form.payment_method" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none">
            <option value="cash">Tunai</option><option value="bank_transfer">Transfer Bank</option>
          </select>
        </div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">No. Nota</label><input v-model="form.receipt_number" type="text" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <div class="col-span-2 flex gap-3 justify-end">
          <button type="button" @click="showForm = false" class="btn-secondary text-sm">Batal</button>
          <button type="submit" :disabled="saving" class="btn-primary text-sm disabled:opacity-60">{{ saving ? 'Menyimpan...' : 'Simpan Pembelian' }}</button>
        </div>
      </form>
    </div>

    <!-- Toolbar -->
    <div class="card flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-900">Daftar Pembelian Komoditas</h2>
      <button v-if="auth.role === 'staff_lapangan'" @click="showForm = true" class="btn-primary text-sm">+ Catat Pembelian</button>
    </div>

    <!-- Table -->
    <div class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Tanggal</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Petani</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Komoditas</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Qty (kg)</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Total</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Bayar</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th v-if="auth.role === 'kasir'" class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="p in purchases" :key="p.id" class="hover:bg-gray-50">
              <td class="px-6 py-3 text-xs text-gray-500">{{ fmtDate(p.purchase_date) }}</td>
              <td class="px-6 py-3 font-medium">{{ p.farmer_name }}</td>
              <td class="px-6 py-3 text-gray-600">{{ p.commodity_type }}</td>
              <td class="px-6 py-3 text-right">{{ Number(p.quantity_kg).toLocaleString('id-ID') }}</td>
              <td class="px-6 py-3 text-right font-semibold">{{ fmtIDR(p.total_amount) }}</td>
              <td class="px-6 py-3">
                <span :class="p.payment_method === 'cash' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-blue-800'" class="px-2 py-0.5 rounded text-xs font-medium">
                  {{ p.payment_method === 'cash' ? 'Tunai' : 'Transfer' }}
                </span>
              </td>
              <td class="px-6 py-3">
                <span :class="p.verification_status === 'verified' ? 'badge-income' : p.verification_status === 'disputed' ? 'badge-expense' : 'bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-medium'">
                  {{ p.verification_status === 'verified' ? 'Terverifikasi' : p.verification_status === 'disputed' ? 'Sengketa' : 'Menunggu' }}
                </span>
              </td>
              <td v-if="auth.role === 'kasir'" class="px-6 py-3">
                <button v-if="p.verification_status === 'pending'" @click="verify(p.id)" class="text-xs text-green-600 hover:underline font-medium">Verifikasi →</button>
              </td>
            </tr>
            <tr v-if="purchases.length === 0"><td :colspan="auth.role === 'kasir' ? 8 : 7" class="px-6 py-10 text-center text-sm text-gray-400">Belum ada data</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const purchases = ref<any[]>([]);
const showForm = ref(false);
const saving = ref(false);
const form = reactive({ purchase_date: new Date().toISOString().slice(0,10), farmer_name: '', farmer_id_card: '', commodity_type: '', quantity_kg: 0, price_per_kg: 0, payment_method: 'cash', receipt_number: '' });

const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

async function load() {
  try { const { data } = await axios.get('/api/commodity-purchases'); purchases.value = data; } catch { /* silent */ }
}

async function submitPurchase() {
  saving.value = true;
  try { await axios.post('/api/commodity-purchases', form); showForm.value = false; await load(); }
  catch (e: any) { alert(e.response?.data?.error || 'Gagal'); }
  finally { saving.value = false; }
}

async function verify(id: number) {
  try { await axios.post(`/api/commodity-purchases/${id}/verify`, { payment_method: 'cash' }); await load(); }
  catch (e: any) { alert(e.response?.data?.error || 'Gagal'); }
}

onMounted(load);
</script>
