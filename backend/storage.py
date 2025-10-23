#Storage.py
import json
import threading
from pathlib import Path
from typing import Dict, Any, Optional

LOCK = threading.Lock()
DEFAULT_PATH = Path("watchlists.json")
DEFAULT_STRUCTURE = {
    "next_id": 1,
    "watchlists": {}  # id (str) -> {id:int, user_id:str, name:str, symbols:list[str]}
}

def load_store(path: Path = DEFAULT_PATH) -> Dict[str, Any]:
    """
    Carga la estructura desde el archivo JSON.
    Si el archivo no existe, retorna la estructura por defecto.
    NO intenta crear el archivo aquí.
    """
    print(f"[DEBUG] load_store: Intentando adquirir LOCK para {path}") # Debug 1
    with LOCK:
        print(f"[DEBUG] load_store: LOCK adquirido, verificando existencia de {path}") # Debug 2
        if not path.exists():
            print(f"[DEBUG] load_store: {path} NO existe. Retornando DEFAULT_STRUCTURE.") # Debug 3
            # Retorna la estructura por defecto sin crear el archivo aún
            return DEFAULT_STRUCTURE.copy()
        print(f"[DEBUG] load_store: {path} EXISTE. Intentando leer.") # Debug 5
        with path.open("r", encoding="utf-8") as f:
            print(f"[DEBUG] load_store: Archivo abierto, intentando json.load") # Debug 6
            data = json.load(f)
            print(f"[DEBUG] load_store: json.load completado, retornando datos") # Debug 7
            return data

def ensure_store_exists(path: Path = DEFAULT_PATH) -> None:
    """
    Asegura que el archivo JSON exista con una estructura válida.
    Si no existe, lo crea con DEFAULT_STRUCTURE.
    """
    print(f"[DEBUG] ensure_store_exists: Verificando existencia de {path}") # Debug A
    if not path.exists():
        print(f"[DEBUG] ensure_store_exists: {path} no existe. Creando con dump_store.") # Debug B
        dump_store(DEFAULT_STRUCTURE, path) # dump_store maneja su propio LOCK
        print(f"[DEBUG] ensure_store_exists: dump_store completado.") # Debug C

def dump_store(data: Dict[str, Any], path: Path = DEFAULT_PATH) -> None:
    """
    Escribe la estructura de datos en el archivo JSON temporalmente y lo renombra.
    """
    print(f"[DEBUG] dump_store: Intentando adquirir LOCK para escribir en {path}") # Debug 8
    with LOCK:
        print(f"[DEBUG] dump_store: LOCK adquirido, escribiendo en archivo temporal") # Debug 9
        tmp = path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[DEBUG] dump_store: archivo temporal escrito, reemplazando original") # Debug 10
        tmp.replace(path)
        print(f"[DEBUG] dump_store: archivo original reemplazado, operación completada") # Debug 11

def create_watchlist(name: str, user_id: str = "local", path: Path = DEFAULT_PATH) -> Dict[str, Any]:
    print(f"[DEBUG] create_watchlist: Iniciando creación de '{name}' para user '{user_id}'") # Debug 12
    # Asegura que el archivo exista antes de intentar leerlo
    ensure_store_exists(path)
    # Ahora carga el estado actual
    store = load_store(path) # <- Llamada aquí, ya sabemos que el archivo existe
    print(f"[DEBUG] create_watchlist: load_store completado, datos cargados: {store}") # Debug 13
    wid = store["next_id"]
    wl = {"id": wid, "user_id": user_id, "name": name, "symbols": []}
    store["watchlists"][str(wid)] = wl
    store["next_id"] = wid + 1
    print(f"[DEBUG] create_watchlist: Estructura actualizada, guardando...") # Debug 14
    dump_store(store, path) # <- Llamada aquí
    print(f"[DEBUG] create_watchlist: dump_store completado, retornando nueva watchlist: {wl}") # Debug 15
    return wl


# --- Actualiza las demás funciones para usar ensure_store_exists si es necesario ---
# Solo get_watchlists y get_watchlist podrían necesitarlo si se llama a load_store
# antes de que el archivo exista. Es mejor asegurarse al principio de cada función
# que puede interactuar con el archivo.

def delete_watchlist(wid: str, path: Path = DEFAULT_PATH) -> bool:
    ensure_store_exists(path) # Asegura existencia
    store = load_store(path)
    if wid in store["watchlists"]:
        del store["watchlists"][wid]
        dump_store(store, path)
        return True
    return False

def get_watchlists(path: Path = DEFAULT_PATH):
    ensure_store_exists(path) # Asegura existencia
    store = load_store(path)
    return list(store["watchlists"].values())

def get_watchlist(wid: str, path: Path = DEFAULT_PATH) -> Optional[Dict[str, Any]]:
    ensure_store_exists(path) # Asegura existencia
    store = load_store(path)
    return store["watchlists"].get(wid)

def add_symbol(wid: str, symbol: str, path: Path = DEFAULT_PATH) -> bool:
    ensure_store_exists(path) # Asegura existencia
    store = load_store(path)
    if wid not in store["watchlists"]:
        return False
    syms = store["watchlists"][wid]["symbols"]
    s = symbol.upper()
    if s not in syms:
        syms.append(s)
        dump_store(store, path)
    return True

def remove_symbol(wid: str, symbol: str, path: Path = DEFAULT_PATH) -> bool:
    ensure_store_exists(path) # Asegura existencia
    store = load_store(path)
    if wid not in store["watchlists"]:
        return False
    s = symbol.upper()
    syms = store["watchlists"][wid]["symbols"]
    if s in syms:
        syms.remove(s)
        dump_store(store, path)
        return True
    return False