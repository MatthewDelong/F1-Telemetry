import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 10000,
    rolldownOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === "EVAL" && warning.id?.includes("lottie-web")) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
  server: {
    port: 3006,
    open: true,
    proxy: {
      "/openf1": {
        target: "https://api.openf1.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openf1/, ""),
      },
    },
  },

  optimizeDeps: {
    rolldownOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
});
