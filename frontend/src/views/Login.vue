<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(135deg, #052e16 0%, #14532d 50%, #1a4731 100%);">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg">
          <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Finance App Fairventures</h1>
        <p class="text-green-300 text-sm mt-1">Sistem Keuangan Fairventures</p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Masuk ke akun Anda</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="nama@perusahaan.com"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="form.password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-green-700 text-white py-2.5 rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <!-- Demo accounts -->
        <div class="mt-6 pt-6 border-t border-gray-100">
          <p class="text-xs text-gray-500 mb-3">Akun demo (password: password123)</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="demo in demoAccounts"
              :key="demo.email"
              @click="fillDemo(demo)"
              class="text-left px-3 py-2 bg-gray-50 hover:bg-green-50 rounded-lg text-xs transition-colors border border-gray-200 hover:border-green-200"
            >
              <span class="block font-medium text-gray-700">{{ demo.label }}</span>
              <span class="text-gray-400">{{ demo.email }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const form = ref({ email: '', password: '' });
const loading = ref(false);
const error = ref('');

const demoAccounts = [
  { label: 'CEO', email: 'ceo@company.com' },
  { label: 'Finance Manager', email: 'finance@company.com' },
  { label: 'Staff Keuangan', email: 'staff@company.com' },
  { label: 'Project Manager', email: 'pm@company.com' },
  { label: 'Kasir', email: 'kasir@company.com' },
  { label: 'Staff Lapangan', email: 'lapangan@company.com' },
];

function fillDemo(demo: { label: string; email: string }) {
  form.value.email = demo.email;
  form.value.password = 'password123';
}

async function handleLogin() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await axios.post('/api/auth/login', form.value);
    auth.setAuth(data.token, data.user);
    router.push('/dashboard');
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Login gagal. Periksa email dan password Anda.';
  } finally {
    loading.value = false;
  }
}
</script>
