// src/components/WatchlistTable.jsx
import React, { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API ?? "http://127.0.0.1:8000";

const formatNumber = (v) => {
  if (typeof v !== "number") return v ?? "-";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const WatchlistTable = ({ watchlist, quotes, onUpdateWatchlists }) => {
  const [newSymbol, setNewSymbol] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Nueva función para eliminar un símbolo ---
  const handleRemoveSymbol = async (symbolToRemove) => {
    if (!watchlist || !symbolToRemove) return;

    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_URL}/watchlists/${watchlist.id}/symbols/${symbolToRemove}`);
      // Notificar a App.jsx para que recargue las watchlists
      if (onUpdateWatchlists) {
        await onUpdateWatchlists();
      }
    } catch (err) {
      console.error("Error removing symbol", err);
      setError(err.response?.data?.detail || "Error al eliminar el símbolo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSymbol = async () => {
    if (!newSymbol.trim() || !watchlist) return;

    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/watchlists/${watchlist.id}/symbols`, {
        symbol: newSymbol.trim()
      });
      setNewSymbol("");
      if (onUpdateWatchlists) {
        await onUpdateWatchlists();
      }
    } catch (err) {
      console.error("Error adding symbol", err);
      setError(err.response?.data?.detail || "Error al agregar el símbolo.");
    } finally {
      setLoading(false);
    }
  };

  if (!watchlist) {
    return (
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
            <tr>
              <td colSpan="3" className="px-4 py-6 text-center text-gray-400">
                No hay lista seleccionada.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* --- Sección para agregar símbolo --- */}
      <div className="p-4 bg-gray-750 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Símbolo (ej. AAPL)"
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleAddSymbol}
            disabled={loading || !newSymbol.trim()}
            className={`px-4 py-2 rounded-md ${
              loading || !newSymbol.trim()
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading ? "Agregando..." : "Agregar"}
          </button>
        </div>
        {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
      </div>
      {/* --- Fin de la sección --- */}

      <table className="w-full text-sm">
        <thead className="bg-gray-700 text-gray-300">
          <tr>
            <th className="text-left px-4 py-3">Símbolo</th>
            <th className="text-right px-4 py-3">Última</th>
            <th className="text-right px-4 py-3">Cambio</th>
            <th className="text-right px-4 py-3">Eliminar</th> {/* Nueva columna para el botón */}
          </tr>
        </thead>
        <tbody>
          {watchlist.symbols.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-4 py-6 text-center text-gray-400">
                No hay símbolos en esta lista.
              </td>
            </tr>
          ) : (
            watchlist.symbols.map((sym) => {
              const d = quotes[sym] ?? {};
              const last = d.last ?? "-";
              const change = d.change ?? 0;
              const pct = d.pct_change ?? 0;
              const isUp = pct > 0;

              return (
                <tr
                  key={sym}
                  className="border-b border-gray-700 hover:bg-gray-750 transition-colors duration-150" // Efecto hover en la fila
                >
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
                  {/* --- Botón de Eliminar (solo visible al hacer hover | No funciona arreglar!!) --- */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemoveSymbol(sym)}
                      className="group-hover:opacity-100 transition-opacity duration-150 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs"
                    >
                      X
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WatchlistTable;