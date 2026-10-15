import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: "local",
  base: "./",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  plugins: [react(),...(process.env.SOOVERS_DEMO==='1'?[{name:'soovers-demo-entry',transformIndexHtml:{order:'pre' as const,handler(html:string){return html.replace('/main.tsx','/demo.tsx');}}}]:[])],
  build: { outDir: process.env.SOOVERS_DEMO==='1'?'../demo-dist':"../local-dist", emptyOutDir: true },
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8081" },
      "/healthz": { target: "http://127.0.0.1:8081" },
    },
  },
});
