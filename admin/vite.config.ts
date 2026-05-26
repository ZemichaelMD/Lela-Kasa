import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const local = (sub: string) => fileURLToPath(new URL(sub, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@", replacement: local("./src") },
      { find: "@kasa/contract", replacement: local("./src/contract") },
      { find: "@kasa/sdk", replacement: local("./src/sdk") },
      { find: "@kasa/utils", replacement: local("./src/utils") },
      { find: "@kasa/ui", replacement: local("./src/ui") },
    ],
  },
  optimizeDeps: {
    exclude: ["@kasa/contract", "@kasa/sdk", "@kasa/ui", "@kasa/utils"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["lucide-react", "sonner", "clsx", "tailwind-merge"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
