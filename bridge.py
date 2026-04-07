from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import MetaTrader5 as mt5
import uvicorn
import os
from typing import List, Optional

app = FastAPI(title="MT5 AI Bridge")

class TradeRequest(BaseModel):
    symbol: str
    action: str  # BUY or SELL
    volume: float
    sl: Optional[float] = None
    tp: Optional[float] = None

class ConnectionRequest(BaseModel):
    login: int
    password: str
    server: str

@app.on_event("startup")
def startup():
    if not mt5.initialize():
        print("MT5 initialize failed, error code =", mt5.last_error())
        return

    login = os.getenv("MT5_LOGIN")
    password = os.getenv("MT5_PASSWORD")
    server = os.getenv("MT5_SERVER")

    if login and password and server:
        authorized = mt5.login(int(login), password=password, server=server)
        if authorized:
            print(f"MT5 authorized successfully for account {login}")
        else:
            print(f"MT5 login failed for account {login}, error =", mt5.last_error())

@app.on_event("shutdown")
def shutdown():
    mt5.shutdown()

@app.get("/account")
def get_account():
    info = mt5.account_info()
    if info is None:
        raise HTTPException(status_code=500, detail="Failed to get account info")
    return info._asdict()

@app.get("/positions")
def get_positions():
    positions = mt5.positions_get()
    if positions is None:
        return []
    return [p._asdict() for p in positions]

@app.post("/connect")
def connect(req: ConnectionRequest):
    authorized = mt5.login(req.login, password=req.password, server=req.server)
    if authorized:
        account_info = mt5.account_info()._asdict()
        return {"success": True, "account": account_info}
    else:
        return {"success": False, "error": str(mt5.last_error())}

@app.get("/price/{symbol}")
def get_price(symbol: str):
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        raise HTTPException(status_code=404, detail="Symbol not found")
    return {
        "bid": tick.bid,
        "ask": tick.ask,
        "last": tick.last,
        "time": tick.time
    }

@app.get("/klines/{symbol}")
def get_klines(symbol: str, timeframe: str = "1m", count: int = 100):
    tf_map = {
        "1m": mt5.TIMEFRAME_M1,
        "5m": mt5.TIMEFRAME_M5,
        "15m": mt5.TIMEFRAME_M15,
        "1h": mt5.TIMEFRAME_H1,
        "4h": mt5.TIMEFRAME_H4,
        "1d": mt5.TIMEFRAME_D1
    }
    rates = mt5.copy_rates_from_pos(symbol, tf_map.get(timeframe, mt5.TIMEFRAME_M1), 0, count)
    if rates is None:
        return []
    return [
        {
            "time": int(r[0]),
            "open": float(r[1]),
            "high": float(r[2]),
            "low": float(r[3]),
            "close": float(r[4]),
            "volume": float(r[5])
        } for r in rates
    ]

@app.post("/order")
def place_order(req: TradeRequest):
    try:
        symbol_info = mt5.symbol_info(req.symbol)
        if symbol_info is None:
            raise HTTPException(status_code=404, detail="Symbol not found")

        if not symbol_info.visible:
            if not mt5.symbol_select(req.symbol, True):
                raise HTTPException(status_code=400, detail="Symbol select failed")

        order_type = mt5.ORDER_TYPE_BUY if req.action == "BUY" else mt5.ORDER_TYPE_SELL
        tick = mt5.symbol_info_tick(req.symbol)
        price = tick.ask if req.action == "BUY" else tick.bid

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": req.symbol,
            "volume": req.volume,
            "type": order_type,
            "price": price,
            "magic": 234000,
            "comment": "AI Bot Trade",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        if req.sl: request["sl"] = req.sl
        if req.tp: request["tp"] = req.tp

        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return {"success": False, "error": str(result.comment), "retcode": result.retcode}
        
        return {"success": True, "order": result.order, "price": result.price}
    except Exception as e:
        return {"success": False, "error": str(e)}

class CloseRequest(BaseModel):
    order: int

@app.post("/close")
def close_order(req: CloseRequest):
    try:
        # Find the position by order ID
        positions = mt5.positions_get(ticket=req.order)
        if not positions:
            return {"success": False, "error": "Position not found"}
        
        position = positions[0]
        symbol = position.symbol
        order_type = mt5.ORDER_TYPE_SELL if position.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
        tick = mt5.symbol_info_tick(symbol)
        price = tick.bid if position.type == mt5.POSITION_TYPE_BUY else tick.ask

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": position.volume,
            "type": order_type,
            "position": position.ticket,
            "price": price,
            "magic": 234000,
            "comment": "AI Bot Close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return {"success": False, "error": str(result.comment), "retcode": result.retcode}
        
        return {
            "success": True, 
            "price": result.price, 
            "profit": position.profit + position.swap + position.commission
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
