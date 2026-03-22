<template>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="card flex items-center justify-between py-3">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Diagram Alur Kerja SOP</h2>
        <p class="text-xs text-gray-400 mt-0.5">Finance App Fairventures — 4 fase, 6 peran</p>
      </div>
      <div class="flex items-center gap-3">
        <label class="text-xs text-gray-500 font-medium">Zoom</label>
        <input type="range" min="50" max="200" v-model="zoom" class="w-28 accent-green-600" />
        <span class="text-xs text-gray-600 w-10">{{ zoom }}%</span>
        <a href="/workflow-diagram.png" download="SOP-Finance-Fairventures.png"
           class="btn-primary text-xs flex items-center gap-1.5">
          &#8595; Unduh PNG
        </a>
      </div>
    </div>

    <!-- Diagram image -->
    <div class="card p-3 overflow-auto" style="max-height: 80vh;">
      <div :style="{ width: zoom + '%', minWidth: zoom + '%' }">
        <img
          src="/workflow-diagram.png"
          alt="Diagram Alur Kerja SOP Finance App Fairventures"
          class="w-full h-auto rounded-xl shadow-sm"
        />
      </div>
    </div>

    <!-- Role legend -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      <div v-for="role in roles" :key="role.name"
           class="card py-3 px-3 border-l-4 text-center"
           :style="{ borderLeftColor: role.color }">
        <p class="text-xs font-semibold text-gray-700">{{ role.name }}</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ role.desc }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const zoom = ref(100);

const roles = [
  { name: 'Project Manager',  desc: 'Pengajuan & monitoring', color: '#2d6a4f' },
  { name: 'Finance Manager',  desc: 'Validasi & rekonsiliasi', color: '#0c7490' },
  { name: 'Staff Keuangan',   desc: 'E-Banking & GL',          color: '#1d4e89' },
  { name: 'CEO',              desc: 'Persetujuan final',        color: '#856404' },
  { name: 'Kasir',            desc: 'Kas & verifikasi',         color: '#842029' },
  { name: 'Staff Lapangan',   desc: 'Pembelian komoditas',      color: '#5a3285' },
];
</script>
