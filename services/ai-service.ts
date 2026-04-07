import { RSI, MACD, SMA, BollingerBands, ATR } from 'technicalindicators';

export interface AnalysisResult {
  rsi: number;
  macd: {
    MACD?: number;
    signal?: number;
    histogram?: number;
  };
  sma: number;
  bb: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  prediction: 'up' | 'down' | 'neutral';
  confidence: number;
  sentiment: number; // -1 to 1
  volatility: 'low' | 'medium' | 'high';
}

export class AIService {
  static analyze(prices: number[], highs: number[], lows: number[]): AnalysisResult {
    if (prices.length < 30) {
      throw new Error('Insufficient data for analysis');
    }

    const rsiValues = RSI.calculate({ values: prices, period: 14 });
    const macdValues = MACD.calculate({
      values: prices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const smaValues = SMA.calculate({ values: prices, period: 20 });
    const bbValues = BollingerBands.calculate({ values: prices, period: 20, stdDev: 2 });
    const atrValues = ATR.calculate({ high: highs, low: lows, close: prices, period: 14 });

    const currentRsi = rsiValues[rsiValues.length - 1];
    const currentMacd = macdValues[macdValues.length - 1];
    const currentSma = smaValues[smaValues.length - 1];
    const currentBb = bbValues[bbValues.length - 1];
    const currentAtr = atrValues[atrValues.length - 1];
    const currentPrice = prices[prices.length - 1];

    // Volatility assessment
    const avgPrice = currentSma;
    const volPct = (currentAtr / avgPrice) * 100;
    let volatility: 'low' | 'medium' | 'high' = 'medium';
    if (volPct < 0.1) volatility = 'low';
    if (volPct > 0.5) volatility = 'high';

    // Sentiment simulation based on price action + indicators
    let sentiment = 0;
    if (currentPrice > currentSma) sentiment += 0.3;
    if (currentRsi > 50) sentiment += 0.2;
    if ((currentMacd.histogram || 0) > 0) sentiment += 0.2;
    sentiment = Math.max(-1, Math.min(1, sentiment));

    // Sophisticated prediction logic
    let prediction: 'up' | 'down' | 'neutral' = 'neutral';
    let confidence = 0.5;

    // Bullish: Price near lower BB + RSI oversold + MACD histogram turning positive
    if (currentPrice <= currentBb.lower * 1.001 && currentRsi < 35 && (currentMacd.histogram || 0) > -0.0001) {
      prediction = 'up';
      confidence = 0.88;
    } 
    // Bearish: Price near upper BB + RSI overbought + MACD histogram turning negative
    else if (currentPrice >= currentBb.upper * 0.999 && currentRsi > 65 && (currentMacd.histogram || 0) < 0.0001) {
      prediction = 'down';
      confidence = 0.86;
    }
    // Trend Following: Price > SMA + MACD Bullish + RSI > 55
    else if (currentPrice > currentSma && (currentMacd.histogram || 0) > 0 && currentRsi > 55) {
      prediction = 'up';
      confidence = 0.75;
    }

    return {
      rsi: currentRsi,
      macd: currentMacd,
      sma: currentSma,
      bb: currentBb,
      atr: currentAtr,
      prediction,
      confidence,
      sentiment,
      volatility
    };
  }
}
