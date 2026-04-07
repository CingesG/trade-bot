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

    let score = 0;
    let confidence = 0;

    // RSI Logic
    if (lastRsi < 30) score += 1;
    if (lastRsi > 70) score -= 1;

    // EMA Cross
    if (lastEmaFast > lastEmaSlow) score += 1;
    else score -= 1;

    // MACD
    if (lastMacd && lastMacd.histogram! > 0) score += 1;
    else score -= 1;

    confidence = Math.abs(score) / 3;

    return {
      action: score > 1 ? 'BUY' : (score < -1 ? 'SELL' : 'HOLD'),
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
