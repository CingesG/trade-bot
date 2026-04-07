import express from "express";
import path from "path";
import axios from "axios";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { DataService } from "./services/data-service.ts";
import { AIService } from "./services/ai-service.ts";
import { StrategyService } from "./services/strategy-service.ts";
import { ExecutionService } from "./services/execution-service.ts";
import { RiskService } from "./services/risk-service.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const WSS_PORT = 8080;

  // WebSocket Server for real-time updates
  const wss = new WebSocketServer({ port: WSS_PORT });
  const broadcast = (data: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  app.use(express.json());

  // In-memory state for the bot
  const state = {
    balance: 10000,
    equity: 10000,
    margin: 0,
    leverage: 500,
    dailyLoss: 0,
    activeTrades: [] as any[],
    tradeHistory: [
      { id: 'tx_1', pair: 'EURUSD', action: 'BUY', amount: 0.15, price: 1.0850, sl: 1.0830, tp: 1.0900, timestamp: Date.now() - 3600000, paper: true, reason: 'RSI oversold' },
      { id: 'tx_2', pair: 'XAUUSD', action: 'SELL', amount: 0.05, price: 2350.20, sl: 2355.20, tp: 2340.20, timestamp: Date.now() - 1800000, paper: true, reason: 'Trend exhaustion' }
    ] as any[],
    isPaper: true,
    isRunning: false,
    symbols: [
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', // Forex
      'XAUUSD', 'XAGUSD', 'WTI', 'BRENT',              // Commodities
      'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD',          // Crypto
      'US30', 'NAS100', 'SPX500', 'GER40',             // Indices
      'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'           // Stocks
    ],
    activeSymbol: 'EURUSD',
    lastAnalysis: {} as Record<string, any>,
    prices: {} as Record<string, number>,
    mt5Account: {
      accountId: '',
      server: '',
      broker: '',
      accountType: 'Demo',
      leverage: 500,
      isConnected: false,
      useBridge: false,
      bridgeUrl: 'http://localhost:8000',
      name: '',
      currency: 'USD'
    }
  };

  const openTrade = async (symbol: string, action: 'BUY' | 'SELL', amount: number, sl: number, tp: number, reason: string) => {
    const currentPrice = state.prices[symbol];
    if (!currentPrice) return null;

    // RISK CHECK: Max 3 trades per symbol, Max 10 total
    const activeForSymbol = state.activeTrades.filter(t => t.pair === symbol).length;
    if (activeForSymbol >= 3) return null;
    if (state.activeTrades.length >= 10) return null;

    const result = await ExecutionService.executeTrade(
      symbol, action, amount, currentPrice, sl, tp, state.isPaper, state.mt5Account
    );

    if (result.success) {
      const newTrade = {
        id: result.txId || `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        pair: symbol,
        action,
        amount,
        price: currentPrice,
        sl,
        tp,
        profit: 0,
        timestamp: Date.now(),
        reason
      };
      state.activeTrades.push(newTrade);
      return newTrade;
    }
    return null;
  };

  const closeTrade = (id: string) => {
    const index = state.activeTrades.findIndex(t => t.id === id);
    if (index !== -1) {
      const trade = state.activeTrades[index];
      state.balance += trade.profit;
      state.tradeHistory.unshift({ ...trade, closedAt: Date.now() });
      state.activeTrades.splice(index, 1);
      return true;
    }
    return false;
  };

  // Bot loop
  const runBotCycle = async () => {
    // 1. Update prices for all symbols first
    for (const symbol of state.symbols) {
      try {
        const price = await DataService.fetchPrice(symbol, state.mt5Account);
        if (price) {
          // Add a tiny bit of jitter to ensure movement in UI even if API is slow
          const jitter = (Math.random() - 0.5) * (price * 0.00002);
          state.prices[symbol] = price + jitter;
        }
      } catch (e) {
        console.error(`Price fetch error for ${symbol}:`, e.message);
      }
    }

    // 2. Update active trades profit/loss and check for auto-exit
    let totalUnrealizedPnL = 0;
    const tradesToClose: string[] = [];

    state.activeTrades.forEach(trade => {
      const currentPrice = state.prices[trade.pair];
      if (!currentPrice) return;

      const diff = currentPrice - trade.price;
      
      // Lot size to profit calculation (simplified)
      // 1 lot = $10 per pip for most pairs. 1 pip = 0.0001 (or 0.01 for JPY)
      const isJpy = trade.pair.includes('JPY');
      const pipSize = isJpy ? 0.01 : 0.0001;
      const pips = diff / pipSize;
      
      // Profit = pips * lotSize * 10 (Standard MT5 formula for USD account)
      trade.profit = (trade.action === 'BUY' ? pips : -pips) * trade.amount * 10;
      totalUnrealizedPnL += trade.profit;

      // Auto-exit logic (TP/SL)
      if (trade.tp && ((trade.action === 'BUY' && currentPrice >= trade.tp) || (trade.action === 'SELL' && currentPrice <= trade.tp))) {
        tradesToClose.push(trade.id);
      } else if (trade.sl && ((trade.action === 'BUY' && currentPrice <= trade.sl) || (trade.action === 'SELL' && currentPrice >= trade.sl))) {
        tradesToClose.push(trade.id);
      }
      
      // AGGRESSIVE SCALPING EXIT: 
      // Close if profit > $50 per lot (quick gain)
      // OR if loss < -$30 per lot (tight stop to prevent deep drawdown)
      if (trade.profit >= (trade.amount * 50)) { 
        tradesToClose.push(trade.id);
      } else if (trade.profit <= -(trade.amount * 30)) {
        tradesToClose.push(trade.id);
      }
    });

    // Close trades that hit targets
    tradesToClose.forEach(id => closeTrade(id));

    // Update margin
    state.margin = state.activeTrades.reduce((acc, trade) => {
      // Simplified margin calculation: (Lot * 100,000) / Leverage
      return acc + (trade.amount * 100000) / state.leverage;
    }, 0);

    state.equity = state.balance + totalUnrealizedPnL;

    if (!state.isRunning) return;

    // 3. AI Analysis and Scalping Entry
    try {
      // SCREENER LOGIC: Analyze all symbols in every cycle
      for (const symbol of state.symbols) {
        // High frequency check: 1m klines for scalping
        const klines = await DataService.fetchKlines(symbol, '1m', 50, state.mt5Account);
        if (klines.length < 30) continue;

        const prices = klines.map((k: any) => k.close);
        const highs = klines.map((k: any) => k.high || k.close * 1.001);
        const lows = klines.map((k: any) => k.low || k.close * 0.999);
        const currentPrice = prices[prices.length - 1];

        const analysis = AIService.analyze(prices, highs, lows);
        state.lastAnalysis[symbol] = analysis;

        // Broadcast real-time price and analysis
        broadcast({ type: 'PRICE_UPDATE', symbol, price: currentPrice, analysis });

        const signal = StrategyService.generateSignal(analysis);

        // RISK MANAGEMENT: 1% Risk per trade
        const riskPercent = 0.01;
        const lotSize = Math.max(0.01, parseFloat(((state.balance * riskPercent) / 1000).toFixed(2)));
        
        const activeForSymbol = state.activeTrades.filter(t => t.pair === symbol).length;
        
        if (signal.action !== 'HOLD' && analysis.confidence > 0.8 && activeForSymbol < 2 && state.activeTrades.length < 5) {
          const slPips = 20;
          const tpPips = 40;
          const pipSize = symbol.includes('JPY') ? 0.01 : (symbol.length === 4 ? 0.1 : 0.0001);
          
          const sl = signal.action === 'BUY' ? currentPrice - (slPips * pipSize) : currentPrice + (slPips * pipSize);
          const tp = signal.action === 'BUY' ? currentPrice + (tpPips * pipSize) : currentPrice - (tpPips * pipSize);

          await openTrade(symbol, signal.action as 'BUY' | 'SELL', lotSize, sl, tp, "AI Screener Signal");
        }
      }
    } catch (error) {
      console.error('Bot cycle error:', error.message);
    }
  };

  // Run cycle every 2 seconds to avoid rate limits
  setInterval(runBotCycle, 2000);

  // API Routes
  app.get("/api/status", (req, res) => {
    res.json(state);
  });

  app.post("/api/toggle", (req, res) => {
    state.isRunning = !state.isRunning;
    res.json({ isRunning: state.isRunning });
  });

  app.post("/api/settings", (req, res) => {
    const { isPaper, useBridge, bridgeUrl } = req.body;
    if (typeof isPaper === 'boolean') state.isPaper = isPaper;
    if (typeof useBridge === 'boolean') state.mt5Account.useBridge = useBridge;
    if (bridgeUrl) state.mt5Account.bridgeUrl = bridgeUrl;
    res.json({ success: true });
  });

  app.post("/api/mt5/connect", async (req, res) => {
    const { accountId, password, server, accountType, useBridge, bridgeUrl } = req.body;
    
    if (useBridge) {
      try {
        const bridgeRes = await axios.post(`${bridgeUrl || state.mt5Account.bridgeUrl}/connect`, {
          login: parseInt(accountId),
          password,
          server
        });

        if (bridgeRes.data.success) {
          state.mt5Account = {
            accountId,
            server,
            broker: bridgeRes.data.account.company || 'MT5 Broker',
            accountType: accountType || 'Live',
            leverage: bridgeRes.data.account.leverage || 500,
            isConnected: true,
            useBridge: true,
            bridgeUrl: bridgeUrl || state.mt5Account.bridgeUrl,
            name: bridgeRes.data.account.name,
            currency: bridgeRes.data.account.currency
          };
          state.balance = bridgeRes.data.account.balance;
          state.equity = bridgeRes.data.account.equity;
          state.isPaper = false;
          return res.json({ success: true, account: state.mt5Account });
        } else {
          return res.status(400).json({ success: false, message: bridgeRes.data.error || "Bridge connection failed" });
        }
      } catch (e) {
        return res.status(500).json({ success: false, message: `Could not reach bridge at ${bridgeUrl}: ${e.message}` });
      }
    }

    // Fallback to Simulation Mode
    setTimeout(() => {
      if (accountId && password && server) {
        state.mt5Account = {
          accountId,
          server,
          broker: server.split('-')[0] || 'MetaQuotes',
          accountType: accountType || 'Demo',
          leverage: 500,
          isConnected: true,
          useBridge: false,
          bridgeUrl: bridgeUrl || state.mt5Account.bridgeUrl,
          name: "Simulation User",
          currency: "USD"
        };
        state.balance = 10000.00;
        state.equity = 10000.00;
        state.isPaper = true;
        res.json({ success: true, account: state.mt5Account });
      } else {
        res.status(400).json({ success: false, message: "Invalid credentials." });
      }
    }, 1000);
  });

  app.post("/api/symbol/select", (req, res) => {
    const { symbol } = req.body;
    if (state.symbols.includes(symbol)) {
      state.activeSymbol = symbol;
      res.json({ success: true, activeSymbol: symbol });
    } else {
      res.status(400).json({ success: false, message: "Invalid symbol" });
    }
  });

  app.post("/api/trade/manual", async (req, res) => {
    const { symbol, action, amount } = req.body;
    const lotSize = amount || 0.1;
    const currentPrice = state.prices[symbol];
    
    if (!currentPrice) return res.status(400).json({ success: false, message: "Price not available" });

    const pipSize = symbol.includes('JPY') ? 0.01 : 0.0001;
    const sl = action === 'BUY' ? currentPrice - (50 * pipSize) : currentPrice + (50 * pipSize);
    const tp = action === 'BUY' ? currentPrice + (100 * pipSize) : currentPrice - (100 * pipSize);

    const trade = await openTrade(symbol, action, lotSize, sl, tp, "Manual Entry");
    if (trade) {
      res.json({ success: true, trade });
    } else {
      res.status(500).json({ success: false, message: "Execution failed" });
    }
  });

  app.post("/api/trade/close-all", (req, res) => {
    const count = state.activeTrades.length;
    [...state.activeTrades].forEach(t => closeTrade(t.id));
    res.json({ success: true, closedCount: count });
  });

  app.post("/api/trade/close", (req, res) => {
    const { id } = req.body;
    const success = closeTrade(id);
    res.json({ success });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Autonomous Trading System running on http://localhost:${PORT}`);
  });
}

startServer();
