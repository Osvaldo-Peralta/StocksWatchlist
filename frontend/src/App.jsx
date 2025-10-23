// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
// --- Importar aqui los componentes ---
import WatchlistSelector from "./components/WatchlistSelector";
import WatchlistTable from "./components/WatchlistTable";

const API_URL = import.meta.env.VITE_API ?? "http://127.0.0.1:8000";

export default function App() {
  const [watchlists, setWatchlists] = useState([]); // Lista de todas las watchlist
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null); // ID de la watchlist Seleccionada
  const [quotes, setQuotes] = useState({}); // Precios de los símbolos de la watchlist seleccionada
  const wsRef = useRef(null);

  // Cargar todas las watchlists
  useEffect(() => {
    let mounted = true;
    async function load() {
      try{
        const res = await axios.get(`${API_URL}/watchlists`);
        if (!mounted) return;

        setWatchlists(res.data); //Guardo todas las watchlists

        // Si no hay respuesta, crear por defecto
        if (res.data.length === 0) {
          const create = await axios.post(`${API_URL}/watchlists`, {name: "Compras"});
          setWatchlists([create.data]); // Actualizar la lista con la recien creada
          setSelectedWatchlistId(res.data[0].id);
        } else {
          // Seleccionar la primera por defecto
          setSelectedWatchlistId(res.data[0].id);
        }
      } catch(err) {
        console.error("Error recibiendo watchlists", err);
        // Agregar un mensaje error para la UI (en el futuro)
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  // Conectar al WebSocket cuando cambia la watchlist seleccionada
  useEffect(() => {
    if(!selectedWatchlistId) return; // No conectar si no hay lista seleccionada

    // Cerrar la conexión existente si la hay
    if (wsRef.current){
      wsRef.current.close();
    }

    const urlbase = API_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${urlbase}/ws/watchlists/${selectedWatchlistId}`);
    wsRef.current = ws;

    ws.onopen = () => console.log(`WS Conectado para watchlist ${selectedWatchlistId}`)
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.updates) {
          setQuotes((prev) => {
            const next = { ...prev }
            for (const k of Object.keys(msg.updates)) {
              next[k] = msg.updates[k];
            }
            return next;
          });
        } else if (msg.status === "connected") {
          console.log("Conectado a watchlist: ", msg.watchlist, "símbolos: ", msg.symbols);
        }
      } catch (error) {
        console.warn("WS message parse error", error)
      }
    };
    ws.onclose = () => console.log(`WS cerrado para Watchlist ${selectedWatchlistId}`);
    ws.onerror = (e) => console.warn("WS Error", e);

    // Limpiar la conexión cuando cambie la watchlist seleccionada o se desmonte el componente
    return() => {
      ws.close();
      wsRef.current = null;
    };
  }, [selectedWatchlistId]); // <--- Dependencia: Reconecta si cambia selectedWatchlistId

  // Obtener la watchlist seleccionada
  const selectedWatchlist = watchlists.find(wl => wl.id === selectedWatchlistId) || null;

  // Manejar selección
  const handleSelectWatchlist = (id) => {
    setSelectedWatchlistId(id)
  }

  // Renderizar
  return(
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto">
        {/* Usar el componente WatchlistSelector */}
          <WatchlistSelector
          watchlists={watchlists}
          selectedWatchlistId={selectedWatchlist}
          onSelectWatchlist={handleSelectWatchlist}
          />

        {/* Usar el componente WatchlistTable */}
        <WatchlistTable watchlist={selectedWatchlist} quotes={quotes}/>
      </div>
    </div>
  )
}