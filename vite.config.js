import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import Sitemap from "vite-plugin-sitemap";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    Sitemap({
      hostname: "https://f1-telemetry.co.uk",
      outDir: "build",
      dynamicRoutes: [
        "/about-us",
        "/race-results",
        "/constructor-standings",
        "/driver-standings",
        "/teammates-comparison",
        "/driver-comparison",
        "/ar-viewer",
        "/f1a/race-results",
        "/f1a/driver-standings",
        "/f1a/constructor-standings",
        "/f2/race-results",
        "/f2/driver-standings",
        "/f2/constructor-standings",
        "/privacy-policy",
      ],
    }),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "maskable_icon_192x192.png",
        "maskable_icon_512x512.png",
        "splash_512.png",
        "splash_192.png",
        "launcher_512.png",
        "launcher_192.png",
      ],
      manifestFilename: "manifest.json",
      manifest: {
        id: "/",
        name: "F1 TELEMETRY",
        short_name: "F1 TELEMETRY",
        version: "2.0.0",
        description: "In-depth Formula One Telemetry and Analysis",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "any",
        icons: [
          {
            src: "splash_192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "launcher_192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "splash_512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "launcher_512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        inlineWorkboxRuntime: true,
        navigateFallbackDenylist: [
          /^\/openf1/,
          /^https:\/\/(www|region1)\.google-analytics\.com/,
          /^https:\/\/www\.googletagmanager\.com/,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(www|region1)\.google-analytics\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/www\.googletagmanager\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico|glb|bin)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        suppressWarnings: true,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 3000,
    rolldownOptions: {
      checks: {
        eval: false,
        pluginTimings: false,
      },
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
    proxy: {
      "/openf1": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["flowbite-react"],
  },
});
