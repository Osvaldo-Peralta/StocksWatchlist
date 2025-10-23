// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import WatchlistSelector from "./components/WatchlistSelector";
import WatchlistTable from "./components/WatchlistTable";

const API_URL = import.meta.env.VITE_API ?? "http://127.0.0.1:8000";

export default function App() {
  const [watchlists, setWatchlists] = useState([]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  // Función para recargar todas las watchlists
  const loadWatchlists = async () => {
    try {
      setLoading(true); // Activar loading al inicio de la recarga
      setError(null);   // Limpiar error anterior
      const res = await axios.get(`${API_URL}/watchlists`);
      setWatchlists(res.data);

      // Opcional: Mantener la selección si la watchlist sigue existiendo
      // Si la watchlist seleccionada fue borrada, setSelectedWatchlistId(null) o la primera disponible
      if (res.data.length === 0) {
        setSelectedWatchlistId(null); // O manejar el caso de lista vacía como quieras
      } else if (!res.data.some(wl => wl.id === selectedWatchlistId)) {
        // Si la seleccionada ya no existe, selecciona la primera
        setSelectedWatchlistId(res.data[0].id);
      }
      setLoading(false); // Desactivar loading al finalizar
    } catch (err) {
      console.error("Error reloading watchlists", err);
      setError(err.message || "Error al recargar las watchlists.");
      setLoading(false); // Asegurarse de desactivar loading también en caso de error
    }
  };

  // Cargar todas las watchlists inicialmente
  useEffect(() => {
    let mounted = true;
    setError(null);
    setLoading(true);

    async function load() {
      try {
        const res = await axios.get(`${API_URL}/watchlists`);
        if (!mounted) return;

        setWatchlists(res.data);

        if (res.data.length === 0) {
          const create = await axios.post(`${API_URL}/watchlists`, { name: "Compras" });
          setWatchlists([create.data]);
          setSelectedWatchlistId(create.data.id);
        } else {
          setSelectedWatchlistId(res.data[0].id);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching watchlists", err);
        setError(err.message || "Error al cargar las watchlists.");
        setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  // Conectar al WebSocket cuando cambia la watchlist seleccionada
  useEffect(() => {
    if (!selectedWatchlistId) {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        return;
    }

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

    return () => {
      ws.close();
      wsRef.current = null;
    };

  }, [selectedWatchlistId]);

  // --- Renderizado ---
  if (loading && watchlists.length === 0) { // Mostrar carga solo si es la carga inicial
    return (
      <div className="min-h-screen p-6 bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">Cargando watchlists...</div>
          <div className="mt-2 text-gray-400">Por favor espere.</div>
        </div>
      </div>
    );
  }

  if (error && watchlists.length === 0) { // Mostrar error solo si es la carga inicial
    return (
      <div className="min-h-screen p-6 bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-500">Error</div>
          <div className="mt-2 text-gray-300">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto">
        <WatchlistSelector
          watchlists={watchlists}
          selectedWatchlistId={selectedWatchlistId}
          onSelectWatchlist={setSelectedWatchlistId}
        />

        {/* Pasa la función loadWatchlists como prop */}
        <WatchlistTable
          watchlist={watchlists.find(wl => wl.id === selectedWatchlistId) || null}
          quotes={quotes}
          onUpdateWatchlists={loadWatchlists}
        />
      </div>
    </div>
  );
}