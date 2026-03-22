<template>
  <div class="max-w-2xl space-y-6" v-if="tx">
    <div class="card">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs text-gray-400 mb-1">Transaksi E-Banking</p>
          <h2 class="text-xl font-bold text-gray-900 font-mono">{{ tx.transaction_reference }}</h2>
          <p class="text-sm text-gray-500 mt-1">Dibuat oleh {{ tx.maker_name }}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        <div><p class="text-xs text-gray-400">Dari</p><p class="text-sm font-semibold">{{ accountLabel(tx.source_account) }}</p></div>
        <div><p class="text-xs text-gray-400">Ke</p><p class="text-sm font-semibold">{{ accountLabel(tx.destination_type) }}</p></div>
        <div><p class="text-xs text-gray-400">Jumlah</p><p class="text-sm font-bold text-green-700">{{ fmtIDR(tx.amount) }}</p></div>
        <div><p class="text-xs text-gray-400">Biaya Trx</p><p class="text-sm">{{ fmtIDR(tx.transaction_cost) }}</p></div>
        <div><p class="text-xs text-gray-400">Tanggal</p><p class="text-sm">{{ fmtDate(tx.transaction_date) }}</p></div>
        <div><p class="text-xs text-gray-400">PR Terkait</p><p class="text-sm">{{ tx.pr_reference || '—' }}</p></div>
      </div>
      <div v-if="tx.notes" class="mt-4 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">{{ tx.notes }}</div>
    </div>

    <!-- Approval Pipeline -->
    <div class="card">
      <h3 class="font-semibold text-gray-900 mb-4">Status Persetujuan</h3>
      <div class="space-y-3">
        <div v-for="stage in pipeline" :key="stage.label" class="flex items-center gap-3">
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            stage.status === 'approved' ? 'bg-green-100 text-green-700' :
            stage.status === 'rejected' ? 'bg-red-100 text-red-700' :
            stage.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400']">
            {{ stage.status === 'approved' ? '✓' : stage.status === 'rejected' ? '✕' : stage.status === 'submitted' ? '→' : '○' }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{{ stage.label }}</p>
            <p class="text-xs text-gray-400">{{ stage.actor }} · {{ stage.statusLabel }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Card -->
    <div v-if="canAct" class="card border-2 border-green-200">
      <h3 class="font-semibold text-gray-900 mb-3">{{ actionTitle }}</h3>

      <!-- Archive proof upload (Staff Keuangan) -->
      <div v-if="auth.role === 'staff_keuangan' && tx.ceo_status === 'approved' && !tx.transfer_proof_path">
        <div class="mb-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Upload Bukti Transfer</label>
          <input type="file" @change="onFile" accept="image/*,.pdf" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
        </div>
        <button @click="archiveProof" :disabled="acting || !proofFile" class="btn-primary text-sm disabled:opacity-60">
          {{ acting ? 'Mengarsipkan...' : 'Arsipkan & Update Buku Besar' }}
        </button>
      </div>

      <!-- Finance Manager actions -->
      <div v-else-if="auth.role === 'finance_manager' && tx.maker_status === 'submitted' && tx.approver_status === 'pending'">
        <textarea v-model="actionNotes" rows="2" placeholder="Catatan (opsional)" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none mb-3 resize-none" />
        <div class="flex gap-3">
          <button @click="act('approve-finance')" :disabled="acting" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">✓ Setujui</button>
          <button @click="act('reject-finance')" :disabled="acting" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">✕ Tolak</button>
        </div>
      </div>

      <!-- CEO actions -->
      <div v-else-if="auth.role === 'ceo' && tx.approver_status === 'approved' && tx.ceo_status === 'pending'">
        <textarea v-model="actionNotes" rows="2" placeholder="Catatan (opsional)" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none mb-3 resize-none" />
        <div class="flex gap-3">
          <button @click="act('approve-ceo')" :disabled="acting" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">✓ Final Approve</button>
          <button @click="act('reject-ceo')" :disabled="acting" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">✕ Tolak</button>
        </div>
      </div>
    </div>

    <div v-if="tx.transfer_proof_path" class="card bg-green-50 border border-green-200">
      <p class="text-sm font-semibold text-green-800">✓ Bukti transfer sudah diarsipkan</p>
      <p class="text-xs text-green-600 mt-1">Buku besar telah diperbarui secara otomatis.</p>
    </div>
  </div>
  <div v-else class="text-center py-12 text-gray-400">Memuat...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const tx = ref<any>(null);
const actionNotes = ref('');
const acting = ref(false);
const proofFile = ref<File | null>(null);

const ACCOUNT_LABELS: Record<string, string> = { snbs_mandiri: 'SNBS Mandiri', kups_bni: 'KUPS BNI', cash_on_hand: 'Cash On Hand', ending_balance: 'Ending Balance', cash_injection: 'Cash Injection', direct_selling_kups: 'Direct Selling via KUPS', profit_sharing_kups: 'Profit KUPS', external: 'Eksternal' };
const accountLabel = (k: string) => ACCOUNT_LABELS[k] || k;
const fmtIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

const pipeline = computed(() => tx.value ? [
  { label: 'Input Transaksi (Maker)', actor: tx.value.maker_name, status: tx.value.maker_status, statusLabel: tx.value.maker_status === 'submitted' ? 'Disubmit' : 'Draft' },
  { label: 'Persetujuan Finance Manager', actor: tx.value.approver_name || 'Finance Manager', status: tx.value.approver_status, statusLabel: tx.value.approver_status },
  { label: 'Final Approval CEO', actor: tx.value.ceo_approver_name || 'CEO', status: tx.value.ceo_status, statusLabel: tx.value.ceo_status },
  { label: 'Arsip Bukti Transfer', actor: 'Staff Keuangan', status: tx.value.transfer_proof_path ? 'approved' : 'pending', statusLabel: tx.value.transfer_proof_path ? 'Selesai' : 'Menunggu' },
] : []);

const canAct = computed(() => {
  if (!tx.value) return false;
  if (auth.role === 'staff_keuangan' && tx.value.ceo_status === 'approved' && !tx.value.transfer_proof_path) return true;
  if (auth.role === 'finance_manager' && tx.value.maker_status === 'submitted' && tx.value.approver_status === 'pending') return true;
  if (auth.role === 'ceo' && tx.value.approver_status === 'approved' && tx.value.ceo_status === 'pending') return true;
  return false;
});
const actionTitle = computed(() => {
  if (auth.role === 'staff_keuangan') return 'Arsipkan Bukti Transfer';
  if (auth.role === 'finance_manager') return 'Persetujuan Finance Manager';
  return 'Final Approval CEO';
});

function onFile(e: Event) { proofFile.value = (e.target as HTMLInputElement).files?.[0] || null; }

async function load() {
  const { data } = await axios.get(`/api/ebanking/${route.params.id}`);
  tx.value = data;
}

async function act(endpoint: string) {
  acting.value = true;
  try {
    await axios.post(`/api/ebanking/${route.params.id}/${endpoint}`, { notes: actionNotes.value });
    await load();
  } finally { acting.value = false; }
}

async function archiveProof() {
  if (!proofFile.value) return;
  acting.value = true;
  try {
    const fd = new FormData();
    fd.append('proof', proofFile.value);
    await axios.post(`/api/ebanking/${route.params.id}/archive-proof`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    await load();
  } catch (e: any) {
    alert(e.response?.data?.error || 'Gagal');
  } finally { acting.value = false; }
}

onMounted(load);
</script>
