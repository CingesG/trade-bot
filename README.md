# 🤖 Ultimate AI MT5 Trading Bot (Pro Edition)

This is a professional-grade, full-stack algorithmic trading system that connects an **AI-driven Node.js backend** to the **MetaTrader 5 (MT5)** terminal via a **Python Bridge**.

## 🚀 Key Features
- **Real-Time MT5 Integration:** Uses a Python FastAPI bridge to execute real trades and fetch live tick data.
- **AI-Powered Analysis:** Multi-indicator analysis (RSI, EMA, MACD) validated by Gemini 2.0 Flash AI.
- **WebSocket Streaming:** Real-time price and analysis updates pushed to the frontend via WebSockets (Port 3000).
- **Professional Risk Management:** 
  - Automatic lot sizing based on **1% risk** per trade.
  - Strict limits on concurrent trades and daily loss limits.
  - Symbol-aware SL/TP calculations.
- **Persistence:** Trade history and performance logs stored in Firebase Firestore.
- **Pro UI:** High-performance dashboard with real-time P/L tracking and bridge health monitoring.

## 🏗️ Architecture
1. **Frontend (React/Vite):** Professional trading dashboard.
2. **Backend (Node.js/Express):** Core bot logic, strategy execution, and WebSocket server.
3. **Bridge (Python/FastAPI):** Intermediary between Node.js and the MetaTrader 5 Terminal.
4. **Database (Firebase):** Firestore for trade logging and performance tracking.
5. **Terminal (MetaTrader 5):** The execution platform connected to your broker.

## 🛠️ Setup Instructions

### 1. Requirements
- MetaTrader 5 Terminal installed and logged into a broker account.
- Python 3.10+
- Node.js 18+

### 2. Run the Python Bridge
Navigate to the root directory and install dependencies:
```bash
pip install MetaTrader5 fastapi uvicorn pydantic axios
```
Run the bridge:
```bash
python bridge.py
```
*The bridge will start on `http://localhost:8001`.*

### 3. Run the Trading Bot (Node.js)
Install dependencies:
```bash
npm install
```
Start the development server:
```bash
npm run dev
```
*The app will be available at `http://localhost:3000`.*

### 4. Connect to MT5
1. Open the app in your browser.
2. In the login screen, toggle **"Use Python Bridge (Real MT5)"**.
3. Enter your MT5 Account ID, Password, and Server.
4. Click **Login to Terminal**.

## ⚠️ Disclaimer
Trading involves significant risk. This bot is provided for educational purposes. Always test on a **Demo Account** for at least 2 weeks before using real funds. The developers are not responsible for any financial losses.

## 📄 License
MIT
