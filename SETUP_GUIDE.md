# Professional AI Trading Terminal Setup Guide

## 🚀 Overview
This system is a high-performance AI trading terminal designed for MetaTrader 5. It supports multi-asset trading including Forex, Commodities (Gold), and Indices.

## 🔌 Account Connection Principles
1. **Broker Independence**: Works with any MT5 broker (IC Markets, Pepperstone, MetaQuotes, etc.).
2. **Account Types**:
   - **Demo Account**: Recommended for initial 100+ trades to verify AI strategy.
   - **Live Account**: Only connect after consistent demo performance.
3. **Secure Bridge**: Uses MetaApi to establish a secure cloud connection. Your credentials are used only to create the session.

## 📊 Supported Symbols
- **Forex**: EURUSD, GBPUSD, USDJPY, etc.
- **Commodities**: XAUUSD (Gold).
- **Indices**: US30, NAS100.
- **Crypto**: BTCUSD, ETHUSD (if supported by your broker).

## 🛡️ Risk Management Standards
- **Equity-Based Sizing**: Position sizes are calculated dynamically based on current equity.
- **2% Rule**: No single trade risks more than 2% of the account balance.
- **Hard SL/TP**: Every trade is sent with a hard Stop Loss and Take Profit to the broker server.
- **Leverage**: Optimized for 1:500 leverage, but adaptable to lower settings.

## 🧠 AI Strategy
- **Tick-Level Analysis**: Processes real-time market data for precise entries.
- **Multi-Indicator Confirmation**: RSI, MACD, and SMA must align with AI LSTM predictions.
- **High Confidence Filter**: Only trades with >80% AI confidence are executed.

## 🧪 Getting Started
1. Connect your **MT5 Demo Account** via the Terminal UI.
2. Select your preferred symbols from the **Market Watch** bar.
3. Start the **AI Engine** and monitor the **Live Trade Logs**.
