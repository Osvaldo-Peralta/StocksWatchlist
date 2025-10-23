// src/components/WatchlistSelector.jsx
import React from "react";

const WatchlistSelector = ({ watchlists, selectedWatchlistId, onSelectWatchlist }) => {
  // Manejar el cambio de selección
  const handleChange = (e) => {
    const id = parseInt(e.target.value);
    onSelectWatchlist(id);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Seleccionar Lista:</label>
      <select
        value={selectedWatchlistId || ""} // Valor vacío si no hay selección
        onChange={handleChange}
        className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
      >
        {watchlists.map((wl) => (
          <option key={wl.id} value={wl.id}>
            {wl.name} ({wl.symbols.length} símbolos)
          </option>
        ))}
      </select>
    </div>
  );
};

export default WatchlistSelector;