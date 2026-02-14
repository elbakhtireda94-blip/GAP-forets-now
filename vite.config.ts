import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: false, // si 8080 occupé, Vite essaie 8081, 8082, etc.
    proxy: {
      // En dev, proxy vers le backend (même port que VITE_MYSQL_API_URL)
      '/api': { target: 'http://localhost:3005', changeOrigin: true },
      '/ai': { target: 'http://localhost:3005', changeOrigin: true },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
