import axios from 'axios';

export interface ExecutionResult {
  success: boolean;
  txId?: string;
  error?: string;
  paper: boolean;
  sl?: number;
  tp?: number;
  volume?: number;
}

export class ExecutionService {
  private static BRIDGE_URL = process.env.VITE_BRIDGE_URL || 'http://localhost:8001';

  static async executeTrade(
    pair: string,
    action: 'BUY' | 'SELL',
    volume: number,
    price: number,
    sl: number,
    tp: number,
    isPaper: boolean = true,
    mt5Config?: any
  ): Promise<ExecutionResult> {
    console.log(`[MT5] ${action} ${pair} | Vol: ${volume} | SL: ${sl.toFixed(5)} | TP: ${tp.toFixed(5)} (Paper: ${isPaper})`);

    if (isPaper) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        txId: `demo_mt5_${Math.random().toString(36).substring(7)}`,
        paper: true,
        sl,
        tp,
        volume
      };
    }

    if (mt5Config && mt5Config.isConnected && mt5Config.useBridge) {
      try {
        const response = await axios.post(`${this.BRIDGE_URL}/order`, {
          symbol: pair,
          action: action,
          volume: volume,
          sl: sl,
          tp: tp
        });

        if (response.data.success) {
          return {
            success: true,
            txId: `bridge_${response.data.order}`,
            paper: false,
            sl,
            tp,
            volume
          };
        } else {
          return {
            success: false,
            error: response.data.error || 'Bridge trade failed',
            paper: false
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Bridge connection error: ${error.message}`,
          paper: false
        };
      }
    }

    return {
      success: false,
      error: 'MT5 Bridge not connected or invalid mode.',
      paper: false
    };
  }
}
