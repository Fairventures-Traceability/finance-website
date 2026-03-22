import { Router, Request, Response } from 'express';

export const router = Router();

const portfolioData = {
  totalValue: 148320.50,
  totalGain: 23540.25,
  totalGainPercent: 18.9,
  dayChange: 1240.50,
  dayChangePercent: 0.84,
  holdings: [
    { id: 1, symbol: 'AAPL', name: 'Apple Inc.', shares: 45, avgCost: 148.20, currentPrice: 178.90, value: 8050.50, gain: 1381.50, gainPercent: 20.7 },
    { id: 2, symbol: 'MSFT', name: 'Microsoft Corp.', shares: 30, avgCost: 285.40, currentPrice: 378.65, value: 11359.50, gain: 2797.50, gainPercent: 32.7 },
    { id: 3, symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, avgCost: 125.80, currentPrice: 152.40, value: 3810.00, gain: 665.00, gainPercent: 21.1 },
    { id: 4, symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 20, avgCost: 142.50, currentPrice: 168.75, value: 3375.00, gain: 525.00, gainPercent: 18.4 },
    { id: 5, symbol: 'TSLA', name: 'Tesla Inc.', shares: 15, avgCost: 238.90, currentPrice: 185.20, value: 2778.00, gain: -805.50, gainPercent: -22.5 },
    { id: 6, symbol: 'SPY', name: 'S&P 500 ETF', shares: 100, avgCost: 430.20, currentPrice: 498.35, value: 49835.00, gain: 6815.00, gainPercent: 15.8 },
  ],
  allocation: [
    { category: 'US Stocks', percentage: 55, value: 81576.28 },
    { category: 'ETFs', percentage: 30, value: 44496.15 },
    { category: 'Bonds', percentage: 10, value: 14832.05 },
    { category: 'Cash', percentage: 5, value: 7416.03 },
  ],
};

router.get('/', (_req: Request, res: Response) => {
  res.json(portfolioData);
});
