import { describe, it, expect } from 'vitest';
import { RiskService } from './risk-service';

describe('RiskService', () => {
  it('should calculate lot size correctly for Forex', () => {
    const balance = 10000;
    const slPips = 20;
    const symbol = 'EURUSD';
    const lotSize = RiskService.calculateLotSize(balance, slPips, symbol);
    
    // Risk = 10000 * 0.01 = 100
    // SL = 20 pips * 0.0001 = 0.002
    // Lot = 100 / (0.002 * 100000) = 100 / 200 = 0.5
    expect(lotSize).toBe(0.5);
  });

  it('should calculate lot size correctly for JPY pairs', () => {
    const balance = 10000;
    const slPips = 20;
    const symbol = 'USDJPY';
    const lotSize = RiskService.calculateLotSize(balance, slPips, symbol);
    
    // Risk = 100
    // SL = 20 pips * 0.01 = 0.2
    // Lot = 100 / (0.2 * 100000) = 100 / 20000 = 0.005 -> clamped to 0.01
    expect(lotSize).toBe(0.01);
  });

  it('should calculate lot size correctly for BTC', () => {
    const balance = 10000;
    const slPips = 100; // $100 move
    const symbol = 'BTCUSD';
    const lotSize = RiskService.calculateLotSize(balance, slPips, symbol);
    
    // Risk = 100
    // SL = 100 * 1.0 = 100
    // Lot = 100 / (100 * 100000) = 0.00001 -> clamped to 0.01
    // Note: My calculation in code is lotSize = riskAmount / (stopLossPips * pipValue * 100000)
    // For BTC, pipValue is 1.0. 
    expect(lotSize).toBe(0.01);
  });
});
