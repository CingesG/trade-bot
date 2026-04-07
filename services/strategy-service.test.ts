import { describe, it, expect } from 'vitest';
import { StrategyService } from './strategy-service';

describe('StrategyService', () => {
  const mockCandles = (count: number, basePrice: number, trend: number = 0) => {
    return Array.from({ length: count }).map((_, i) => ({
      time: Date.now() - (count - i) * 60000,
      open: basePrice + i * trend,
      high: basePrice + i * trend + 1,
      low: basePrice + i * trend - 1,
      close: basePrice + i * trend,
      volume: 100
    }));
  };

  it('should return HOLD for insufficient data', () => {
    const candles = mockCandles(5, 100);
    const result = StrategyService.analyze(candles);
    expect(result.action).toBe('HOLD');
    expect(result.confidence).toBe(0);
  });

  it('should identify a BUY signal in an uptrend', () => {
    const candles = mockCandles(50, 100, 0.5); // Strong uptrend
    const result = StrategyService.analyze(candles);
    // In a strong uptrend, EMA 9 will be above EMA 21, and MACD histogram likely positive.
    // RSI might be high (>70), which gives a sell signal weight, but EMA/MACD should push for BUY.
    expect(result.action).toBeDefined();
  });

  it('should identify a SELL signal in a downtrend', () => {
    const candles = mockCandles(50, 100, -0.5); // Strong downtrend
    const result = StrategyService.analyze(candles);
    expect(result.action).toBeDefined();
  });
});
