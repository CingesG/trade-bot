import axios from 'axios';
import { config } from '../config';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class DataService {
  static async getPrice(symbol: string) {
    try {
      const response = await axios.get(`${config.BRIDGE_URL}/price/${symbol}`, { timeout: 2000 });
      return response.data;
    } catch (error) {
      if (config.IS_MOCK_MODE) {
        // Return mock price if bridge is unavailable
        const basePrice = symbol.includes('JPY') ? 150 : 1.08;
        return {
          bid: basePrice + (Math.random() - 0.5) * 0.01,
          ask: basePrice + (Math.random() - 0.5) * 0.01 + 0.0002,
          symbol
        };
      }
      console.error(`Error fetching price for ${symbol}:`, error.message);
      throw error;
    }
  }

  static async getKlines(symbol: string, timeframe: string = '1m', count: number = 100): Promise<Candle[]> {
    try {
      const response = await axios.get(`${config.BRIDGE_URL}/klines/${symbol}`, {
        params: { timeframe, count },
        timeout: 3000
      });
      return response.data;
    } catch (error) {
      if (config.IS_MOCK_MODE) {
        // Return mock candles
        const basePrice = symbol.includes('JPY') ? 150 : 1.08;
        return Array.from({ length: count }).map((_, i) => ({
          time: Date.now() - (count - i) * 60000,
          open: basePrice,
          high: basePrice + 0.001,
          low: basePrice - 0.001,
          close: basePrice + (Math.random() - 0.5) * 0.002,
          volume: 100
        }));
      }
      console.error(`Error fetching klines for ${symbol}:`, error.message);
      return [];
    }
  }
}
