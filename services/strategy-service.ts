import { AnalysisResult } from './ai-service';

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
}

export class StrategyService {
  static generateSignal(analysis: AnalysisResult): StrategySignal {
    const { rsi, prediction, confidence } = analysis;
    const hist = analysis.macd?.histogram || 0;

    // Logic: IF RSI < 35 AND prediction = up → BUY
    if (rsi < 35 && prediction === 'up' && confidence > 0.7) {
      return { 
        action: 'BUY', 
        reason: `Oversold RSI (${rsi.toFixed(2)}) + Bullish AI Prediction (${(confidence * 100).toFixed(0)}%)` 
      };
    }

    // Logic: IF RSI > 65 AND prediction = down → SELL
    if (rsi > 65 && prediction === 'down' && confidence > 0.7) {
      return { 
        action: 'SELL', 
        reason: `Overbought RSI (${rsi.toFixed(2)}) + Bearish AI Prediction (${(confidence * 100).toFixed(0)}%)` 
      };
    }

    // Secondary Trend Logic
    if (rsi < 45 && hist > 0 && prediction === 'up') {
      return { action: 'BUY', reason: 'Trend reversal detected: MACD Bullish + AI Support' };
    }

    if (rsi > 55 && hist < 0 && prediction === 'down') {
      return { action: 'SELL', reason: 'Trend reversal detected: MACD Bearish + AI Support' };
    }

    return { action: 'HOLD', reason: 'Waiting for high-confidence signal' };
  }
}
