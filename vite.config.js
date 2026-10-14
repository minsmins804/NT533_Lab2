import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy cho Identity (Đăng nhập)
      "/api-identity": {
        target: "https://cloud-identity.uitiot.vn",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-identity/, ""),
      },
      // Proxy cho Compute (Máy ảo, Flavor, Image)
      "/api-compute": {
        target: "https://cloud-compute.uitiot.vn",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-compute/, ""),
      },
      // Proxy cho Network (Mạng, Router, Subnet)
      "/api-network": {
        target: "https://cloud-network.uitiot.vn",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-network/, ""),
      },
      // Proxy cho Loadbalancer (LB, Pool, Listener)
      "/api-loadbalancer": {
        target: "https://cloud-loadbalancer.uitiot.vn",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-loadbalancer/, ""),
      },
    },
  },
});
