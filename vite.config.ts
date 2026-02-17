import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react()];
  
  // Only include lovable-tagger in development mode
  // Skip it in production builds (like on Vercel) to avoid build errors
  if (mode === "development") {
    try {
      const { componentTagger } = require("lovable-tagger");
      plugins.push(componentTagger());
    } catch {
      // Plugin not available, skip it (expected in production builds)
    }
  }

  return {
    root: process.cwd(),
    plugins,
    server: {
      host: "::",
      port: 8080,
      strictPort: false,
      proxy: {
        '/api': { target: 'http://localhost:3005', changeOrigin: true },
        '/ai': { target: 'http://localhost:3005', changeOrigin: true },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
      },
    },
  };
});
