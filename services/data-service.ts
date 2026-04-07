import axios from 'axios';

const BRIDGE_URL = 'http://localhost:8001';

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
      const response = await axios.get(`${BRIDGE_URL}/price/${symbol}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  static async getKlines(symbol: string, timeframe: string = '1m', count: number = 100): Promise<Candle[]> {
    try {
      const response = await axios.get(`${BRIDGE_URL}/klines/${symbol}`, {
        params: { timeframe, count }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      return [];
    }
  }
}
