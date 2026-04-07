import { adminDb } from '../src/lib/firebaseAdmin';
import { config } from '../config';

export class RiskService {
  private static MAX_RISK_PER_TRADE = 0.01; // 1%
  private static MAX_CONCURRENT_TRADES = 3;
  private static DAILY_LOSS_LIMIT = 0.05; // 5%

  static async canTrade(balance: number): Promise<{ allowed: boolean; reason?: string }> {
    const tradesRef = adminDb.collection('trades');
    
    // Check concurrent trades
    const activeSnapshot = await tradesRef.where('status', '==', 'OPEN').get();
    if (activeSnapshot.size >= this.MAX_CONCURRENT_TRADES) {
      return { allowed: false, reason: 'Max concurrent trades reached' };
    }

    // Check daily loss
    const today = new Date().toISOString().split('T')[0];
    const performanceRef = adminDb.collection('performance');
    const perfSnapshot = await performanceRef.where('date', '==', today).get();
    
    if (!perfSnapshot.empty) {
      const dailyData = perfSnapshot.docs[0].data();
      if (dailyData.dailyProfit < -(balance * this.DAILY_LOSS_LIMIT)) {
        return { allowed: false, reason: 'Daily loss limit reached' };
      }
    }

    return { allowed: true };
  }

  static calculateLotSize(balance: number, stopLossPips: number, symbol: string): number {
    const riskAmount = balance * this.MAX_RISK_PER_TRADE;
    let pipValue = 1.0;
    
    if (symbol.includes('JPY')) pipValue = 0.01;
    else if (symbol.includes('BTC')) pipValue = 1.0;
    else if (symbol.includes('ETH')) pipValue = 0.1;
    else pipValue = 0.0001;

    const lotSize = riskAmount / (stopLossPips * pipValue * 100000); // Standard lot is 100,000 units
    
    return Math.max(0.01, parseFloat(lotSize.toFixed(2)));
  }
}
