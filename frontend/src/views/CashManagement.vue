<template>
  <div class="space-y-6">
    <!-- Today's count form for Kasir -->
    <div v-if="auth.role === 'kasir'" class="card">
      <h2 class="text-base font-semibold text-gray-900 mb-4">Hitung Kas Harian — {{ todayStr }}</h2>
      <div v-if="todayCount" :class="['p-4 rounded-xl mb-4', todayCount.status === 'matched' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200']">
        <p class="font-semibold" :class="todayCount.status === 'matched' ? 'text-green-800' : 'text-red-800'">
          {{ todayCount.status === 'matched' ? '✓ Kas Sesuai' : '⚠️ Terdapat Selisih' }}
        </p>
        <div class="grid grid-cols-3 gap-4 mt-3 text-sm">
          <div><span class="text-gray-500">Fisik:</span> <strong>{{ fmtIDR(todayCount.physical_count) }}</strong></div>
          <div><span class="text-gray-500">Buku Besar:</span> <strong>{{ fmtIDR(todayCount.general_ledger_balance) }}</strong></div>
          <div><span class="text-gray-500">Selisih:</span> <strong :class="Number(todayCount.discrepancy) !== 0 ? 'text-red-600' : 'text-green-600'">{{ fmtIDR(todayCount.discrepancy) }}</strong></div>
        </div>
        <button v-if="!todayCount.whatsapp_sent_at" @click="markSent(todayCount.id)"
          class="mt-4 bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
          📱 Tandai Sudah Dikirim ke WhatsApp
        </button>
        <p v-else class="mt-3 text-xs text-green-700">✓ Sudah dikirim ke WhatsApp pukul {{ fmtTime(todayCount.whatsapp_sent_at) }}</p>
      </div>

      <form v-else @submit.prevent="submitCount" class="grid grid-cols-2 gap-4">
        <div class="col-span-2 md:col-span-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Fisik Kas (IDR)</label>
          <input v-model="countForm.physical_count" type="number" step="0.01" required min="0"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
        </div>
        <div class="col-span-2 md:col-span-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Catatan Selisih</label>
          <input v-model="countForm.discrepancy_notes" type="text"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Opsional" />
        </div>
        <div class="col-span-2">
          <button type="submit" :disabled="saving" class="btn-primary text-sm disabled:opacity-60">
            {{ saving ? 'Menyimpan...' : 'Simpan Hitungan Kas' }}
          </button>
        </div>
      </form>
    </div>

    <!-- History -->
    <div class="card p-0 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Riwayat Hitung Kas Harian</h2>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Tanggal</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Fisik</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Buku Besar</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Selisih</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">WhatsApp</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in counts" :key="c.id" class="hover:bg-gray-50">
            <td class="px-6 py-3">{{ fmtDate(c.count_date) }}</td>
            <td class="px-6 py-3 text-right font-medium">{{ fmtIDR(c.physical_count) }}</td>
            <td class="px-6 py-3 text-right text-gray-500">{{ fmtIDR(c.general_ledger_balance) }}</td>
            <td class="px-6 py-3 text-right" :class="Number(c.discrepancy) !== 0 ? 'text-red-600 font-semibold' : 'text-green-600'">
              {{ fmtIDR(c.discrepancy) }}
            </td>
            <td class="px-6 py-3">
              <span :class="c.status === 'matched' ? 'badge-income' : 'badge-expense'">{{ c.status === 'matched' ? 'Sesuai' : 'Selisih' }}</span>
            </td>
            <td class="px-6 py-3 text-xs text-gray-400">
              {{ c.whatsapp_sent_at ? '✓ ' + fmtTime(c.whatsapp_sent_at) : 'Belum' }}
            </td>
          </tr>
          <tr v-if="counts.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400">Belum ada data</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const counts = ref<any[]>([]);
const saving = ref(false);
const todayStr = new Date().toISOString().slice(0, 10);
const countForm = reactive({ physical_count: 0, discrepancy_notes: '' });

const todayCount = computed(() => counts.value.find(c => c.count_date?.slice(0, 10) === todayStr));

const fmtIDR = (v: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

async function load() {
  try {
    const { data } = await axios.get('/api/cash/daily-count');
    counts.value = data;
  } catch { /* silent */ }
}

async function submitCount() {
  saving.value = true;
  try {
    await axios.post('/api/cash/daily-count', { ...countForm, count_date: todayStr });
    await load();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Gagal');
  } finally {
    saving.value = false;
  }
}

async function markSent(id: number) {
  await axios.post(`/api/cash/daily-count/${id}/send-whatsapp`);
  await load();
}

onMounted(load);
</script>
