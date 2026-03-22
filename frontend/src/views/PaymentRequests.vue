<template>
  <div class="space-y-6">
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-gray-900">Daftar Payment Request</h2>
        <RouterLink v-if="auth.role === 'project_manager'" to="/payment-requests/create" class="btn-primary text-sm">+ Buat Baru</RouterLink>
      </div>
      <div class="flex gap-3 flex-wrap">
        <button v-for="s in statusFilters" :key="s.value"
          @click="activeStatus = s.value"
          :class="['px-3 py-1.5 rounded-full text-xs font-medium transition-colors', activeStatus === s.value ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">No. Referensi</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Pengaju</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Periode</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500">Dana Diajukan</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Deadline</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="pr in filtered" :key="pr.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 font-mono font-medium text-green-700">{{ pr.reference_number }}</td>
            <td class="px-6 py-4 text-gray-700">{{ pr.submitted_by_name }}</td>
            <td class="px-6 py-4 text-gray-500 text-xs">{{ fmtDate(pr.period_start) }} – {{ fmtDate(pr.period_end) }}</td>
            <td class="px-6 py-4 text-right font-semibold">{{ fmtIDR(pr.estimated_fund_needs) }}</td>
            <td class="px-6 py-4 text-xs" :class="isOverdue(pr.submission_deadline) ? 'text-red-600 font-medium' : 'text-gray-500'">
              {{ fmtDate(pr.submission_deadline) }}
            </td>
            <td class="px-6 py-4">
              <span :class="statusClass(pr.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold">{{ statusLabel(pr.status) }}</span>
            </td>
            <td class="px-6 py-4">
              <RouterLink :to="`/payment-requests/${pr.id}`" class="text-green-600 text-xs hover:underline">Detail →</RouterLink>
            </td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400">Tidak ada payment request</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const prs = ref<any[]>([]);
const activeStatus = ref('');

const statusFilters = [
  { value: '', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Diajukan' },
  { value: 'finance_approved', label: 'Disetujui Finance' },
  { value: 'ceo_approved', label: 'Disetujui CEO' },
  { value: 'rejected', label: 'Ditolak' },
];

const filtered = computed(() => activeStatus.value ? prs.value.filter(p => p.status === activeStatus.value) : prs.value);

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
const isOverdue = (d: string) => new Date(d) < new Date();

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Diajukan', finance_review: 'Review Finance',
  finance_approved: 'Disetujui Finance', ceo_approved: 'Disetujui CEO',
  rejected: 'Ditolak', completed: 'Selesai'
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-green-100 text-green-700',
  finance_review: 'bg-yellow-100 text-yellow-700',
  finance_approved: 'bg-teal-100 text-teal-700',
  ceo_approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-purple-100 text-purple-700',
};
const statusLabel = (s: string) => STATUS_LABELS[s] || s;
const statusClass = (s: string) => STATUS_COLORS[s] || 'bg-gray-100 text-gray-700';

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/payment-requests');
    prs.value = data;
  } catch { /* silent */ }
});
</script>
