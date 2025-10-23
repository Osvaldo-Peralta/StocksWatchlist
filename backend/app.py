#App.py
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import yfinance as yf
import logging
import json
import asyncio

from storage import (
    create_watchlist, delete_watchlist, get_watchlists, get_watchlist,
    add_symbol, remove_symbol
)

app = FastAPI(title="Watchlists API")

# Configurar logging para WebSocket
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # durante desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# 🔹 MODELOS
# ==========================================================

class CreateWatchlist(BaseModel):
    name: str
    user_id: Optional[str] = "local"

class SymbolPayload(BaseModel):
    symbol: str

# ==========================================================
# 🔹 ENDPOINTS REST
# ==========================================================

@app.post("/watchlists", response_model=Dict[str, Any])
def api_create_watchlist(payload: CreateWatchlist):
    wl = create_watchlist(payload.name, payload.user_id)
    return wl

@app.get("/watchlists")
def api_get_watchlists():
    return get_watchlists()

@app.get("/watchlists/{wid}")
def api_get_watchlist(wid: str):
    wl = get_watchlist(wid)
    if wl is None:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return wl

@app.delete("/watchlists/{wid}")
def api_delete_watchlist(wid: str):
    ok = delete_watchlist(wid)
    if not ok:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return {"deleted": True}

@app.post("/watchlists/{wid}/symbols")
def api_add_symbol(wid: str, payload: SymbolPayload):
    ok = add_symbol(wid, payload.symbol)
    if not ok:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return {"added": payload.symbol.upper()}

@app.delete("/watchlists/{wid}/symbols/{symbol}")
def api_remove_symbol(wid: str, symbol: str):
    ok = remove_symbol(wid, symbol)
    if not ok:
        raise HTTPException(status_code=404, detail="Symbol or watchlist not found")
    return {"removed": symbol.upper()}

# ==================================
# WebSockets
# ==================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {} # Key: watchlist_id, Value: WebSocket

    async def connect(self, websocket: WebSocket, watchlist_id: str):
        await websocket.accept()
        # Manejar múltiples conexiones si es necesario, pero aquí asumimos una por watchlist_id
        # Si ya hay una conexión para esta watchlist, la desconecta
        if watchlist_id in self.active_connections:
            await self.active_connections[watchlist_id].close()
        self.active_connections[watchlist_id] = websocket
        logger.info(f"WebSocket conectado para watchlist_id: {watchlist_id}")

    def disconnect(self, watchlist_id: str):
        if watchlist_id in self.active_connections:
            del self.active_connections[watchlist_id]
            logger.info(f"WebSocket desconectado para watchlist_id: {watchlist_id}")

    async def send_personal_message(self, message: str, watchlist_id: str):
        if watchlist_id in self.active_connections:
            await self.active_connections[watchlist_id].send_text(message)

    # Opcional: enviar a todos los clientes conectados
    # async def broadcast(self, message: str):
    #     for connection in self.active_connections.values():
    #         await connection.send_text(message)

manager = ConnectionManager()

# Nueva función para obtener precios (usa yfinance)
# --- Modificación en la función get_prices_for_symbols ---
def get_prices_for_symbols(symbols: List[str]) -> Dict[str, Any]:
    if not symbols:
        return {}
    try:
        tickers = yf.Tickers(symbols)
        prices_data = {}
        for symbol in symbols:
            ticker = tickers.tickers.get(symbol)
            if ticker:
                info = ticker.info
                current_price = info.get("currentPrice") or info.get("regularMarketPrice")
                previous_close = info.get("previousClose")
                
                # Calcular cambio y cambio porcentual
                change = 0.0
                change_pct = 0.0
                if current_price is not None and previous_close is not None:
                    change = current_price - previous_close
                    if previous_close != 0:
                        change_pct = (change / previous_close) * 100
                
                # Formato que espera el frontend: { symbol: { last, change, pct_change } }
                prices_data[symbol] = {
                    "last": current_price, # <-- Cambiado de "currentPrice" a "last"
                    "change": change,
                    "pct_change": change_pct # <-- Cambiado de "changePercent" a "pct_change"
                }
            else:
                # Manejar símbolos que no se pudieron obtener
                prices_data[symbol] = {
                    "last": "N/A",
                    "change": 0.0,
                    "pct_change": 0.0
                }
        return prices_data
    except Exception as e:
        logger.error(f"Error obteniendo precios para {symbols}: {e}")
        # Devolver valores por defecto en caso de error
        return {sym: {"last": "Error", "change": 0.0, "pct_change": 0.0} for sym in symbols}

# Opcional: Si el frontend espera exactamente /ws/watchlists/{wid}, cámbialo:
# --- Modificación en el WebSocket ---
@app.websocket("/ws/watchlists/{wid}")
async def websocket_endpoint(websocket: WebSocket, wid: str):
    initial_wl = get_watchlist(wid)
    if initial_wl is None:
        await websocket.close(code=1008, reason="Watchlist no encontrada")
        return
    await manager.connect(websocket, wid)
    try:
        # Enviar datos iniciales
        symbols = initial_wl.get("symbols", [])
        initial_prices = get_prices_for_symbols(symbols)
        
        # Formato correcto para el frontend: { updates: { SYMBOL: { last, change, pct_change } } }
        initial_message = {
            "updates": initial_prices # <-- Enviamos directamente el objeto de precios como "updates"
        }
        await manager.send_personal_message(json.dumps(initial_message), wid)

        # Bucle para enviar actualizaciones periódicas
        while True:
            await asyncio.sleep(60) # Ajusta el intervalo según sea necesario
            current_wl = get_watchlist(wid)
            if current_wl:
                symbols = current_wl.get("symbols", [])
                prices = get_prices_for_symbols(symbols)
                update_message = {
                    "updates": prices # <-- Enviamos directamente el objeto de precios como "updates"
                }
                await manager.send_personal_message(json.dumps(update_message), wid)
            else:
                logger.warning(f"Watchlist {wid} ya no existe, cerrando WebSocket.")
                break
    except WebSocketDisconnect:
        manager.disconnect(wid)
    except Exception as e:
        logger.error(f"Error en WebSocket para watchlist {wid}: {e}")
        manager.disconnect(wid)