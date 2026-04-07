import { RSI, EMA, MACD } from 'technicalindicators';
import { Candle } from './data-service';

export class StrategyService {
  static analyze(candles: Candle[]) {
    const closes = candles.map(c => c.close);
    
    // Indicators
    const rsi = RSI.calculate({ values: closes, period: 14 });
    const emaFast = EMA.calculate({ values: closes, period: 9 });
    const emaSlow = EMA.calculate({ values: closes, period: 21 });
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    const lastRsi = rsi[rsi.length - 1];
    const lastEmaFast = emaFast[emaFast.length - 1];
    const lastEmaSlow = emaSlow[emaSlow.length - 1];
    const lastMacd = macd[macd.length - 1];

    let confidence = 0;
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    // Weighted System
    // RSI: 0.4
    // EMA: 0.3
    // MACD: 0.3

    let rsiSignal = 0; // 1 for buy, -1 for sell
    if (lastRsi < 30) rsiSignal = 1;
    else if (lastRsi > 70) rsiSignal = -1;

    let emaSignal = lastEmaFast > lastEmaSlow ? 1 : -1;
    let macdSignal = (lastMacd && lastMacd.histogram! > 0) ? 1 : -1;

    // Calculate direction
    const totalScore = (rsiSignal * 0.4) + (emaSignal * 0.3) + (macdSignal * 0.3);
    
    if (totalScore > 0.4) action = 'BUY';
    else if (totalScore < -0.4) action = 'SELL';

    confidence = Math.abs(totalScore);

    return {
      action,
      confidence,
      indicators: {
        rsi: lastRsi,
        emaFast: lastEmaFast,
        emaSlow: lastEmaSlow,
        macd: lastMacd
      }
    };
  }
}
