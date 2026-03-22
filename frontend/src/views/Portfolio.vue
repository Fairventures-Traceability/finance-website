<template>
  <div class="space-y-6">
    <!-- Portfolio Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card">
        <p class="text-sm text-gray-500 font-medium">Portfolio Value</p>
        <p class="text-3xl font-bold text-gray-900 mt-1">{{ formatCurrency(portfolio.totalValue) }}</p>
        <p class="text-sm text-green-600 font-medium mt-2">+{{ formatCurrency(portfolio.dayChange) }} today ({{ portfolio.dayChangePercent }}%)</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500 font-medium">Total Gain/Loss</p>
        <p class="text-3xl font-bold text-green-600 mt-1">+{{ formatCurrency(portfolio.totalGain) }}</p>
        <p class="text-sm text-gray-400 mt-2">+{{ portfolio.totalGainPercent }}% all time</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500 font-medium">Asset Allocation</p>
        <div class="mt-3 space-y-2">
          <div v-for="alloc in portfolio.allocation" :key="alloc.category" class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-gray-100 rounded-full">
              <div class="h-1.5 rounded-full bg-blue-500" :style="{ width: `${alloc.percentage}%` }"></div>
            </div>
            <span class="text-xs text-gray-500 w-24 text-right">{{ alloc.category }} ({{ alloc.percentage }}%)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Holdings Table -->
    <div class="card p-0 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Holdings</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Symbol</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Shares</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Cost</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Price</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Market Value</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Gain/Loss</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="holding in portfolio.holdings" :key="holding.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <span class="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">{{ holding.symbol }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">{{ holding.name }}</td>
              <td class="px-6 py-4 text-sm text-gray-900 text-right">{{ holding.shares }}</td>
              <td class="px-6 py-4 text-sm text-gray-900 text-right">{{ formatCurrency(holding.avgCost) }}</td>
              <td class="px-6 py-4 text-sm text-gray-900 text-right font-medium">{{ formatCurrency(holding.currentPrice) }}</td>
              <td class="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{{ formatCurrency(holding.value) }}</td>
              <td class="px-6 py-4 text-right">
                <div :class="['text-sm font-semibold', holding.gain >= 0 ? 'text-green-600' : 'text-red-600']">
                  {{ holding.gain >= 0 ? '+' : '' }}{{ formatCurrency(holding.gain) }}
                </div>
                <div :class="['text-xs', holding.gainPercent >= 0 ? 'text-green-500' : 'text-red-500']">
                  {{ holding.gainPercent >= 0 ? '+' : '' }}{{ holding.gainPercent }}%
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import axios from 'axios';

const portfolio = reactive({
  totalValue: 0,
  totalGain: 0,
  totalGainPercent: 0,
  dayChange: 0,
  dayChangePercent: 0,
  holdings: [] as Array<{
    id: number; symbol: string; name: string; shares: number;
    avgCost: number; currentPrice: number; value: number; gain: number; gainPercent: number;
  }>,
  allocation: [] as Array<{ category: string; percentage: number; value: number }>,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(value));

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/portfolio');
    Object.assign(portfolio, data);
  } catch {
    Object.assign(portfolio, {
      totalValue: 148320.50,
      totalGain: 23540.25,
      totalGainPercent: 18.9,
      dayChange: 1240.50,
      dayChangePercent: 0.84,
      holdings: [
        { id: 1, symbol: 'AAPL', name: 'Apple Inc.', shares: 45, avgCost: 148.20, currentPrice: 178.90, value: 8050.50, gain: 1381.50, gainPercent: 20.7 },
        { id: 2, symbol: 'MSFT', name: 'Microsoft Corp.', shares: 30, avgCost: 285.40, currentPrice: 378.65, value: 11359.50, gain: 2797.50, gainPercent: 32.7 },
        { id: 3, symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, avgCost: 125.80, currentPrice: 152.40, value: 3810.00, gain: 665.00, gainPercent: 21.1 },
        { id: 4, symbol: 'TSLA', name: 'Tesla Inc.', shares: 15, avgCost: 238.90, currentPrice: 185.20, value: 2778.00, gain: -805.50, gainPercent: -22.5 },
        { id: 5, symbol: 'SPY', name: 'S&P 500 ETF', shares: 100, avgCost: 430.20, currentPrice: 498.35, value: 49835.00, gain: 6815.00, gainPercent: 15.8 },
      ],
      allocation: [
        { category: 'US Stocks', percentage: 55, value: 81576.28 },
        { category: 'ETFs', percentage: 30, value: 44496.15 },
        { category: 'Bonds', percentage: 10, value: 14832.05 },
        { category: 'Cash', percentage: 5, value: 7416.03 },
      ],
    });
  }
});
</script>
