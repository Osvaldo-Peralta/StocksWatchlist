// src/components/WatchlistTable.jsx
import React from "react";

// Función de utilidad para formatear números (puedes moverla a un archivo de utilidades si lo prefieres)
const formatNumber = (v) => {
  if (typeof v !== "number") return v ?? "-";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const WatchlistTable = ({ watchlist, quotes }) => {
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
      <table className="w-full text-sm">
        <thead className="bg-gray-700 text-gray-300">
          <tr>
            <th className="text-left px-4 py-3">Símbolo</th>
            <th className="text-right px-4 py-3">Última</th>
            <th className="text-right px-4 py-3">Cambio</th>
          </tr>
        </thead>
        <tbody>
          {watchlist.symbols.length === 0 ? (
            <tr>
              <td colSpan="3" className="px-4 py-6 text-center text-gray-400">
                No hay símbolos en esta lista. Agrega alguno desde la API o frontend.
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
  );
};

export default WatchlistTable;