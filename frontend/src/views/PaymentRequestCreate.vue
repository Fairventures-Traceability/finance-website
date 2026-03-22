<template>
  <div class="max-w-2xl">
    <div class="card">
      <h2 class="text-base font-semibold text-gray-900 mb-6">Buat Payment Request Baru</h2>

      <form @submit.prevent="submit" class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Periode Mulai</label>
            <input v-model="form.period_start" type="date" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Periode Akhir</label>
            <input v-model="form.period_end" type="date" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Estimasi Kebutuhan Dana (IDR)</label>
          <input v-model="form.estimated_fund_needs" type="number" step="0.01" required min="1"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="0" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dana Dilepas Sebelumnya</label>
            <input v-model="form.previous_fund_released" type="number" step="0.01" min="0"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" placeholder="0" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dana Terpakai Sebelumnya</label>
            <input v-model="form.previous_fund_used" type="number" step="0.01" min="0"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" placeholder="0" />
          </div>
        </div>

        <div v-if="form.previous_fund_released > 0" class="bg-gray-50 rounded-xl px-4 py-3 text-sm">
          <span class="text-gray-500">Sisa dana sebelumnya: </span>
          <span class="font-semibold" :class="remaining >= 0 ? 'text-green-700' : 'text-red-600'">
            {{ fmtIDR(remaining) }}
          </span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
          <textarea v-model="form.notes" rows="3" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" placeholder="Keterangan tambahan..." />
        </div>

        <!-- Document note -->
        <div class="border-t border-gray-100 pt-5">
          <div class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <div class="text-green-600 text-lg mt-0.5">📄</div>
            <div>
              <p class="text-sm font-semibold text-green-800">4 Dokumen Wajib</p>
              <p class="text-xs text-green-700 mt-0.5">Proforma Invoice, Estimasi Dana, Rekap Komoditas, dan Laporan Penggunaan Dana Sebelumnya.</p>
              <p class="text-xs text-gray-500 mt-1">Setelah menyimpan draft, Anda dapat <strong>membuat dokumen langsung di web</strong> atau mengupload file dari halaman detail PR.</p>
            </div>
          </div>
        </div>

        <div v-if="uploadProgress" class="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {{ uploadProgress }}
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{{ error }}</div>

        <div class="flex gap-3 justify-end pt-2">
          <RouterLink to="/payment-requests" class="btn-secondary text-sm">Batal</RouterLink>
          <button type="submit" :disabled="loading" class="btn-primary text-sm disabled:opacity-60">
            {{ loading ? uploadProgress || 'Menyimpan...' : 'Simpan Draft →' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const uploadProgress = ref('');


const form = reactive({
  period_start: '',
  period_end: '',
  estimated_fund_needs: 0,
  previous_fund_released: 0,
  previous_fund_used: 0,
  notes: '',
});

const remaining = computed(() => Number(form.previous_fund_released) - Number(form.previous_fund_used));
const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

async function submit() {
  loading.value = true;
  error.value = '';
  uploadProgress.value = '';
  try {
    const { data } = await axios.post('/api/payment-requests', form);
    const prId = data.id;

    router.push(`/payment-requests/${prId}`);
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Gagal menyimpan';
  } finally {
    loading.value = false;
    uploadProgress.value = '';
  }
}
</script>
