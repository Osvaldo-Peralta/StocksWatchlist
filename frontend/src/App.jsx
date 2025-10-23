// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API ?? "http://127.0.0.1:8000";

function formatNumber(v) {
  if (typeof v !== "number") return v ?? "-";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App() {
  // --- Cambio 1: Estado para todas las watchlists y la seleccionada ---
  const [watchlists, setWatchlists] = useState([]); // Lista de todas las watchlists
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null); // ID de la watchlist seleccionada
  const [quotes, setQuotes] = useState({}); // Precios de los símbolos de la watchlist seleccionada
  const wsRef = useRef(null);

  // Cargar todas las watchlists
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await axios.get(`${API_URL}/watchlists`);
        if (!mounted) return;

        setWatchlists(res.data); // Guardar todas las watchlists

        // Si no hay ninguna, crear una por defecto
        if (res.data.length === 0) {
          const create = await axios.post(`${API_URL}/watchlists`, { name: "Compras" });
          setWatchlists([create.data]); // Actualizar la lista con la nueva
          setSelectedWatchlistId(create.data.id); // Seleccionarla
        } else {
          // Seleccionar la primera por defecto
          setSelectedWatchlistId(res.data[0].id);
        }
      } catch (err) {
        console.error("Error fetching watchlists", err);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  // Conectar al WebSocket cuando cambia la watchlist seleccionada
  useEffect(() => {
    if (!selectedWatchlistId) return; // No conectar si no hay una seleccionada

    // --- Cambio 2: Cerrar la conexión anterior si existe ---
    if (wsRef.current) {
      wsRef.current.close();
    }

    const urlBase = API_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${urlBase}/ws/watchlists/${selectedWatchlistId}`);
    wsRef.current = ws;

    ws.onopen = () => console.log(`WS conectado para watchlist ${selectedWatchlistId}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.updates) {
          setQuotes((prev) => {
            const next = { ...prev };
            for (const k of Object.keys(msg.updates)) {
              next[k] = msg.updates[k];
            }
            return next;
          });
        } else if (msg.status === "connected") {
          console.log("Conectado a watchlist:", msg.watchlist, "símbolos:", msg.symbols);
        }
      } catch (e) {
        console.warn("WS message parse error", e);
      }
    };
    ws.onclose = () => console.log(`WS cerrado para watchlist ${selectedWatchlistId}`);
    ws.onerror = (e) => console.warn("WS error", e);

    // --- Cambio 3: Limpiar la conexión cuando cambie la watchlist seleccionada ---
    return () => {
      ws.close();
      wsRef.current = null;
    };

  }, [selectedWatchlistId]); // <-- Dependencia: reconecta si cambia selectedWatchlistId

  // --- Cambio 4: Obtener la watchlist seleccionada ---
  const selectedWatchlist = watchlists.find(wl => wl.id === selectedWatchlistId) || null;

  if (!selectedWatchlist) {
    return <div className="p-8 text-center text-gray-300">Cargando lista...</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto">

        {/* --- Cambio 5: Añadir selector de watchlists --- */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Seleccionar Lista:</label>
          <select
            value={selectedWatchlistId}
            onChange={(e) => setSelectedWatchlistId(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
          >
            {watchlists.map((wl) => (
              <option key={wl.id} value={wl.id}>
                {wl.name} ({wl.symbols.length} símbolos)
              </option>
            ))}
          </select>
        </div>

        <h1 className="text-2xl font-bold mb-4">{selectedWatchlist.name}</h1>
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-700 text-gray-300">
              <tr>
                <th className="text-left px-4 py-3">Símbolo</th>
                <th className="text-right px-4 py-3">Última</th>
                <th className="text-right px-4 py-3">Cambio</th>
              </tr>
            </thead>
            <tbody>
              {selectedWatchlist.symbols.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-6 text-center text-gray-400">
                    No hay símbolos en esta lista. Agrega alguno desde la API o frontend.
                  </td>
                </tr>
              ) : (
                selectedWatchlist.symbols.map((sym) => {
                  const d = quotes[sym] ?? {};
                  const last = d.last ?? "-";
                  const change = d.change ?? 0;
                  const pct = d.pct_change ?? 0;
                  const isUp = pct > 0;
                  return (
                    <tr key={sym} className="border-b border-gray-700">
                      <td className="px-4 py-3 font-semibold">{sym}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(last)}</td>
                      <td
                        className={`px-4 py-3 text-right ${
                          isUp ? "text-green-400" : pct < 0 ? "text-red-400" : "text-gray-300"
                        }`}
                      >
                        {change > 0 ? "+" : ""}
                        {formatNumber(change)} ({pct > 0 ? "+" : ""}
                        {Number(pct).toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}