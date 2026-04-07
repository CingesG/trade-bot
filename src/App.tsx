/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Server, 
  Globe, 
  Terminal, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Wallet, 
  Play, 
  Pause, 
  History, 
  AlertTriangle,
  Cpu,
  Zap,
  Info,
  Plus,
  Search,
  Settings,
  Maximize2,
  Minimize2,
  LayoutGrid,
  ChevronDown,
  MousePointer2,
  Crosshair,
  Type,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart3,
  Layers,
  LogOut,
  Monitor,
  Wifi,
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
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock candlestick data generator
const generateCandles = (basePrice: number, count: number) => {
  let currentPrice = basePrice;
  return Array.from({ length: count }).map((_, i) => {
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * (basePrice * 0.01);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.002);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.002);
    currentPrice = close;
    return {
      time: format(new Date(Date.now() - (count - i) * 3600000), 'HH:mm'),
      open,
      high,
      low,
      close,
      isUp: close >= open
    };
  });
};

export default function App() {
  const [state, setState] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [candles, setCandles] = useState<any[]>([]);
  const [mt5Form, setMt5Form] = useState({ 
    accountId: '', 
    password: '', 
    server: '', 
    accountType: 'Demo',
    useBridge: false,
    bridgeUrl: 'http://localhost:8000'
  });
  const [activeTab, setActiveTab] = useState('Trade');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H1');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setState(data);
        
        if (candles.length === 0) {
          const basePrice = data.prices[data.activeSymbol] || 1.0850;
          setCandles(generateCandles(basePrice, 50));
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();

    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'PRICE_UPDATE') {
        setState((prev: any) => {
          if (!prev) return prev;
          const newPrices = { ...prev.prices, [data.symbol]: data.price };
          const newAnalysis = { ...prev.lastAnalysis, [data.symbol]: data.analysis };
          return { ...prev, prices: newPrices, lastAnalysis: newAnalysis };
        });

        if (data.symbol === state?.activeSymbol) {
          setCandles(prev => {
            const last = prev[prev.length - 1];
            if (!last) return prev;
            const updatedLast = {
              ...last,
              close: data.price,
              high: Math.max(last.high, data.price),
              low: Math.min(last.low, data.price),
              isUp: data.price >= last.open
            };
            return [...prev.slice(0, -1), updatedLast];
          });
        }
      }
    };

    return () => ws.close();
  }, [state?.activeSymbol]);

  const selectSymbol = async (symbol: string) => {
    try {
      await fetch('/api/symbol/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      setCandles([]); // Reset candles to regenerate for new symbol
    } catch (error) {
      console.error('Error selecting symbol:', error);
    }
  };

  const toggleBot = async () => {
    try {
      await fetch('/api/toggle', { method: 'POST' });
    } catch (error) {
      console.error('Error toggling bot:', error);
    }
  };

  const connectMT5 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    try {
      const res = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mt5Form)
      });
      const data = await res.json();
      if (data.success) {
        setState((prev: any) => ({ ...prev, mt5Account: data.account }));
      } else {
        alert(data.message || 'Connection failed');
      }
    } catch (error) {
      console.error('Error connecting MT5:', error);
      alert('Connection error. Is the Python bridge running?');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectMT5 = async () => {
    try {
      await fetch('/api/mt5/disconnect', { method: 'POST' });
    } catch (error) {
      console.error('Error disconnecting MT5:', error);
    }
  };

  const handleManualTrade = async (action: 'BUY' | 'SELL') => {
    try {
      await fetch('/api/trade/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: state.activeSymbol, action, amount: 0.1 })
      });
    } catch (error) {
      console.error('Error manual trade:', error);
    }
  };

  const handleCloseAll = async () => {
    try {
      await fetch('/api/trade/close-all', { method: 'POST' });
    } catch (error) {
      console.error('Error close all:', error);
    }
  };

  const handleCloseTrade = async (id: string) => {
    try {
      await fetch('/api/trade/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (error) {
      console.error('Error close trade:', error);
    }
  };

  if (!state) return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full"
      />
    </div>
  );

  const activeAnalysis = state.lastAnalysis[state.activeSymbol] || {};
  const activePrice = state.prices[state.activeSymbol] || 0;

  if (!state.mt5Account.isConnected) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#1e1e1e] border border-[#333] rounded shadow-2xl overflow-hidden"
        >
          <div className="bg-[#2d2d2d] px-6 py-4 border-b border-[#333] flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-neutral-200">MetaTrader 5 Terminal Login</h1>
          </div>
          
          <form onSubmit={connectMT5} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Login ID</label>
                <input 
                  type="text" 
                  required
                  placeholder="MT5 Account Number"
                  className="w-full bg-[#121212] border border-[#333] rounded px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-all"
                  value={mt5Form.accountId}
                  onChange={e => setMt5Form({...mt5Form, accountId: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Master Password"
                  className="w-full bg-[#121212] border border-[#333] rounded px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-all"
                  value={mt5Form.password}
                  onChange={e => setMt5Form({...mt5Form, password: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Server</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. MetaQuotes-Demo"
                  className="w-full bg-[#121212] border border-[#333] rounded px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-all"
                  value={mt5Form.server}
                  onChange={e => setMt5Form({...mt5Form, server: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Account Type</label>
                <select 
                  className="w-full bg-[#121212] border border-[#333] rounded px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-all"
                  value={mt5Form.accountType}
                  onChange={e => setMt5Form({...mt5Form, accountType: e.target.value})}
                >
                  <option value="Demo">Demo Account</option>
                  <option value="Live">Live Account</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#333] space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Use Python Bridge (Real MT5)</label>
                  <button 
                    type="button"
                    onClick={() => setMt5Form({...mt5Form, useBridge: !mt5Form.useBridge})}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      mt5Form.useBridge ? "bg-blue-600" : "bg-neutral-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                      mt5Form.useBridge ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>
                
                {mt5Form.useBridge && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Bridge URL</label>
                    <input 
                      type="text" 
                      placeholder="http://localhost:8000"
                      className="w-full bg-[#121212] border border-[#333] rounded px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-all"
                      value={mt5Form.bridgeUrl}
                      onChange={e => setMt5Form({...mt5Form, bridgeUrl: e.target.value})}
                    />
                    <p className="text-[9px] text-neutral-600 italic">Ensure bridge.py is running locally with MetaTrader 5 open.</p>
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit"
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded text-sm transition-all flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : 'Login to Terminal'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0c0c0c] text-neutral-300 font-sans flex flex-col overflow-hidden select-none text-[11px]">
      {/* MT5 Top Bar */}
      <header className="bg-[#1e1e1e] border-b border-[#111] flex flex-col shrink-0">
        {/* Menu Bar */}
        <div className="h-7 flex items-center px-2 gap-4 border-b border-[#111]">
          {['File', 'View', 'Insert', 'Charts', 'Tools', 'Window', 'Help'].map(m => (
            <button key={m} className="px-2 hover:bg-[#333] rounded h-full transition-colors text-neutral-400 hover:text-white">{m}</button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-4">
            <span className="text-neutral-500">Account: <span className="text-emerald-500 font-bold">{state.mt5Account.accountId}</span></span>
            <span className="text-neutral-500">Server: <span className="text-neutral-300">{state.mt5Account.server}</span></span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-9 flex items-center px-2 gap-1 bg-[#252525] text-neutral-300">
          <div className="flex items-center gap-0.5 border-r border-[#333] pr-1 mr-1">
            <ToolbarButton icon={<Plus className="w-3.5 h-3.5" />} label="New Order" />
            <ToolbarButton icon={<Activity className="w-3.5 h-3.5" />} label="Algo Trading" />
          </div>
          <div className="flex items-center gap-0.5 border-r border-[#333] pr-1 mr-1">
            <ToolbarButton icon={<BarChart3 className="w-3.5 h-3.5" />} />
            <ToolbarButton icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <ToolbarButton icon={<TrendingDown className="w-3.5 h-3.5" />} />
          </div>
          <div className="flex items-center gap-0.5 border-r border-[#333] pr-1 mr-1">
            <ToolbarButton icon={<Maximize2 className="w-3.5 h-3.5" />} />
            <ToolbarButton icon={<Minimize2 className="w-3.5 h-3.5" />} />
            <ToolbarButton icon={<LayoutGrid className="w-3.5 h-3.5" />} />
          </div>
          <div className="flex items-center gap-1 px-2 border-r border-[#333] mr-1 h-full">
            {['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'].map(t => (
              <button 
                key={t} 
                onClick={() => setSelectedTimeframe(t)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors",
                  selectedTimeframe === t ? "bg-emerald-600 text-white" : "text-neutral-500 hover:bg-[#333] hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <ToolbarButton icon={<MousePointer2 className="w-3.5 h-3.5" />} />
            <ToolbarButton icon={<Crosshair className="w-3.5 h-3.5" />} />
            <ToolbarButton icon={<Type className="w-3.5 h-3.5" />} />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-4">
            <div className={cn("w-2 h-2 rounded-full", state.isRunning ? "bg-emerald-400 animate-pulse" : "bg-red-500")} />
            <span className="text-[10px] font-bold uppercase text-neutral-400">{state.isRunning ? 'Aggressive Scalping' : 'AI Stopped'}</span>
            <button onClick={disconnectMT5} className="ml-4 text-red-500 hover:text-red-400 font-bold uppercase flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Market Watch */}
        <aside className="w-64 bg-[#1a1a1a] border-r border-[#111] flex flex-col shrink-0 text-neutral-400">
          <div className="h-6 bg-[#252525] border-b border-[#111] flex items-center justify-between px-2">
            <span className="text-[10px] font-bold uppercase text-neutral-500">Market Watch: {format(new Date(), 'HH:mm:ss')}</span>
            <Settings className="w-3 h-3 text-neutral-600 cursor-pointer hover:text-white" />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212]">
            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-[#1a1a1a] sticky top-0 text-neutral-600 border-b border-[#222]">
                <tr>
                  <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Symbol</th>
                  <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Price</th>
                  <th className="text-center px-2 py-1 font-bold">AI</th>
                </tr>
              </thead>
              <tbody>
                {state.symbols.map((symbol: string) => {
                  const price = state.prices[symbol] || 0;
                  const analysis = state.lastAnalysis[symbol];
                  const precision = symbol.length === 4 ? 2 : (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('XAU') ? 2 : 5);
                  const isUp = analysis?.prediction === 'up';
                  
                  return (
                    <tr 
                      key={symbol}
                      onClick={() => selectSymbol(symbol)}
                      className={cn(
                        "border-b border-[#1a1a1a] cursor-pointer transition-colors",
                        state.activeSymbol === symbol ? "bg-[#00ff00]/10" : "hover:bg-[#1e1e1e]"
                      )}
                    >
                      <td className="px-2 py-1 font-bold text-neutral-300 border-r border-[#1a1a1a]">{symbol}</td>
                      <td className={cn("px-2 py-1 text-right font-mono border-r border-[#1a1a1a]", isUp ? "text-[#00ff00]" : "text-white")}>
                        {price.toFixed(precision)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {analysis ? (
                          <div className={cn(
                            "w-2 h-2 rounded-full mx-auto",
                            analysis.prediction === 'up' ? "bg-emerald-500 shadow-[0_0_5px_#10b981]" : 
                            analysis.prediction === 'down' ? "bg-red-500 shadow-[0_0_5px_#ef4444]" : "bg-neutral-600"
                          )} />
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Market Watch Tabs */}
          <div className="h-6 bg-[#252525] border-t border-[#111] flex items-center px-1 gap-1">
            {['Symbols', 'Details', 'Trading', 'Ticks'].map(t => (
              <button key={t} className={cn(
                "px-2 h-full text-[9px] font-bold uppercase",
                t === 'Symbols' ? "bg-[#121212] text-white border-x border-t border-[#111]" : "text-neutral-600 hover:text-neutral-400"
              )}>{t}</button>
            ))}
          </div>
        </aside>

        {/* Center Content: Chart Area */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
          {/* Chart Header Overlay */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-between px-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-white font-bold flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                {state.activeSymbol}, {selectedTimeframe}: Euro vs US Dollar
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleManualTrade('BUY')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-all"
                >
                  Buy
                </button>
                <button 
                  onClick={() => handleManualTrade('SELL')}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-all"
                >
                  Sell
                </button>
                <button 
                  onClick={handleCloseAll}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-all"
                >
                  Close All
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 uppercase">Confidence</span>
                <span className="text-emerald-500 font-mono font-bold">{(activeAnalysis?.confidence * 100 || 0).toFixed(0)}%</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 uppercase">Sentiment</span>
                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex items-center">
                  <div 
                    className={cn("h-full transition-all duration-500", (activeAnalysis?.sentiment || 0) > 0 ? "bg-emerald-500" : "bg-red-500")}
                    style={{ 
                      width: `${Math.abs(activeAnalysis?.sentiment || 0) * 100}%`, 
                      marginLeft: (activeAnalysis?.sentiment || 0) > 0 ? '50%' : `${50 - Math.abs(activeAnalysis?.sentiment || 0) * 50}%` 
                    }}
                  />
                </div>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 uppercase">Volatility</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase",
                  activeAnalysis?.volatility === 'high' ? "text-orange-500" : 
                  activeAnalysis?.volatility === 'medium' ? "text-yellow-500" : "text-emerald-500"
                )}>
                  {activeAnalysis?.volatility || 'Low'}
                </span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <button 
                onClick={toggleBot}
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-bold uppercase transition-all",
                  state.isRunning 
                    ? "bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600/30" 
                    : "bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600/30"
                )}
              >
                {state.isRunning ? 'Stop Algo' : 'Start Algo'}
              </button>
            </div>
          </div>

          {/* Candlestick Chart */}
          <div className="flex-1 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candles} margin={{ top: 20, right: 60, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="1 1" stroke="#222" vertical={true} horizontal={true} />
                <XAxis dataKey="time" hide />
                <YAxis 
                  domain={['auto', 'auto']} 
                  orientation="right" 
                  stroke="#444" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => v.toFixed(state.activeSymbol.includes('USD') && !state.activeSymbol.includes('XAU') ? 4 : 2)}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#1e1e1e] border border-[#333] p-2 rounded text-[10px] space-y-1">
                          <p className="text-neutral-400">{data.time}</p>
                          <p>O: <span className="text-white">{data.open.toFixed(5)}</span></p>
                          <p>H: <span className="text-white">{data.high.toFixed(5)}</span></p>
                          <p>L: <span className="text-white">{data.low.toFixed(5)}</span></p>
                          <p>C: <span className="text-white">{data.close.toFixed(5)}</span></p>
                          {activeAnalysis?.bb && (
                            <div className="pt-1 border-t border-[#333] mt-1">
                              <p className="text-neutral-500">BB Upper: {activeAnalysis.bb.upper.toFixed(5)}</p>
                              <p className="text-neutral-500">BB Lower: {activeAnalysis.bb.lower.toFixed(5)}</p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* Bollinger Bands Area */}
                {activeAnalysis?.bb && (
                  <>
                    <ReferenceLine y={activeAnalysis.bb.upper} stroke="#3b82f6" strokeOpacity={0.2} strokeDasharray="3 3" />
                    <ReferenceLine y={activeAnalysis.bb.lower} stroke="#3b82f6" strokeOpacity={0.2} strokeDasharray="3 3" />
                  </>
                )}

                {/* Simplified Candlestick using two bars - MT5 Style: Green for Up, White for Down */}
                <Bar dataKey={(d) => Math.abs(d.open - d.close)} fill="#00ff00">
                  {candles.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isUp ? "#00ff00" : "transparent"} 
                      stroke={entry.isUp ? "#00ff00" : "#ffffff"} 
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
                
                <ReferenceLine y={activePrice} stroke="#00ff00" strokeDasharray="3 3" label={{ position: 'right', value: activePrice.toFixed(5), fill: '#00ff00', fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Price Label Overlay */}
          <div className="absolute top-12 left-12 pointer-events-none opacity-10">
            <h1 className="text-6xl font-mono font-bold text-white">
              {activePrice.toFixed(state.activeSymbol.includes('USD') && !state.activeSymbol.includes('XAU') ? 4 : 2)}
            </h1>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Toolbox */}
      <div className="h-64 bg-[#1a1a1a] border-t border-[#111] flex flex-col shrink-0 text-neutral-400">
        <div className="h-7 bg-[#252525] border-b border-[#111] flex items-center px-1">
          <div className="flex h-full">
            {['Trade', 'Screener', 'History', 'Journal', 'News', 'Mailbox', 'Market', 'Signals', 'VPS', 'Code Base', 'Experts'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 h-full text-[10px] font-bold transition-colors border-r border-[#111]",
                  activeTab === tab ? "bg-[#121212] text-emerald-500" : "text-neutral-600 hover:text-neutral-400 hover:bg-[#1e1e1e]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212]">
          {activeTab === 'Trade' && (
            <div className="p-0">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-[#1a1a1a] text-neutral-600 sticky top-0 border-b border-[#222]">
                  <tr>
                    <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Symbol</th>
                    <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Ticket</th>
                    <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Type</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Volume</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Price</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">S/L</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">T/P</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Profit</th>
                    <th className="text-center px-2 py-1 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.activeTrades.map((trade: any) => (
                    <tr key={trade.id} className="border-b border-[#1a1a1a] hover:bg-[#1e1e1e]">
                      <td className="px-2 py-1 font-bold text-neutral-300 border-r border-[#1a1a1a]">{trade.pair}</td>
                      <td className="px-2 py-1 text-neutral-500 font-mono border-r border-[#1a1a1a]">{trade.id}</td>
                      <td className={cn("px-2 py-1 font-bold border-r border-[#1a1a1a]", trade.action === 'BUY' ? "text-[#00ff00]" : "text-[#ff4444]")}>{trade.action}</td>
                      <td className="px-2 py-1 text-right font-mono border-r border-[#1a1a1a]">{trade.amount.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right font-mono border-r border-[#1a1a1a]">{trade.price.toFixed(5)}</td>
                      <td className="px-2 py-1 text-right font-mono text-red-900 border-r border-[#1a1a1a]">{trade.sl?.toFixed(5)}</td>
                      <td className="px-2 py-1 text-right font-mono text-emerald-900 border-r border-[#1a1a1a]">{trade.tp?.toFixed(5)}</td>
                      <td className={cn("px-2 py-1 text-right font-mono border-r border-[#1a1a1a] font-bold", trade.profit >= 0 ? "text-[#00ff00]" : "text-red-500")}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button 
                          onClick={() => handleCloseTrade(trade.id)}
                          className="text-red-500 hover:text-red-400 font-bold uppercase text-[9px]"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-[#1a1a1a] border-t border-[#111] flex gap-6 text-[10px] font-bold text-neutral-500">
                <span>Balance: <span className="text-white">${state.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                <span>Equity: <span className="text-white">${state.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                <span>Margin: <span className="text-white">${state.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                <span>Free Margin: <span className="text-white">${(state.equity - state.margin).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
              </div>
            </div>
          )}
          {activeTab === 'Screener' && (
            <div className="p-0">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-[#1a1a1a] text-neutral-600 sticky top-0 border-b border-[#222]">
                  <tr>
                    <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Symbol</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Price</th>
                    <th className="text-center px-2 py-1 font-bold border-r border-[#222]">AI Signal</th>
                    <th className="text-center px-2 py-1 font-bold border-r border-[#222]">Confidence</th>
                    <th className="text-center px-2 py-1 font-bold border-r border-[#222]">Sentiment</th>
                    <th className="text-center px-2 py-1 font-bold border-r border-[#222]">Volatility</th>
                    <th className="text-center px-2 py-1 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.symbols.map((symbol: string) => {
                    const analysis = state.lastAnalysis[symbol];
                    const price = state.prices[symbol] || 0;
                    return (
                      <tr key={symbol} className="border-b border-[#1a1a1a] hover:bg-[#1e1e1e]">
                        <td className="px-2 py-1 font-bold text-neutral-300 border-r border-[#1a1a1a]">{symbol}</td>
                        <td className="px-2 py-1 text-right font-mono border-r border-[#1a1a1a]">{price.toFixed(symbol.length === 4 ? 2 : 5)}</td>
                        <td className="px-2 py-1 text-center border-r border-[#1a1a1a]">
                          {analysis ? (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                              analysis.prediction === 'up' ? "bg-emerald-500/20 text-emerald-500" : 
                              analysis.prediction === 'down' ? "bg-red-500/20 text-red-500" : "bg-neutral-500/20 text-neutral-500"
                            )}>
                              {analysis.prediction}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1 text-center border-r border-[#1a1a1a]">
                          {analysis ? `${(analysis.confidence * 100).toFixed(0)}%` : '-'}
                        </td>
                        <td className="px-2 py-1 text-center border-r border-[#1a1a1a]">
                          {analysis ? (
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-12 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full", analysis.sentiment > 0 ? "bg-emerald-500" : "bg-red-500")}
                                  style={{ width: `${Math.abs(analysis.sentiment) * 100}%`, marginLeft: analysis.sentiment > 0 ? '50%' : `${50 - Math.abs(analysis.sentiment) * 50}%` }}
                                />
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1 text-center border-r border-[#1a1a1a]">
                          {analysis ? (
                            <span className={cn(
                              "text-[9px] font-bold uppercase",
                              analysis.volatility === 'high' ? "text-orange-500" : 
                              analysis.volatility === 'medium' ? "text-yellow-500" : "text-emerald-500"
                            )}>
                              {analysis.volatility}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button 
                            onClick={() => selectSymbol(symbol)}
                            className="text-emerald-500 hover:text-emerald-400 font-bold uppercase text-[9px]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'History' && (
            <div className="p-0">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-[#1a1a1a] text-neutral-600 sticky top-0 border-b border-[#222]">
                  <tr>
                    <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Symbol</th>
                    <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Ticket</th>
                    <th className="text-left px-2 py-1 font-bold border-r border-[#222]">Type</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Volume</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Price</th>
                    <th className="text-right px-2 py-1 font-bold border-r border-[#222]">Profit</th>
                    <th className="text-right px-2 py-1 font-bold">Closed At</th>
                  </tr>
                </thead>
                <tbody>
                  {state.tradeHistory.map((trade: any) => (
                    <tr key={trade.id} className="border-b border-[#1a1a1a] hover:bg-[#1e1e1e]">
                      <td className="px-2 py-1 font-bold text-neutral-300 border-r border-[#1a1a1a]">{trade.pair}</td>
                      <td className="px-2 py-1 text-neutral-500 font-mono border-r border-[#1a1a1a]">{trade.id}</td>
                      <td className={cn("px-2 py-1 font-bold border-r border-[#1a1a1a]", trade.action === 'BUY' ? "text-[#00ff00]" : "text-[#ff4444]")}>{trade.action}</td>
                      <td className="px-2 py-1 text-right font-mono border-r border-[#1a1a1a]">{trade.amount.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right font-mono border-r border-[#1a1a1a]">{trade.price.toFixed(5)}</td>
                      <td className={cn("px-2 py-1 text-right font-mono border-r border-[#1a1a1a] font-bold", trade.profit >= 0 ? "text-[#00ff00]" : "text-red-500")}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-right font-mono text-neutral-500">
                        {new Date(trade.closedAt || trade.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'Journal' && (
            <div className="p-2 space-y-0.5 font-mono text-[10px] text-neutral-500">
              <p><span className="text-neutral-600">2026.04.07 15:43:25</span> AI Strategy: EURUSD H1 Analysis - Trend consistency check (Confidence: 84%)</p>
              <p><span className="text-neutral-600">2026.04.07 15:43:26</span> Terminal: Connected to {state.mt5Account.server}</p>
              <p className="text-emerald-500/60"><span className="text-neutral-600">2026.04.07 15:43:28</span> Trade: Position monitoring active.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-6 bg-[#252525] border-t border-[#111] flex items-center justify-between px-2 shrink-0 text-[10px] font-medium text-neutral-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> For Help, press F1</span>
          <div className="h-4 w-px bg-[#333]" />
          <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Default</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">O: 1.15586</span>
            <span className="text-neutral-500">H: 1.15744</span>
            <span className="text-neutral-500">L: 1.15567</span>
            <span className="text-neutral-500">C: 1.15736</span>
          </div>
          <div className="h-4 w-px bg-[#333]" />
          <span className="flex items-center gap-1 text-emerald-500 font-bold">
            <Wifi className="w-3 h-3" /> 262.76 ms
          </span>
        </div>
      </footer>
    </div>
  );
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode, label?: string }) {
  return (
    <button className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-[#333] rounded transition-colors group relative">
      <div className="text-neutral-500 group-hover:text-emerald-500">{icon}</div>
      {label && <span className="text-[10px] font-medium text-neutral-500 group-hover:text-neutral-300">{label}</span>}
    </button>
  );
}


