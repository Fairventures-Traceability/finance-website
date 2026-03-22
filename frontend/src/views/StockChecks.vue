<template>
  <div class="space-y-6">
    <div v-if="auth.role === 'project_manager' && showForm" class="card">
      <h2 class="text-base font-semibold text-gray-900 mb-4">Input Cek Stok Aktual</h2>
      <div class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">📅 Cek stok dilakukan setiap <strong>hari Jumat</strong></div>
      <form @submit.prevent="submitCheck" class="grid grid-cols-2 gap-4">
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Tanggal Cek</label><input v-model="form.check_date" type="date" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Jenis Komoditas</label><input v-model="form.commodity_type" type="text" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" placeholder="cth: Kelapa Sawit" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Stok Aktual (kg)</label><input v-model="form.actual_quantity_kg" type="number" step="0.001" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Stok Ekspektasi (kg)</label><input v-model="form.expected_quantity_kg" type="number" step="0.001" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <div v-if="form.actual_quantity_kg && form.expected_quantity_kg" class="col-span-2">
          <div :class="['rounded-xl px-4 py-3 text-sm font-medium', discrepancy === 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800']">
            Selisih: {{ discrepancy.toLocaleString('id-ID') }} kg {{ discrepancy === 0 ? '✓ Sesuai' : '⚠️ Berbeda' }}
          </div>
        </div>
        <div class="col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">Catatan</label><textarea v-model="form.notes" rows="2" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" /></div>
        <div class="col-span-2 flex gap-3 justify-end">
          <button type="button" @click="showForm = false" class="btn-secondary text-sm">Batal</button>
          <button type="submit" :disabled="saving" class="btn-primary text-sm disabled:opacity-60">{{ saving ? 'Menyimpan...' : 'Simpan Cek Stok' }}</button>
        </div>
      </form>
    </div>

    <div class="card flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-900">Riwayat Cek Stok</h2>
      <button v-if="auth.role === 'project_manager'" @click="showForm = true" class="btn-primary text-sm">+ Cek Stok Baru</button>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Tanggal</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Komoditas</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Aktual (kg)</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Ekspektasi (kg)</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Selisih</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Oleh</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in checks" :key="c.id" class="hover:bg-gray-50">
            <td class="px-6 py-3 text-xs text-gray-500">{{ fmtDate(c.check_date) }}</td>
            <td class="px-6 py-3 font-medium">{{ c.commodity_type }}</td>
            <td class="px-6 py-3 text-right">{{ Number(c.actual_quantity_kg).toLocaleString('id-ID') }}</td>
            <td class="px-6 py-3 text-right text-gray-500">{{ c.expected_quantity_kg ? Number(c.expected_quantity_kg).toLocaleString('id-ID') : '—' }}</td>
            <td class="px-6 py-3 text-right" :class="Number(c.actual_quantity_kg) - Number(c.expected_quantity_kg || c.actual_quantity_kg) !== 0 ? 'text-red-600 font-semibold' : 'text-green-600'">
              {{ c.expected_quantity_kg ? (Number(c.actual_quantity_kg) - Number(c.expected_quantity_kg)).toLocaleString('id-ID') : '—' }}
            </td>
            <td class="px-6 py-3 text-xs text-gray-400">{{ c.checked_by_name }}</td>
          </tr>
          <tr v-if="checks.length === 0"><td colspan="6" class="px-6 py-10 text-center text-sm text-gray-400">Belum ada cek stok</td></tr>
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
const checks = ref<any[]>([]);
const showForm = ref(false);
const saving = ref(false);
const form = reactive({ check_date: new Date().toISOString().slice(0,10), commodity_type: '', actual_quantity_kg: 0, expected_quantity_kg: 0, notes: '' });

const discrepancy = computed(() => Number(form.actual_quantity_kg) - Number(form.expected_quantity_kg));
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-';

async function load() {
  try { const { data } = await axios.get('/api/stock-checks'); checks.value = data; } catch { /* silent */ }
}
async function submitCheck() {
  saving.value = true;
  try { await axios.post('/api/stock-checks', form); showForm.value = false; await load(); }
  catch (e: any) { alert(e.response?.data?.error || 'Gagal'); }
  finally { saving.value = false; }
}

onMounted(load);
</script>
