import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import axios from 'axios';
import { config } from './config';
import { DataService } from './services/data-service';
import { StrategyService } from './services/strategy-service';
import { AIService } from './services/ai-service';
import { RiskService } from './services/risk-service';
import { ExecutionService } from './services/execution-service';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  const PORT = 3000;
  const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD'];

  interface BotState {
    balance: number;
    activeTrades: any[];
    prices: Record<string, number>;
    lastAnalysis: Record<string, any>;
  }

  const state: BotState = {
    balance: 10000,
    activeTrades: [],
    prices: {},
    lastAnalysis: {}
  };

  // WebSocket broadcast
  const broadcast = (data: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Main Bot Loop
  async function botCycle() {
    try {
      // Sync active trades with MT5 positions
      const positionsResponse = await axios.get(`${config.BRIDGE_URL}/positions`, { timeout: 3000 });
      const mt5Positions = positionsResponse.data;
      
      // Update state.activeTrades based on MT5 positions
      state.activeTrades = state.activeTrades.filter(trade => {
        if (trade.id.startsWith('mock-')) return true; // Keep mock trades
        return mt5Positions.some((p: any) => p.ticket === trade.mt5Order);
      });

      for (const symbol of SYMBOLS) {
        try {
          const priceData = await DataService.getPrice(symbol);
          const currentPrice = priceData.bid;
          state.prices[symbol] = currentPrice;

          const candles = await DataService.getKlines(symbol, '1m', 50);
          if (candles.length < 50) continue;

          const analysis = StrategyService.analyze(candles);
          state.lastAnalysis[symbol] = analysis;

          const riskCheck = await RiskService.canTrade(state.balance);
          
          if (analysis.action !== 'HOLD' && analysis.confidence > 0.7 && riskCheck.allowed) {
            const aiValidation = await AIService.validateSignal(symbol, analysis.action, analysis.indicators, currentPrice);
            
            if (aiValidation.decision === 'CONFIRM') {
              const slPips = 20;
              const lotSize = RiskService.calculateLotSize(state.balance, slPips, symbol);
              
              // Dynamic SL/TP based on symbol
              let pipValue = 0.0001;
              if (symbol.includes('JPY')) pipValue = 0.01;
              else if (symbol.includes('BTC')) pipValue = 1.0;
              else if (symbol.includes('ETH')) pipValue = 0.1;

              const slDist = slPips * pipValue;
              const tpDist = slDist * 2;

              const sl = analysis.action === 'BUY' ? currentPrice - slDist : currentPrice + slDist;
              const tp = analysis.action === 'BUY' ? currentPrice + tpDist : currentPrice - tpDist;
              
              const result = await ExecutionService.placeOrder(symbol, analysis.action as 'BUY' | 'SELL', lotSize, sl, tp);
              
              if (result.success) {
                state.activeTrades.push(result);
                broadcast({ type: 'TRADE_OPENED', trade: result });
                console.log(`[${symbol}] Trade opened: ${analysis.action} @ ${currentPrice}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error in bot cycle for ${symbol}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error syncing positions:', error.message);
    }
    broadcast({ type: 'STATE_UPDATE', state });
  }

  setInterval(botCycle, 5000);

  // API Routes
  app.get('/api/status', (req, res) => {
    res.json(state);
  });

  app.post('/api/trade/close-all', async (req, res) => {
    for (const trade of state.activeTrades) {
      await ExecutionService.closeTrade(trade.id, trade.mt5Order);
    }
    state.activeTrades = [];
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
