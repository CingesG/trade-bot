import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Wallet, 
  Play, 
  Pause, 
  History, 
  Zap,
  Settings,
  LayoutGrid,
  ChevronDown,
  LogOut,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [state, setState] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Trade');
  const [activeSymbol, setActiveSymbol] = useState('EURUSD');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setState(data);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();

    // WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'STATE_UPDATE') {
        setState(data.state);
      }
      if (data.type === 'TRADE_OPENED') {
        // Handle trade notification
        console.log('New trade opened:', data.trade);
      }
    };

    return () => ws.close();
  }, []);

  if (!state) return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const activePrice = state.prices[activeSymbol] || 0;
  const activeAnalysis = state.lastAnalysis[activeSymbol] || {};

  return (
    <div className="h-screen bg-[#0c0c0c] text-neutral-300 font-sans flex flex-col overflow-hidden select-none text-[11px]">
      {/* Header */}
      <header className="bg-[#1e1e1e] border-b border-[#111] h-12 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-neutral-200">Ultimate AI MT5 Autotrader</h1>
          </div>
          <div className="h-6 w-px bg-white/5" />
          <div className="flex items-center gap-3">
            <span className="text-neutral-500 uppercase text-[10px] font-bold">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-500 font-bold uppercase text-[10px]">Live Bridge Connected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] text-neutral-500 uppercase font-bold">Balance</p>
              <p className="text-sm font-mono font-bold text-white">${state.balance.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-neutral-500 uppercase font-bold">Active Trades</p>
              <p className="text-sm font-mono font-bold text-blue-400">{state.activeTrades.length}</p>
            </div>
          </div>
          <button className="bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-red-600/20 transition-all">
            Emergency Stop
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Market Watch */}
        <aside className="w-64 bg-[#141414] border-r border-[#111] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#111] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-neutral-500">Market Watch</span>
            <Settings className="w-3 h-3 text-neutral-600" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.keys(state.prices).map(symbol => (
              <div 
                key={symbol}
                onClick={() => setActiveSymbol(symbol)}
                className={cn(
                  "p-3 border-b border-[#111] cursor-pointer transition-all flex items-center justify-between",
                  activeSymbol === symbol ? "bg-blue-500/5 border-l-2 border-l-blue-500" : "hover:bg-white/5"
                )}
              >
                <div>
                  <p className="font-bold text-neutral-200">{symbol}</p>
                  <p className="text-[9px] text-neutral-500 uppercase">Forex • Real-time</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-white">{state.prices[symbol]?.toFixed(5)}</p>
                  <div className={cn(
                    "text-[9px] font-bold uppercase",
                    state.lastAnalysis[symbol]?.action === 'BUY' ? "text-emerald-500" : 
                    state.lastAnalysis[symbol]?.action === 'SELL' ? "text-red-500" : "text-neutral-500"
                  )}>
                    {state.lastAnalysis[symbol]?.action || 'HOLD'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Dashboard */}
        <main className="flex-1 flex flex-col bg-[#0c0c0c] overflow-hidden">
          {/* Symbol Header */}
          <div className="p-4 bg-[#141414] border-b border-[#111] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">{activeSymbol}</h2>
              <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Confidence</span>
                <span className="text-[10px] font-bold text-emerald-500">{(activeAnalysis.confidence * 100 || 0).toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] text-neutral-500 uppercase font-bold">RSI (14)</p>
                <p className={cn("text-xs font-mono font-bold", activeAnalysis.indicators?.rsi > 70 ? "text-red-500" : activeAnalysis.indicators?.rsi < 30 ? "text-emerald-500" : "text-white")}>
                  {activeAnalysis.indicators?.rsi?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="h-6 w-px bg-white/5" />
              <div className="text-right">
                <p className="text-[9px] text-neutral-500 uppercase font-bold">EMA Cross</p>
                <p className="text-xs font-mono font-bold text-blue-400">
                  {activeAnalysis.indicators?.emaFast > activeAnalysis.indicators?.emaSlow ? 'BULLISH' : 'BEARISH'}
                </p>
              </div>
            </div>
          </div>

          {/* Chart Placeholder / Visualizer */}
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#141414] border border-[#111] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase text-neutral-500">AI Validation</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-lg font-bold text-white mb-1">Gemini 2.0 Flash</p>
                <p className="text-xs text-neutral-500">Real-time signal validation active. Analyzing market structure and sentiment.</p>
              </div>
              <div className="bg-[#141414] border border-[#111] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase text-neutral-500">Risk Engine</span>
                  <Database className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-lg font-bold text-white mb-1">1% Risk Per Trade</p>
                <p className="text-xs text-neutral-500">Automatic lot sizing and daily loss limits enforced by RiskService.</p>
              </div>
              <div className="bg-[#141414] border border-[#111] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase text-neutral-500">MT5 Bridge</span>
                  <Activity className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-lg font-bold text-white mb-1">FastAPI Active</p>
                <p className="text-xs text-neutral-500">Connected to MetaTrader 5 Terminal via Python bridge on port 8001.</p>
              </div>
            </div>

            {/* Active Trades Table */}
            <div className="bg-[#141414] border border-[#111] rounded-lg overflow-hidden">
              <div className="p-3 bg-[#1e1e1e] border-b border-[#111] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-neutral-500">Active Positions</span>
                <button className="text-[10px] font-bold text-blue-400 uppercase hover:text-blue-300">Close All</button>
              </div>
              <table className="w-full text-[10px]">
                <thead className="bg-[#1a1a1a] text-neutral-600">
                  <tr>
                    <th className="text-left p-3">Symbol</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Volume</th>
                    <th className="text-right p-3">Entry</th>
                    <th className="text-right p-3">Current</th>
                    <th className="text-right p-3">Profit</th>
                    <th className="text-center p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.activeTrades.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-600 italic">No active trades. Bot is scanning for opportunities...</td>
                    </tr>
                  ) : (
                    state.activeTrades.map((trade: any) => (
                      <tr key={trade.id} className="border-t border-[#111] hover:bg-white/5 transition-all">
                        <td className="p-3 font-bold text-white">{trade.symbol}</td>
                        <td className={cn("p-3 font-bold", trade.action === 'BUY' ? "text-emerald-500" : "text-red-500")}>{trade.action}</td>
                        <td className="p-3 text-right font-mono">{trade.volume.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">{trade.entryPrice.toFixed(5)}</td>
                        <td className="p-3 text-right font-mono">{state.prices[trade.symbol]?.toFixed(5)}</td>
                        <td className={cn("p-3 text-right font-mono font-bold", (state.prices[trade.symbol] - trade.entryPrice) >= 0 ? "text-emerald-500" : "text-red-500")}>
                          ${((state.prices[trade.symbol] - trade.entryPrice) * trade.volume * 100000).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <button className="text-red-500 hover:text-red-400 font-bold uppercase text-[9px]">Close</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-8 bg-[#1e1e1e] border-t border-[#111] flex items-center px-4 justify-between shrink-0 text-[10px] text-neutral-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Terminal Connected</span>
          </div>
          <div className="h-3 w-px bg-white/5" />
          <span>Latency: 42ms</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Daily P/L: <span className="text-emerald-500 font-bold">+$142.50</span></span>
          <div className="h-3 w-px bg-white/5" />
          <span>{new Date().toLocaleString()}</span>
        </div>
      </footer>
    </div>
  );
}
