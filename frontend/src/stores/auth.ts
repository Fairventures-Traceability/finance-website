import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'project_manager' | 'finance_manager' | 'staff_keuangan' | 'ceo' | 'kasir' | 'staff_lapangan';
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const _parseUser = (): AuthUser | null => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  };
  const user = ref<AuthUser | null>(_parseUser());

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const role = computed(() => user.value?.role || null);

  function setAuth(newToken: string, newUser: AuthUser) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  }

  // Restore auth header on page load
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
  }

  return { token, user, isAuthenticated, role, setAuth, logout };
});
