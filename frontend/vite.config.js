import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for Wildlife Population Intelligence System frontend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // allows access from LAN / Docker container
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
