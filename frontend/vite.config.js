/*
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
*/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

/**
 * Proxy: redirige /api (o rutas específicas) al backend en desarrollo
 * para evitar CORS. Ajusta target si tu backend corre en otra URL.
 */
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    proxy: {
      // ejemplo: todas las llamadas a /api/* se proxyean a http://127.0.0.1:8000
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
