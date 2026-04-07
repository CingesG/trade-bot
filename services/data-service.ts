import axios from 'axios';

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 10000; // 10 seconds

export class DataService {
  private static BINANCE_API = 'https://api.binance.com/api/v3';
  private static BRIDGE_URL = process.env.VITE_BRIDGE_URL || 'http://localhost:8001';

  static async fetchPrice(symbol: string, mt5Account?: any): Promise<number> {
    // If bridge is connected, use it for real-time MT5 data
    if (mt5Account && mt5Account.isConnected && mt5Account.useBridge) {
      try {
        const res = await axios.get(`${this.BRIDGE_URL}/price/${symbol}`);
        return res.data.bid; // Using bid as the standard price
      } catch (e) {
        console.error("Bridge price fetch failed, falling back...");
      }
    }

    // If it's a stock or commodity, use mock data for now as Binance doesn't have them
    const isCrypto = ['BTC', 'ETH', 'SOL', 'BNB'].some(c => symbol.includes(c));
    
    if (!isCrypto || (mt5Account && mt5Account.isConnected)) {
      const basePrices: Record<string, number> = {
        'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 151.20, 'AUDUSD': 0.6540, 'USDCAD': 1.3580,
        'XAUUSD': 2350.50, 'XAGUSD': 28.20, 'WTI': 85.40, 'BRENT': 89.60,
        'US30': 38500, 'NAS100': 18200, 'SPX500': 5200, 'GER40': 18100,
        'AAPL': 170.50, 'TSLA': 175.20, 'NVDA': 880.40, 'MSFT': 420.10, 'AMZN': 185.30
      };
      const base = basePrices[symbol] || 1.0;
      return base + (Math.random() - 0.5) * (base * 0.002);
    }

    try {
      const binanceSymbol = symbol.replace('/', '').replace('USD', 'USDT');
      const response = await axios.get(`${this.BINANCE_API}/ticker/price?symbol=${binanceSymbol}`);
      return parseFloat(response.data.price);
    } catch (error) {
      return 1.0;
    }
  }

  static async fetchKlines(symbol: string, interval: string = '1h', limit: number = 100, mt5Account?: any) {
    const cacheKey = `${symbol}_${interval}_${limit}`;
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return cache[cacheKey].data;
    }

    // Use bridge for real MT5 klines
    if (mt5Account && mt5Account.isConnected && mt5Account.useBridge) {
      try {
        const res = await axios.get(`${this.BRIDGE_URL}/klines/${symbol}?timeframe=${interval}&count=${limit}`);
        if (res.data && res.data.length > 0) {
          cache[cacheKey] = { data: res.data, timestamp: Date.now() };
          return res.data;
        }
      } catch (e) {
        console.error("Bridge klines fetch failed, falling back...");
      }
    }

    const isCrypto = ['BTC', 'ETH', 'SOL', 'BNB'].some(c => symbol.includes(c));

    if (!isCrypto || (mt5Account && mt5Account.isConnected)) {
      const basePrices: Record<string, number> = {
        'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 151.20, 'AUDUSD': 0.6540, 'USDCAD': 1.3580,
        'XAUUSD': 2350.50, 'XAGUSD': 28.20, 'WTI': 85.40, 'BRENT': 89.60,
        'US30': 38500, 'NAS100': 18200, 'SPX500': 5200, 'GER40': 18100,
        'AAPL': 170.50, 'TSLA': 175.20, 'NVDA': 880.40, 'MSFT': 420.10, 'AMZN': 185.30
      };
      const base = basePrices[symbol] || 1.0;
      const data = Array.from({ length: limit }).map((_, i) => {
        const close = base + Math.sin(i / 10) * (base * 0.01) + Math.random() * (base * 0.002);
        return {
          time: Date.now() - (limit - i) * 60000,
          open: close * (1 + (Math.random() - 0.5) * 0.001),
          high: close * (1 + Math.random() * 0.002),
          low: close * (1 - Math.random() * 0.002),
          close: close,
        };
      });
      cache[cacheKey] = { data, timestamp: Date.now() };
      return data;
    }

    try {
      const binanceSymbol = symbol.replace('/', '').replace('USD', 'USDT');
      const response = await axios.get(`${this.BINANCE_API}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
      const data = response.data.map((k: any) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
      cache[cacheKey] = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      return [];
    }
  }
}
