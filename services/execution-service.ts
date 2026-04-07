import axios from 'axios';
import { adminDb } from '../src/lib/firebaseAdmin';
import { config } from '../config';
import { Logger } from './logger';

export class ExecutionService {
  static async placeOrder(symbol: string, action: 'BUY' | 'SELL', volume: number, sl?: number, tp?: number) {
    try {
      const response = await axios.post(`${config.BRIDGE_URL}/order`, {
        symbol,
        action,
        volume,
        sl,
        tp
      }, { timeout: 5000 });

      if (response.data.success) {
        const tradeData = {
          symbol,
          action,
          volume,
          entryPrice: response.data.price,
          sl: sl || 0,
          tp: tp || 0,
          status: 'OPEN',
          timestamp: new Date().toISOString(),
          mt5Order: response.data.order
        };

        const docRef = await adminDb.collection('trades').add(tradeData);
        return { success: true, id: docRef.id, ...tradeData };
      }
      
      return { success: false, error: response.data.error };
    } catch (error) {
      if (config.IS_MOCK_MODE) {
        const mockTrade = {
          id: 'mock-' + Date.now(),
          symbol,
          action,
          volume,
          entryPrice: symbol.includes('JPY') ? 150 : 1.08,
          sl: sl || 0,
          tp: tp || 0,
          status: 'OPEN',
          timestamp: new Date().toISOString(),
          mt5Order: Math.floor(Math.random() * 1000000)
        };
        return { success: true, ...mockTrade };
      }
      console.error('Order execution failed:', error.message);
      Logger.error(`Order execution failed for ${symbol}: ${error.message}`);
      return { success: false, error: 'Bridge connection failed' };
    }
  }

  static async closeTrade(tradeId: string, mt5Order: number) {
    try {
      const response = await axios.post(`${config.BRIDGE_URL}/close`, { order: mt5Order }, { timeout: 5000 });
      
      if (response.data.success) {
        if (!tradeId.startsWith('mock-')) {
          await adminDb.collection('trades').doc(tradeId).update({
            status: 'CLOSED',
            exitPrice: response.data.price,
            profit: response.data.profit,
            closedAt: new Date().toISOString()
          });
        }
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      if (config.IS_MOCK_MODE) {
        return { success: true };
      }
      console.error('Closing trade failed:', error.message);
      return { success: false, error: 'Bridge connection failed' };
    }
  }
}
