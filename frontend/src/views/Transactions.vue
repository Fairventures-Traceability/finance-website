<template>
  <div class="space-y-6">
    <!-- Filters -->
    <div class="card">
      <div class="flex flex-wrap items-center gap-4">
        <input
          v-model="search"
          type="text"
          placeholder="Search transactions..."
          class="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select v-model="filterType" class="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select v-model="filterCategory" class="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <button class="btn-secondary text-sm">Export CSV</button>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="card p-0 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-900">All Transactions</h2>
        <span class="text-sm text-gray-500">{{ filteredTransactions.length }} records</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="tx in filteredTransactions" :key="tx.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ tx.description }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ tx.category }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ tx.account }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(tx.date) }}</td>
              <td class="px-6 py-4 text-sm font-semibold text-right" :class="tx.amount > 0 ? 'text-green-600' : 'text-red-600'">
                {{ tx.amount > 0 ? '+' : '' }}{{ formatCurrency(tx.amount) }}
              </td>
              <td class="px-6 py-4">
                <span :class="tx.type === 'income' ? 'badge-income' : 'badge-expense'">
                  {{ tx.type }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string;
  date: string;
  category: string;
  account: string;
}

const transactions = ref<Transaction[]>([]);
const search = ref('');
const filterType = ref('');
const filterCategory = ref('');

const categories = computed(() => [...new Set(transactions.value.map(t => t.category))]);

const filteredTransactions = computed(() => {
  return transactions.value.filter(tx => {
    const matchSearch = tx.description.toLowerCase().includes(search.value.toLowerCase());
    const matchType = !filterType.value || tx.type === filterType.value;
    const matchCategory = !filterCategory.value || tx.category === filterCategory.value;
    return matchSearch && matchType && matchCategory;
  });
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(value));

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/transactions');
    transactions.value = data;
  } catch {
    transactions.value = [
      { id: 1, description: 'Salary Deposit', amount: 6200, type: 'income', date: '2026-03-15', category: 'Income', account: 'Business Checking' },
      { id: 2, description: 'Office Rent', amount: -2400, type: 'expense', date: '2026-03-14', category: 'Housing', account: 'Business Checking' },
      { id: 3, description: 'AWS Services', amount: -320.50, type: 'expense', date: '2026-03-13', category: 'Technology', account: 'Business Checking' },
      { id: 4, description: 'Client Payment - Acme Corp', amount: 4500, type: 'income', date: '2026-03-12', category: 'Income', account: 'Business Checking' },
      { id: 5, description: 'Team Lunch', amount: -185, type: 'expense', date: '2026-03-11', category: 'Food', account: 'Business Checking' },
    ];
  }
});
</script>
