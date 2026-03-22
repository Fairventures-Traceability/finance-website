<template>
  <!-- Full-screen modal overlay -->
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style="width:96vw;max-width:1200px;height:92vh">

      <!-- ── Top bar ── -->
      <div class="flex items-center justify-between bg-white px-6 py-3 border-b border-gray-200 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold">F</div>
          <div>
            <p class="text-xs text-gray-400 leading-none font-mono">{{ prRef }}</p>
            <p class="font-bold text-gray-900 text-sm leading-tight">{{ DOC_META[docType].title }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="printDoc" class="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Cetak / PDF
          </button>
          <button @click="uploadDoc" :disabled="saving" class="text-xs bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800 disabled:opacity-60 font-semibold flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            {{ saving ? 'Menyimpan...' : 'Simpan ke PR' }}
          </button>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-700 ml-2 text-xl leading-none">&times;</button>
        </div>
      </div>

      <!-- ── Split body ── -->
      <div class="flex flex-1 overflow-hidden gap-0">

        <!-- LEFT: Form panel -->
        <div class="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail Dokumen</p>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-4">

            <!-- ── Header fields (all types) ── -->
            <div>
              <label class="lbl">Tanggal Dokumen</label>
              <input v-model="d.date" type="date" class="inp" />
            </div>
            <div v-if="docType !== 'proforma_invoice'">
              <label class="lbl">Periode</label>
              <input v-model="d.period" class="inp" :placeholder="docType==='previous_fund_usage_report' ? 'Februari 2026' : 'Maret – April 2026'" />
            </div>

            <!-- ── Proforma Invoice fields ── -->
            <template v-if="docType==='proforma_invoice'">
              <div>
                <label class="lbl">Supplier / Vendor</label>
                <input v-model="d.supplier" class="inp" placeholder="CV Agri Makmur" />
              </div>
              <div>
                <label class="lbl">Alamat Supplier</label>
                <textarea v-model="d.supplier_address" rows="2" class="inp resize-none" placeholder="Jl. Pertanian No.12, Sulawesi" />
              </div>
              <div>
                <label class="lbl">Catatan</label>
                <textarea v-model="d.notes" rows="2" class="inp resize-none" placeholder="Keterangan tambahan..." />
              </div>
            </template>

            <!-- ── Fund report extra ── -->
            <template v-if="docType==='previous_fund_usage_report'">
              <div>
                <label class="lbl">Total Dana Diterima (Rp)</label>
                <input v-model.number="d.fund_received" type="number" min="0" class="inp text-right" />
              </div>
            </template>

            <!-- ── Item rows ── -->
            <div class="border-t border-gray-100 pt-3">
              <div class="flex items-center justify-between mb-2">
                <p class="lbl mb-0">{{ itemLabel }}</p>
                <button @click="addRow" class="text-xs text-green-700 font-semibold hover:underline">+ Tambah</button>
              </div>
              <div v-for="(item, i) in d.items" :key="i" class="bg-gray-50 rounded-xl p-3 mb-2 relative">
                <button @click="d.items.splice(i,1)" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-sm leading-none">&times;</button>

                <!-- Invoice item -->
                <template v-if="docType==='proforma_invoice'">
                  <input v-model="item.commodity" class="inp mb-1.5" placeholder="Nama Komoditas" />
                  <div class="grid grid-cols-2 gap-1.5">
                    <div>
                      <label class="lbl">Qty (kg)</label>
                      <input v-model.number="item.qty_kg" type="number" min="0" class="inp text-right" @input="calcSubtotal(item)" />
                    </div>
                    <div>
                      <label class="lbl">Harga/kg</label>
                      <input v-model.number="item.price_per_kg" type="number" min="0" class="inp text-right" @input="calcSubtotal(item)" />
                    </div>
                  </div>
                  <p class="text-right text-xs text-green-700 font-bold mt-1.5">{{ fmtIDR(item.subtotal) }}</p>
                </template>

                <!-- Estimate item -->
                <template v-if="docType==='fund_estimate'">
                  <input v-model="item.category" class="inp mb-1.5" placeholder="Kategori (mis. Pembelian Kopi)" />
                  <input v-model="item.description" class="inp mb-1.5" placeholder="Uraian kebutuhan..." />
                  <div>
                    <label class="lbl">Jumlah (Rp)</label>
                    <input v-model.number="item.amount" type="number" min="0" class="inp text-right" />
                  </div>
                  <p class="text-right text-xs text-blue-700 font-bold mt-1">{{ fmtIDR(item.amount) }}</p>
                </template>

                <!-- Recap item -->
                <template v-if="docType==='commodity_recap'">
                  <input v-model="item.commodity" class="inp mb-1.5" placeholder="Jenis Komoditas" />
                  <div class="grid grid-cols-2 gap-1.5">
                    <div>
                      <label class="lbl">Qty (kg)</label>
                      <input v-model.number="item.qty_kg" type="number" min="0" class="inp text-right" @input="calcAvg(item)" />
                    </div>
                    <div>
                      <label class="lbl">Total Nilai</label>
                      <input v-model.number="item.total_value" type="number" min="0" class="inp text-right" @input="calcAvg(item)" />
                    </div>
                  </div>
                  <p class="text-right text-xs text-purple-700 font-bold mt-1">Avg: {{ fmtIDR(item.avg_price) }}/kg</p>
                </template>

                <!-- Fund usage item -->
                <template v-if="docType==='previous_fund_usage_report'">
                  <input v-model="item.category" class="inp mb-1.5" placeholder="Kategori Penggunaan" />
                  <div>
                    <label class="lbl">Jumlah (Rp)</label>
                    <input v-model.number="item.amount" type="number" min="0" class="inp text-right" />
                  </div>
                  <p class="text-right text-xs text-orange-700 font-bold mt-1">{{ fmtIDR(item.amount) }}</p>
                </template>

              </div>
            </div>

            <!-- Totals summary -->
            <div class="bg-green-50 rounded-xl p-3 text-xs space-y-1">
              <template v-if="docType==='proforma_invoice'">
                <div class="flex justify-between font-bold text-green-800">
                  <span>Total Invoice</span><span>{{ fmtIDR(invoiceTotal) }}</span>
                </div>
              </template>
              <template v-if="docType==='fund_estimate'">
                <div class="flex justify-between font-bold text-blue-800">
                  <span>Total Estimasi</span><span>{{ fmtIDR(estimateTotal) }}</span>
                </div>
              </template>
              <template v-if="docType==='commodity_recap'">
                <div class="flex justify-between text-gray-600"><span>Total Qty</span><span class="font-semibold">{{ fmtNum(recapTotalQty) }} kg</span></div>
                <div class="flex justify-between font-bold text-purple-800"><span>Total Nilai</span><span>{{ fmtIDR(recapTotalVal) }}</span></div>
              </template>
              <template v-if="docType==='previous_fund_usage_report'">
                <div class="flex justify-between text-gray-600"><span>Diterima</span><span class="font-semibold text-green-700">{{ fmtIDR(d.fund_received) }}</span></div>
                <div class="flex justify-between text-gray-600"><span>Terpakai</span><span class="font-semibold text-orange-700">{{ fmtIDR(reportTotalUsed) }}</span></div>
                <div class="border-t border-green-200 pt-1 flex justify-between font-bold" :class="reportRemaining >= 0 ? 'text-green-800' : 'text-red-700'">
                  <span>Sisa Dana</span><span>{{ fmtIDR(reportRemaining) }}</span>
                </div>
              </template>
            </div>

          </div>
        </div>

        <!-- RIGHT: Live document preview -->
        <div class="flex-1 overflow-y-auto bg-gray-200 p-6">
          <div class="bg-white rounded-xl shadow-lg mx-auto p-10 text-sm" style="max-width:720px;min-height:900px" id="doc-preview-content">

            <!-- Letterhead -->
            <div class="flex items-start justify-between mb-8 pb-5 border-b-2 border-green-700">
              <div>
                <p class="text-2xl font-black text-green-900 tracking-wider">KOPERASI FAIRVENTURES</p>
                <p class="text-xs text-gray-500 mt-0.5">Koperasi Agribisnis Komoditas Berkelanjutan</p>
                <p class="text-xs text-gray-400">info@fairventures.coop  ·  (021) 000-0000</p>
              </div>
              <div class="text-right">
                <span class="inline-block bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">{{ DOC_META[docType].title }}</span>
                <p class="text-xs text-gray-500 mt-2">No. Ref: <strong class="font-mono text-gray-700">{{ prRef }}</strong></p>
                <p class="text-xs text-gray-500">Tanggal: <strong>{{ fmtDate(d.date) }}</strong></p>
              </div>
            </div>

            <!-- ── Proforma Invoice ── -->
            <template v-if="docType==='proforma_invoice'">
              <div class="mb-6">
                <p class="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Kepada Yth.</p>
                <p class="font-bold text-gray-900 text-base">{{ d.supplier || '—' }}</p>
                <p class="text-sm text-gray-500">{{ d.supplier_address || '' }}</p>
              </div>
              <table class="w-full text-xs mb-6 rounded-xl overflow-hidden">
                <thead>
                  <tr class="bg-green-700 text-white">
                    <th class="px-4 py-3 text-left font-semibold w-8">No.</th>
                    <th class="px-4 py-3 text-left font-semibold">Komoditas</th>
                    <th class="px-4 py-3 text-right font-semibold w-20">Qty (kg)</th>
                    <th class="px-4 py-3 text-right font-semibold w-28">Harga/kg</th>
                    <th class="px-4 py-3 text-right font-semibold w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in d.items" :key="i" :class="i%2===0 ? 'bg-gray-50' : 'bg-white'">
                    <td class="px-4 py-2.5 text-gray-400">{{ i+1 }}.</td>
                    <td class="px-4 py-2.5 font-medium text-gray-900">{{ item.commodity || '—' }}</td>
                    <td class="px-4 py-2.5 text-right text-gray-600">{{ fmtNum(item.qty_kg) }}</td>
                    <td class="px-4 py-2.5 text-right text-gray-600">{{ fmtIDR(item.price_per_kg) }}</td>
                    <td class="px-4 py-2.5 text-right font-semibold text-gray-800">{{ fmtIDR(item.subtotal) }}</td>
                  </tr>
                  <tr v-if="!d.items.length"><td colspan="5" class="px-4 py-4 text-center text-gray-300 italic text-xs">Belum ada item</td></tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-green-700 bg-green-50">
                    <td colspan="4" class="px-4 py-3 text-right font-black text-green-900 tracking-wide">TOTAL</td>
                    <td class="px-4 py-3 text-right font-black text-green-800 text-base">{{ fmtIDR(invoiceTotal) }}</td>
                  </tr>
                </tfoot>
              </table>
              <div v-if="d.notes" class="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span class="font-semibold text-amber-800">Catatan:</span> {{ d.notes }}
              </div>
            </template>

            <!-- ── Estimasi Dana ── -->
            <template v-if="docType==='fund_estimate'">
              <div class="mb-6 grid grid-cols-2 gap-4">
                <div class="bg-gray-50 rounded-xl p-4">
                  <p class="text-xs text-gray-500 uppercase tracking-wide font-semibold">Periode</p>
                  <p class="font-bold text-gray-900 mt-1">{{ d.period || '—' }}</p>
                </div>
                <div class="bg-blue-50 rounded-xl p-4">
                  <p class="text-xs text-blue-600 uppercase tracking-wide font-semibold">Total Estimasi</p>
                  <p class="font-black text-blue-800 text-lg mt-1">{{ fmtIDR(estimateTotal) }}</p>
                </div>
              </div>
              <table class="w-full text-xs mb-6 rounded-xl overflow-hidden">
                <thead>
                  <tr class="bg-blue-700 text-white">
                    <th class="px-4 py-3 text-left w-8">No.</th>
                    <th class="px-4 py-3 text-left w-36">Kategori</th>
                    <th class="px-4 py-3 text-left">Uraian Kebutuhan</th>
                    <th class="px-4 py-3 text-right w-36">Estimasi (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in d.items" :key="i" :class="i%2===0 ? 'bg-gray-50' : 'bg-white'">
                    <td class="px-4 py-2.5 text-gray-400">{{ i+1 }}.</td>
                    <td class="px-4 py-2.5 font-medium">{{ item.category || '—' }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ item.description || '—' }}</td>
                    <td class="px-4 py-2.5 text-right font-semibold">{{ fmtIDR(item.amount) }}</td>
                  </tr>
                  <tr v-if="!d.items.length"><td colspan="4" class="px-4 py-4 text-center text-gray-300 italic text-xs">Belum ada item</td></tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-blue-700 bg-blue-50">
                    <td colspan="3" class="px-4 py-3 text-right font-black text-blue-900">TOTAL ESTIMASI</td>
                    <td class="px-4 py-3 text-right font-black text-blue-800 text-base">{{ fmtIDR(estimateTotal) }}</td>
                  </tr>
                </tfoot>
              </table>
            </template>

            <!-- ── Rekap Komoditas ── -->
            <template v-if="docType==='commodity_recap'">
              <div class="mb-6 grid grid-cols-3 gap-4">
                <div class="bg-gray-50 rounded-xl p-4 col-span-1">
                  <p class="text-xs text-gray-500 uppercase tracking-wide font-semibold">Periode</p>
                  <p class="font-bold text-gray-900 mt-1">{{ d.period || '—' }}</p>
                </div>
                <div class="bg-purple-50 rounded-xl p-4">
                  <p class="text-xs text-purple-600 uppercase tracking-wide font-semibold">Total Qty</p>
                  <p class="font-black text-purple-800 text-lg mt-1">{{ fmtNum(recapTotalQty) }} <span class="text-sm font-normal">kg</span></p>
                </div>
                <div class="bg-purple-50 rounded-xl p-4">
                  <p class="text-xs text-purple-600 uppercase tracking-wide font-semibold">Total Nilai</p>
                  <p class="font-black text-purple-800 text-base mt-1">{{ fmtIDR(recapTotalVal) }}</p>
                </div>
              </div>
              <table class="w-full text-xs mb-6 rounded-xl overflow-hidden">
                <thead>
                  <tr class="bg-purple-700 text-white">
                    <th class="px-4 py-3 text-left w-8">No.</th>
                    <th class="px-4 py-3 text-left">Jenis Komoditas</th>
                    <th class="px-4 py-3 text-right w-24">Qty (kg)</th>
                    <th class="px-4 py-3 text-right w-36">Total Nilai</th>
                    <th class="px-4 py-3 text-right w-32">Rata-rata/kg</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in d.items" :key="i" :class="i%2===0 ? 'bg-gray-50' : 'bg-white'">
                    <td class="px-4 py-2.5 text-gray-400">{{ i+1 }}.</td>
                    <td class="px-4 py-2.5 font-medium">{{ item.commodity || '—' }}</td>
                    <td class="px-4 py-2.5 text-right">{{ fmtNum(item.qty_kg) }}</td>
                    <td class="px-4 py-2.5 text-right font-semibold">{{ fmtIDR(item.total_value) }}</td>
                    <td class="px-4 py-2.5 text-right text-gray-500">{{ fmtIDR(item.avg_price) }}</td>
                  </tr>
                  <tr v-if="!d.items.length"><td colspan="5" class="px-4 py-4 text-center text-gray-300 italic text-xs">Belum ada item</td></tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-purple-700 bg-purple-50">
                    <td colspan="2" class="px-4 py-3 font-black text-purple-900 text-right">TOTAL</td>
                    <td class="px-4 py-3 text-right font-black text-purple-800">{{ fmtNum(recapTotalQty) }} kg</td>
                    <td class="px-4 py-3 text-right font-black text-purple-800 text-base">{{ fmtIDR(recapTotalVal) }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </template>

            <!-- ── Laporan Penggunaan Dana ── -->
            <template v-if="docType==='previous_fund_usage_report'">
              <div class="mb-6 grid grid-cols-3 gap-4">
                <div class="bg-gray-50 rounded-xl p-4">
                  <p class="text-xs text-gray-500 uppercase tracking-wide font-semibold">Periode Lalu</p>
                  <p class="font-bold text-gray-900 mt-1">{{ d.period || '—' }}</p>
                </div>
                <div class="bg-green-50 rounded-xl p-4">
                  <p class="text-xs text-green-600 uppercase tracking-wide font-semibold">Dana Diterima</p>
                  <p class="font-black text-green-800 text-base mt-1">{{ fmtIDR(d.fund_received) }}</p>
                </div>
                <div class="rounded-xl p-4" :class="reportRemaining >= 0 ? 'bg-green-50' : 'bg-red-50'">
                  <p class="text-xs uppercase tracking-wide font-semibold" :class="reportRemaining >= 0 ? 'text-green-600' : 'text-red-600'">Sisa Dana</p>
                  <p class="font-black text-base mt-1" :class="reportRemaining >= 0 ? 'text-green-800' : 'text-red-700'">{{ fmtIDR(reportRemaining) }}</p>
                </div>
              </div>
              <table class="w-full text-xs mb-6 rounded-xl overflow-hidden">
                <thead>
                  <tr class="bg-orange-600 text-white">
                    <th class="px-4 py-3 text-left w-8">No.</th>
                    <th class="px-4 py-3 text-left">Kategori Penggunaan</th>
                    <th class="px-4 py-3 text-right w-36">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in d.items" :key="i" :class="i%2===0 ? 'bg-gray-50' : 'bg-white'">
                    <td class="px-4 py-2.5 text-gray-400">{{ i+1 }}.</td>
                    <td class="px-4 py-2.5 font-medium">{{ item.category || '—' }}</td>
                    <td class="px-4 py-2.5 text-right font-semibold">{{ fmtIDR(item.amount) }}</td>
                  </tr>
                  <tr v-if="!d.items.length"><td colspan="3" class="px-4 py-4 text-center text-gray-300 italic text-xs">Belum ada item</td></tr>
                </tbody>
                <tfoot>
                  <tr class="border-t border-orange-200 bg-orange-50">
                    <td colspan="2" class="px-4 py-3 text-right font-bold text-gray-700">Total Terpakai</td>
                    <td class="px-4 py-3 text-right font-bold text-orange-700">{{ fmtIDR(reportTotalUsed) }}</td>
                  </tr>
                  <tr class="border-t-2 border-orange-600 bg-orange-50">
                    <td colspan="2" class="px-4 py-3 text-right font-black text-gray-800">Sisa Dana</td>
                    <td class="px-4 py-3 text-right font-black text-base" :class="reportRemaining >= 0 ? 'text-green-700' : 'text-red-600'">{{ fmtIDR(reportRemaining) }}</td>
                  </tr>
                </tfoot>
              </table>
            </template>

            <!-- Signature block -->
            <div class="mt-12 pt-6 border-t border-gray-200">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4rem;text-align:center">
                <div>
                  <p class="text-xs text-gray-500">Dibuat oleh,</p>
                  <div style="height:3.5rem;border-bottom:1px dashed #d1d5db;margin:1.5rem 2rem 0.5rem"></div>
                  <p class="text-xs font-semibold text-gray-700">( Project Manager )</p>
                  <p class="text-xs text-gray-400 mt-1">Tanggal: ___________________</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Disetujui oleh,</p>
                  <div style="height:3.5rem;border-bottom:1px dashed #d1d5db;margin:1.5rem 2rem 0.5rem"></div>
                  <p class="text-xs font-semibold text-gray-700">( Finance Manager )</p>
                  <p class="text-xs text-gray-400 mt-1">Tanggal: ___________________</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import axios from 'axios';
import { ref } from 'vue';

const props = defineProps<{
  docType: string;
  prRef: string;
  prId: number;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const saving = ref(false);

const DOC_META: Record<string, { title: string }> = {
  proforma_invoice:           { title: 'Proforma Invoice' },
  fund_estimate:              { title: 'Estimasi Dana' },
  commodity_recap:            { title: 'Rekap Komoditas' },
  previous_fund_usage_report: { title: 'Laporan Penggunaan Dana Sebelumnya' },
};

const itemLabel: Record<string, string> = {
  proforma_invoice: 'Item Komoditas',
  fund_estimate: 'Rincian Estimasi',
  commodity_recap: 'Daftar Komoditas',
  previous_fund_usage_report: 'Rincian Penggunaan',
}[props.docType] ?? 'Item';

// ── Form state ───────────────────────────────────────────────────────────────
const d = reactive<any>(buildDefault());

function buildDefault() {
  const today = new Date().toISOString().slice(0, 10);
  if (props.docType === 'proforma_invoice')
    return { supplier:'', supplier_address:'', date:today, notes:'',
             items:[{ commodity:'', qty_kg:0, price_per_kg:0, subtotal:0 }] };
  if (props.docType === 'fund_estimate')
    return { period:'', date:today,
             items:[{ category:'', description:'', amount:0 }] };
  if (props.docType === 'commodity_recap')
    return { period:'', date:today,
             items:[{ commodity:'', qty_kg:0, total_value:0, avg_price:0 }] };
  if (props.docType === 'previous_fund_usage_report')
    return { period:'', date:today, fund_received:0,
             items:[{ category:'', amount:0 }] };
  return {};
}

function addRow() {
  if (props.docType === 'proforma_invoice')
    d.items.push({ commodity:'', qty_kg:0, price_per_kg:0, subtotal:0 });
  else if (props.docType === 'fund_estimate')
    d.items.push({ category:'', description:'', amount:0 });
  else if (props.docType === 'commodity_recap')
    d.items.push({ commodity:'', qty_kg:0, total_value:0, avg_price:0 });
  else
    d.items.push({ category:'', amount:0 });
}

function calcSubtotal(item: any) { item.subtotal = (item.qty_kg||0) * (item.price_per_kg||0); }
function calcAvg(item: any)      { item.avg_price = item.qty_kg ? Math.round((item.total_value||0) / item.qty_kg) : 0; }

const invoiceTotal    = computed(() => d.items?.reduce((s:number, i:any) => s+(i.subtotal||0), 0) ?? 0);
const estimateTotal   = computed(() => d.items?.reduce((s:number, i:any) => s+(i.amount||0), 0) ?? 0);
const recapTotalQty   = computed(() => d.items?.reduce((s:number, i:any) => s+(i.qty_kg||0), 0) ?? 0);
const recapTotalVal   = computed(() => d.items?.reduce((s:number, i:any) => s+(i.total_value||0), 0) ?? 0);
const reportTotalUsed = computed(() => d.items?.reduce((s:number, i:any) => s+(i.amount||0), 0) ?? 0);
const reportRemaining = computed(() => (d.fund_received||0) - reportTotalUsed.value);

// ── Formatters ───────────────────────────────────────────────────────────────
const fmtIDR  = (v:number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(v||0);
const fmtNum  = (v:number) => new Intl.NumberFormat('id-ID').format(v||0);
const fmtDate = (s:string) => s ? new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—';

// ── Shared print CSS (maps all Tailwind classes used in preview) ─────────────
const PRINT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#111827;padding:1.8cm}
/* layout */
.flex{display:flex}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}
.grid{display:grid}.grid-cols-2{grid-template-columns:repeat(2,1fr)}.grid-cols-3{grid-template-columns:repeat(3,1fr)}
.gap-4{gap:1rem}.gap-8{gap:2rem}.gap-16{gap:4rem}
.col-span-1{grid-column:span 1}.overflow-hidden{overflow:hidden}.w-full{width:100%}
.inline-block{display:inline-block}.block{display:block}
/* spacing */
.p-4{padding:1rem}.p-10{padding:2.5rem}.px-4{padding-left:1rem;padding-right:1rem}
.py-3{padding-top:.75rem;padding-bottom:.75rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}
.py-2\.5,.py-2_5{padding-top:.625rem;padding-bottom:.625rem}.py-4{padding-top:1rem;padding-bottom:1rem}
.px-3{padding-left:.75rem;padding-right:.75rem}.pb-5{padding-bottom:1.25rem}.pt-6{padding-top:1.5rem}
.mb-8{margin-bottom:2rem}.mb-6{margin-bottom:1.5rem}.mb-2{margin-bottom:.5rem}.mb-1{margin-bottom:.25rem}
.mb-0\.5,.mb-0_5{margin-bottom:.125rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}
.mt-0\.5,.mt-0_5{margin-top:.125rem}.mt-6{margin-top:1.5rem}.mt-12{margin-top:3rem}
/* typography */
.text-xs{font-size:10px;line-height:1.4}.text-sm{font-size:11px;line-height:1.4}
.text-base{font-size:12px}.text-lg{font-size:15px}.text-2xl{font-size:20px}
.font-bold{font-weight:700}.font-black{font-weight:900}.font-semibold{font-weight:600}
.font-medium{font-weight:500}.font-normal{font-weight:400}
.text-right{text-align:right}.text-left{text-align:left}.text-center{text-align:center}
.uppercase{text-transform:uppercase}.italic{font-style:italic}
.tracking-wide{letter-spacing:.025em}.tracking-wider{letter-spacing:.05em}.tracking-widest{letter-spacing:.1em}
/* text colors */
.text-white{color:#fff}.text-green-900{color:#14532d}.text-green-800{color:#166534}
.text-green-700{color:#15803d}.text-green-600{color:#16a34a}
.text-gray-900{color:#111827}.text-gray-800{color:#1f2937}.text-gray-700{color:#374151}
.text-gray-600{color:#4b5563}.text-gray-500{color:#6b7280}.text-gray-400{color:#9ca3af}
.text-gray-300{color:#d1d5db}
.text-blue-800{color:#1e40af}.text-blue-700{color:#1d4ed8}.text-blue-600{color:#2563eb}
.text-purple-900{color:#4a1d96}.text-purple-800{color:#6b21a8}.text-purple-700{color:#7e22ce}
.text-purple-600{color:#9333ea}
.text-orange-700{color:#c2410c}.text-orange-600{color:#ea580c}
.text-amber-800{color:#92400e}.text-red-700{color:#b91c1c}.text-red-600{color:#dc2626}
/* backgrounds — must force print */
.bg-white{background:#fff!important}.bg-gray-50{background:#f9fafb!important}
.bg-green-50{background:#f0fdf4!important}.bg-green-700{background:#15803d!important;color:#fff!important}
.bg-blue-50{background:#eff6ff!important}.bg-blue-700{background:#1d4ed8!important;color:#fff!important}
.bg-purple-50{background:#faf5ff!important}.bg-purple-700{background:#7e22ce!important;color:#fff!important}
.bg-orange-50{background:#fff7ed!important}.bg-orange-600{background:#ea580c!important;color:#fff!important}
.bg-amber-50{background:#fffbeb!important}.bg-red-50{background:#fef2f2!important}
/* borders */
.border{border:1px solid #e5e7eb}.border-2{border:2px solid}
.border-b{border-bottom:1px solid}.border-b-2{border-bottom:2px solid}
.border-t{border-top:1px solid}.border-t-2{border-top:2px solid}
.border-dashed{border-style:dashed!important}
.border-gray-200{border-color:#e5e7eb}.border-gray-300{border-color:#d1d5db}
.border-green-700{border-color:#15803d}.border-green-200{border-color:#bbf7d0}
.border-blue-700{border-color:#1d4ed8}.border-blue-200{border-color:#bfdbfe}
.border-purple-700{border-color:#7e22ce}.border-purple-200{border-color:#e9d5ff}
.border-orange-200{border-color:#fed7aa}.border-orange-600{border-color:#ea580c}
.border-amber-200{border-color:#fde68a}
/* misc */
.rounded-xl{border-radius:8px}.rounded-full{border-radius:9999px}.h-12{height:3rem}
/* tables */
table{width:100%;border-collapse:collapse}
th,td{padding:7px 10px;border:1px solid #e5e7eb;text-align:left}
th{font-weight:700}
/* print */
@media print{
  -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;
  body{padding:1cm}
}`;

function buildPrintHtml(bodyHtml: string, autoprint = false) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>${DOC_META[props.docType].title} — ${props.prRef}</title>
<style>${PRINT_CSS}</style></head>
<body>${bodyHtml}${autoprint ? '<script>setTimeout(()=>window.print(),400)<\/script>' : ''}</body></html>`;
}

// ── Print ─────────────────────────────────────────────────────────────────────
function printDoc() {
  const el = document.getElementById('doc-preview-content');
  if (!el) return;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(buildPrintHtml(el.innerHTML, true));
  w.document.close();
}

// ── Save: render preview → HTML blob → upload ─────────────────────────────
async function uploadDoc() {
  saving.value = true;
  try {
    await new Promise(r => setTimeout(r, 80));
    const el = document.getElementById('doc-preview-content');
    if (!el) throw new Error('Preview tidak ditemukan');

    const html = buildPrintHtml(el.innerHTML, false);
    const blob = new Blob([html], { type: 'text/html' });
    const fname = `${DOC_META[props.docType].title.replace(/\s+/g,'_')}_${props.prRef}.html`;
    const file = new File([blob], fname, { type: 'text/html' });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', props.docType);
    await axios.post(`/api/payment-requests/${props.prId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    emit('saved');
  } catch (err: any) {
    alert(err.response?.data?.error || err.message || 'Gagal menyimpan');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.lbl { @apply block text-xs font-semibold text-gray-500 mb-1; }
.inp { @apply w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-green-500 outline-none bg-white; }
</style>
