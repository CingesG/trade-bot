import { db } from '../src/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export class RiskService {
  private static MAX_RISK_PER_TRADE = 0.01; // 1%
  private static MAX_CONCURRENT_TRADES = 3;
  private static DAILY_LOSS_LIMIT = 0.05; // 5%

  static async canTrade(balance: number): Promise<{ allowed: boolean; reason?: string }> {
    const tradesRef = collection(db, 'trades');
    
    // Check concurrent trades
    const activeQuery = query(tradesRef, where('status', '==', 'OPEN'));
    const activeSnapshot = await getDocs(activeQuery);
    if (activeSnapshot.size >= this.MAX_CONCURRENT_TRADES) {
      return { allowed: false, reason: 'Max concurrent trades reached' };
    }

    // Check daily loss
    const today = new Date().toISOString().split('T')[0];
    const performanceRef = collection(db, 'performance');
    const perfQuery = query(performanceRef, where('date', '==', today));
    const perfSnapshot = await getDocs(perfQuery);
    
    if (!perfSnapshot.empty) {
      const dailyData = perfSnapshot.docs[0].data();
      if (dailyData.dailyProfit < -(balance * this.DAILY_LOSS_LIMIT)) {
        return { allowed: false, reason: 'Daily loss limit reached' };
      }
    }

    return { allowed: true };
  }

  static calculateLotSize(balance: number, stopLossPips: number, symbol: string): number {
    // Basic lot calculation: (Balance * Risk%) / (SL Pips * Pip Value)
    // Pip value varies by symbol, here we use a simplified version
    const riskAmount = balance * this.MAX_RISK_PER_TRADE;
    const pipValue = symbol.includes('JPY') ? 10 : 1; // Simplified
    const lotSize = riskAmount / (stopLossPips * pipValue * 10); // Standard lot is 100,000 units
    
    return Math.max(0.01, parseFloat(lotSize.toFixed(2)));
  }
}
