import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const local = (sub: string) => fileURLToPath(new URL(sub, import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.svg", "apple-touch-icon.png", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "LeLa Kasa",
        short_name: "LeLa Kasa",
        description: "LeLa Kasa owner & staff portal",
        theme_color: "#073924",
        background_color: "#073924",
        display: "standalone",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
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
          "vendor-charts": ["recharts"],
          "vendor-dates": ["date-fns", "date-fns-tz", "react-day-picker"],
          "vendor-ui": ["lucide-react", "sonner", "clsx", "tailwind-merge"],
          "vendor-markdown": ["react-markdown", "remark-gfm"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
