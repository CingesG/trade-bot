export interface RiskValidation {
  allowed: boolean;
  reason?: string;
  lotSize?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export class RiskService {
  private static RISK_PER_TRADE = 0.02; // 2% default
  private static MAX_DAILY_LOSS = 0.05; // 5%

  static calculatePosition(
    balance: number,
    price: number,
    action: 'BUY' | 'SELL',
    symbol: string,
    riskPercent: number = 0.02
  ): RiskValidation {
    const riskAmount = balance * riskPercent;
    
    // Position sizing logic based on asset class
    let stopLossPips = 20;
    let pipValue = 10; // Default for 1 lot Forex
    let lotStep = 0.01;

    if (symbol.includes('XAU')) {
      stopLossPips = 50; // 50 pips for Gold ($5 move)
      pipValue = 10; // $10 per lot per $1 move
    } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
      stopLossPips = 500; // Wider stops for crypto
      pipValue = 1; // $1 per lot per $1 move
    }

    const lotSize = parseFloat((riskAmount / (stopLossPips * pipValue)).toFixed(2));
    
    if (lotSize <= 0) {
      return { allowed: false, reason: 'Balance too low for minimum lot size.' };
    }

    // Calculate SL/TP offsets based on asset class
    const pipMultiplier = symbol.includes('XAU') ? 0.1 : symbol.includes('BTC') ? 1 : 0.0001;
    const slOffset = stopLossPips * pipMultiplier;
    const tpOffset = slOffset * 2.5;

    return {
      allowed: true,
      lotSize: Math.max(0.01, lotSize),
      stopLoss: action === 'BUY' ? price - slOffset : price + slOffset,
      takeProfit: action === 'BUY' ? price + tpOffset : price - tpOffset
    };
  }

  static validateDailyLimit(dailyLoss: number, balance: number): boolean {
    return dailyLoss < balance * this.MAX_DAILY_LOSS;
  }
}
