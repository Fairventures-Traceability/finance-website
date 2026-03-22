<template>
  <div class="max-w-3xl space-y-6" v-if="pr">
    <!-- Header -->
    <div class="card">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs text-gray-400 mb-1">Payment Request</p>
          <h2 class="text-xl font-bold text-gray-900 font-mono">{{ pr.reference_number }}</h2>
          <p class="text-sm text-gray-500 mt-1">Diajukan oleh {{ pr.submitted_by_name }}</p>
        </div>
        <span :class="statusClass(pr.status)" class="px-3 py-1.5 rounded-full text-sm font-semibold">{{ statusLabel(pr.status) }}</span>
      </div>

      <div class="grid grid-cols-3 gap-4 mt-6">
        <div>
          <p class="text-xs text-gray-400">Periode</p>
          <p class="text-sm font-medium">{{ fmtDate(pr.period_start) }} – {{ fmtDate(pr.period_end) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400">Dana Diajukan</p>
          <p class="text-sm font-bold text-green-700">{{ fmtIDR(pr.estimated_fund_needs) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400">Deadline</p>
          <p class="text-sm font-medium" :class="isOverdue(pr.submission_deadline) ? 'text-red-600' : ''">{{ fmtDate(pr.submission_deadline) }}</p>
        </div>
      </div>

      <div v-if="pr.previous_fund_released > 0" class="grid grid-cols-3 gap-4 mt-4 bg-gray-50 rounded-xl px-4 py-3">
        <div>
          <p class="text-xs text-gray-400">Dana Dilepas Sebelumnya</p>
          <p class="text-sm font-medium">{{ fmtIDR(pr.previous_fund_released) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400">Dana Terpakai</p>
          <p class="text-sm font-medium">{{ fmtIDR(pr.previous_fund_used) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400">Sisa Dana</p>
          <p class="text-sm font-medium" :class="pr.previous_fund_remaining >= 0 ? 'text-green-700' : 'text-red-600'">{{ fmtIDR(pr.previous_fund_remaining) }}</p>
        </div>
      </div>

      <div v-if="pr.notes" class="mt-4 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700">{{ pr.notes }}</div>
    </div>

    <!-- Documents Section (PM only, draft/submitted) -->
    <div v-if="auth.role === 'project_manager'" class="card">
      <h3 class="font-semibold text-gray-900 mb-4">Dokumen Wajib</h3>
      <div class="space-y-3">
        <div v-for="docType in REQUIRED_DOCS" :key="docType.key" class="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
          <div class="flex items-center gap-3">
            <div :class="hasDoc(docType.key) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'" class="w-7 h-7 rounded-full flex items-center justify-center text-sm">
              {{ hasDoc(docType.key) ? '✓' : '·' }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ docType.label }}</p>
              <p v-if="getDoc(docType.key)" class="text-xs text-gray-500">{{ getDoc(docType.key)?.file_name }}</p>
              <p v-else class="text-xs text-gray-400">Belum diupload</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <a v-if="hasDoc(docType.key) && isFileDoc(docType.key)" :href="docUrl(getDoc(docType.key)!.file_path)" target="_blank" class="text-xs text-green-600 hover:underline">Lihat</a>
            <!-- Draft mode: actions -->
            <template v-if="pr.status === 'draft'">
              <template v-if="!hasDoc(docType.key)">
                <button @click="openBuilder(docType.key)" class="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors font-medium">
                  Buat di Web
                </button>
                <label class="cursor-pointer">
                  <span class="text-xs bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    {{ uploading === docType.key ? 'Mengupload...' : 'Upload File' }}
                  </span>
                  <input type="file" class="hidden" @change="uploadDoc(docType.key, $event)" :disabled="uploading !== null" />
                </label>
              </template>
              <template v-else>
                <button @click="openBuilder(docType.key)" class="text-xs text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">
                  Edit
                </button>
                <button @click="deleteDoc(getDoc(docType.key)!.id)" class="text-xs text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  Hapus
                </button>
              </template>
            </template>
          </div>
        </div>
      </div>

      <div v-if="uploadError" class="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{{ uploadError }}</div>

      <!-- Submit Button -->
      <div v-if="pr.status === 'draft'" class="mt-5 pt-4 border-t border-gray-100">
        <div v-if="missingDocs.length > 0" class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
          Dokumen belum lengkap: <strong>{{ missingDocs.map(k => REQUIRED_DOCS.find(d => d.key === k)?.label).join(', ') }}</strong>
        </div>
        <button
          @click="submitPR"
          :disabled="submitting || missingDocs.length > 0"
          class="w-full bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Mengajukan...' : 'Ajukan Payment Request →' }}
        </button>
      </div>
    </div>

    <!-- Documents View (non-PM) -->
    <div v-if="auth.role !== 'project_manager' && (pr.documents || []).length > 0" class="card">
      <h3 class="font-semibold text-gray-900 mb-4">Dokumen</h3>
      <div class="space-y-2">
        <div v-for="doc in (pr.documents || [])" :key="doc.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p class="text-sm font-medium text-gray-900">{{ DOC_LABELS[doc.document_type] || doc.document_type }}</p>
            <p class="text-xs text-gray-500">{{ doc.file_name }}</p>
          </div>
          <a :href="docUrl(doc.file_path)" target="_blank" class="text-xs text-green-600 hover:underline">Lihat</a>
        </div>
      </div>
    </div>

    <!-- Approval Actions -->
    <div v-if="canApprove" class="card border-2 border-green-200">
      <h3 class="font-semibold text-gray-900 mb-4">Tindakan Persetujuan</h3>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Catatan (wajib jika menolak)</label>
        <textarea v-model="approvalNotes" rows="2" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Catatan persetujuan atau alasan penolakan..." />
      </div>
      <div class="flex gap-3 mt-4">
        <button @click="approve" :disabled="acting" class="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
          ✓ Setujui
        </button>
        <button @click="reject" :disabled="acting || !approvalNotes" class="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60">
          ✕ Tolak
        </button>
      </div>
    </div>

    <!-- Rejection note -->
    <div v-if="pr.rejection_notes" class="card bg-red-50 border border-red-200">
      <p class="text-sm font-semibold text-red-800 mb-1">Alasan Penolakan</p>
      <p class="text-sm text-red-700">{{ pr.rejection_notes }}</p>
    </div>

    <!-- Approval Timeline -->
    <div class="card" v-if="(pr.approvals || []).filter((a: any) => a && a.stage).length">
      <h3 class="font-semibold text-gray-900 mb-4">Riwayat Persetujuan</h3>
      <div class="space-y-3">
        <div v-for="a in (pr.approvals || []).filter((a: any) => a && a.stage)" :key="a.stage" class="flex items-start gap-3">
          <div :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5', a.decision === 'approved' ? 'bg-green-100 text-green-700' : a.decision === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500']">
            {{ a.decision === 'approved' ? '✓' : a.decision === 'rejected' ? '✕' : '…' }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{{ a.approver }} — {{ STAGE_LABELS[a.stage] || a.stage }}</p>
            <p v-if="a.notes" class="text-xs text-gray-500 mt-0.5">{{ a.notes }}</p>
            <p v-if="a.decided_at" class="text-xs text-gray-400">{{ fmtDate(a.decided_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center py-12 text-gray-400">Memuat...</div>

  <!-- DocBuilder modal -->
  <DocBuilder
    v-if="builderDocType && pr"
    :docType="builderDocType"
    :prRef="pr.reference_number"
    :prId="Number(pr.id)"
    @close="builderDocType = null"
    @saved="onBuilderSaved"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import DocBuilder from '../components/DocBuilder.vue';

const builderDocType = ref<string | null>(null);
function openBuilder(docType: string) { builderDocType.value = docType; }
async function onBuilderSaved() { builderDocType.value = null; await load(); }
function isFileDoc(key: string) {
  const doc = getDoc(key);
  return doc && doc.file_path && doc.file_path !== '';
}

const auth = useAuthStore();
const route = useRoute();
const pr = ref<any>(null);
const approvalNotes = ref('');
const acting = ref(false);
const uploading = ref<string | null>(null);
const uploadError = ref('');
const submitting = ref(false);

const STAGE_LABELS: Record<string, string> = {
  finance_validation: 'Validasi Finance Manager',
  ebanking_approval: 'Persetujuan E-Banking',
  ceo_approval: 'Persetujuan CEO',
};

const REQUIRED_DOCS = [
  { key: 'proforma_invoice', label: 'Proforma Invoice' },
  { key: 'fund_estimate', label: 'Estimasi Dana' },
  { key: 'commodity_recap', label: 'Rekap Komoditas' },
  { key: 'previous_fund_usage_report', label: 'Laporan Penggunaan Dana Sebelumnya' },
];

const DOC_LABELS: Record<string, string> = {
  proforma_invoice: 'Proforma Invoice',
  fund_estimate: 'Estimasi Dana',
  commodity_recap: 'Rekap Komoditas',
  previous_fund_usage_report: 'Laporan Penggunaan Dana Sebelumnya',
};

const canApprove = computed(() => {
  if (!pr.value) return false;
  if (auth.role === 'finance_manager' && pr.value.status === 'submitted') return true;
  if (auth.role === 'ceo' && pr.value.status === 'finance_approved') return true;
  return false;
});

const missingDocs = computed(() => {
  const uploaded = (pr.value?.documents || []).map((d: any) => d.document_type);
  return REQUIRED_DOCS.map(d => d.key).filter(k => !uploaded.includes(k));
});

function hasDoc(key: string) {
  return (pr.value?.documents || []).some((d: any) => d.document_type === key);
}

function getDoc(key: string) {
  return (pr.value?.documents || []).find((d: any) => d.document_type === key) || null;
}

function docUrl(filePath: string) {
  if (!filePath) return '#';
  // Normalize Windows backslashes, then take the part after 'uploads'
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.indexOf('uploads/');
  return idx !== -1 ? '/' + normalized.slice(idx) : '/' + normalized;
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));
const isOverdue = (d: string) => new Date(d) < new Date();

const STATUS_LABELS: Record<string, string> = { draft: 'Draft', submitted: 'Diajukan', finance_approved: 'Disetujui Finance', ceo_approved: 'Disetujui CEO', rejected: 'Ditolak', completed: 'Selesai' };
const STATUS_COLORS: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', submitted: 'bg-green-100 text-green-700', finance_approved: 'bg-teal-100 text-teal-700', ceo_approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', completed: 'bg-purple-100 text-purple-700' };
const statusLabel = (s: string) => STATUS_LABELS[s] || s;
const statusClass = (s: string) => STATUS_COLORS[s] || 'bg-gray-100 text-gray-700';

async function load() {
  const { data } = await axios.get(`/api/payment-requests/${route.params.id}`);
  if (typeof data.documents === 'string') data.documents = JSON.parse(data.documents || '[]');
  if (typeof data.approvals === 'string') data.approvals = JSON.parse(data.approvals || '[]');
  data.documents = data.documents || [];
  data.approvals = data.approvals || [];
  pr.value = data;
}

async function uploadDoc(docType: string, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = docType;
  uploadError.value = '';
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', docType);
    await axios.post(`/api/payment-requests/${route.params.id}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await load();
  } catch (err: any) {
    uploadError.value = err.response?.data?.error || 'Gagal mengupload';
  } finally {
    uploading.value = null;
    (event.target as HTMLInputElement).value = '';
  }
}

async function deleteDoc(docId: number) {
  if (!confirm('Hapus dokumen ini?')) return;
  try {
    await axios.delete(`/api/payment-requests/${route.params.id}/documents/${docId}`);
    await load();
  } catch (err: any) {
    uploadError.value = err.response?.data?.error || 'Gagal menghapus';
  }
}

async function submitPR() {
  submitting.value = true;
  try {
    await axios.post(`/api/payment-requests/${route.params.id}/submit`);
    await load();
  } catch (err: any) {
    uploadError.value = err.response?.data?.error || 'Gagal mengajukan';
  } finally {
    submitting.value = false;
  }
}

async function approve() {
  acting.value = true;
  try {
    await axios.post(`/api/payment-requests/${route.params.id}/approve`, { notes: approvalNotes.value });
    await load();
  } finally { acting.value = false; }
}

async function reject() {
  acting.value = true;
  try {
    await axios.post(`/api/payment-requests/${route.params.id}/reject`, { notes: approvalNotes.value });
    await load();
  } finally { acting.value = false; }
}

onMounted(load);
</script>
