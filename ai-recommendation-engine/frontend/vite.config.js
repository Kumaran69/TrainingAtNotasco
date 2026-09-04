import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Flask backend during local dev,
      // so the frontend can just call /api/... with no CORS worries.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
