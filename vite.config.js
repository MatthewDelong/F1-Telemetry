import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifestFilename: "manifest.json",
      manifest: {
        id: "/",
        name: "Formula One Telemetry",
        short_name: "F1-Telemetry",
        description: "In-depth Formula 1 Telemetry and Analysis",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "any",
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("three")) return "vendor-three";
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            )
              return "vendor-react";
            if (
              id.includes("flowbite") ||
              id.includes("framer-motion") ||
              id.includes("classnames")
            )
              return "vendor-ui";
            if (id.includes("d3") || id.includes("recharts"))
              return "vendor-charts";
            if (
              id.includes("axios") ||
              id.includes("lottie-web") ||
              id.includes("google/model-viewer")
            )
              return "vendor-heavy";
            return "vendor";
          }
        },
      },
    },
  },
  base: "/",
  server: {
    port: 3006,
    strictPort: true,
    open: true,
    hmr: {
      port: 3006,
    },
    proxy: {
      "/openf1": {
        target: "https://api.openf1.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openf1/, ""),
      },
    },
  },
  optimizeDeps: {
    include: ["flowbite-react"],
  },
});
