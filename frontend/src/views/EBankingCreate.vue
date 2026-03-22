<template>
  <div class="max-w-xl">
    <div class="card">
      <h2 class="text-base font-semibold text-gray-900 mb-6">Input Transaksi E-Banking</h2>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Payment Request (opsional)</label>
          <select v-model="form.payment_request_id" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-green-500">
            <option value="">— Tanpa PR —</option>
            <option v-for="pr in prs" :key="pr.id" :value="pr.id">{{ pr.reference_number }} ({{ fmtIDR(pr.estimated_fund_needs) }})</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rekening Sumber</label>
            <select v-model="form.source_account" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-green-500">
              <option value="snbs_mandiri">SNBS Mandiri</option>
              <option value="kups_bni">KUPS BNI</option>
              <option value="cash_on_hand">Cash On Hand</option>
              <option value="ending_balance">Ending Balance</option>
              <option value="cash_injection">Cash Injection</option>
              <option value="direct_selling_kups">Direct Selling via KUPS</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tujuan</label>
            <select v-model="form.destination_type" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-green-500">
              <option value="cash_on_hand">Kas di Tangan</option>
              <option value="kups_bni">KUPS BNI</option>
              <option value="snbs_mandiri">SNBS Mandiri</option>
              <option value="profit_sharing_kups">Profit Sharing KUPS</option>
              <option value="external">Eksternal</option>
            </select>
          </div>
        </div>
        <div v-if="form.destination_type === 'external'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Detail Tujuan</label>
          <input v-model="form.destination_detail" type="text" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Nama bank/rekening tujuan" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah (IDR)</label>
            <input v-model="form.amount" type="number" step="0.01" min="0" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Biaya Transaksi (IDR)</label>
            <input v-model="form.transaction_cost" type="number" step="0.01" min="0" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Transaksi</label>
            <input v-model="form.transaction_date" type="date" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jam (opsional)</label>
            <input v-model="form.transaction_time" type="time" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
          <textarea v-model="form.notes" rows="2" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
        </div>
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{{ error }}</div>
        <div class="flex gap-3 justify-end pt-2">
          <RouterLink to="/ebanking" class="btn-secondary text-sm">Batal</RouterLink>
          <button type="submit" :disabled="loading" class="btn-primary text-sm disabled:opacity-60">{{ loading ? 'Menyimpan...' : 'Simpan Draft' }}</button>
          <button type="button" @click="submitAndSend" :disabled="loading" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">Submit ke Finance</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const prs = ref<any[]>([]);
const form = reactive({
  payment_request_id: '', source_account: 'snbs_mandiri', destination_type: 'cash_on_hand',
  destination_detail: '', amount: 0, transaction_cost: 0,
  transaction_date: new Date().toISOString().slice(0, 10),
  transaction_time: '', notes: '',
});

const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));

async function save(submit = false) {
  loading.value = true; error.value = '';
  try {
    const { data } = await axios.post('/api/ebanking', { ...form, payment_request_id: form.payment_request_id || null });
    if (submit) await axios.post(`/api/ebanking/${data.id}/submit`);
    router.push('/ebanking');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Gagal menyimpan';
  } finally { loading.value = false; }
}
const submit = () => save(false);
const submitAndSend = () => save(true);

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/payment-requests', { params: { status: 'ceo_approved' } });
    prs.value = data;
  } catch { /* silent */ }
});
</script>
