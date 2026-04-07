import axios from 'axios';
import { db } from '../src/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const BRIDGE_URL = 'http://localhost:8001';

export class ExecutionService {
  static async placeOrder(symbol: string, action: 'BUY' | 'SELL', volume: number, sl?: number, tp?: number) {
    try {
      const response = await axios.post(`${BRIDGE_URL}/order`, {
        symbol,
        action,
        volume,
        sl,
        tp
      });

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

        const docRef = await addDoc(collection(db, 'trades'), tradeData);
        return { success: true, id: docRef.id, ...tradeData };
      }
      
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Order execution failed:', error);
      return { success: false, error: 'Bridge connection failed' };
    }
  }

  static async closeTrade(tradeId: string, mt5Order: number) {
    try {
      // In real MT5, closing is often done by opening an opposite position or using a specific close command
      // For simplicity, we assume the bridge handles closing by order ID or symbol
      const response = await axios.post(`${BRIDGE_URL}/close`, { order: mt5Order });
      
      if (response.data.success) {
        const tradeRef = doc(db, 'trades', tradeId);
        await updateDoc(tradeRef, {
          status: 'CLOSED',
          exitPrice: response.data.price,
          profit: response.data.profit,
          closedAt: new Date().toISOString()
        });
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Closing trade failed:', error);
      return { success: false, error: 'Bridge connection failed' };
    }
  }
}
