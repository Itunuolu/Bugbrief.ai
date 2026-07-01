import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

function copyManifest(): Plugin {
  return {
    name: "copy-extension-manifest",
    writeBundle() {
      const output = resolve(__dirname, "dist", "manifest.json");
      mkdirSync(dirname(output), { recursive: true });
      copyFileSync(resolve(__dirname, "manifest.json"), output);
    }
  };
}

export default defineConfig({
  plugins: [react(), copyManifest()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
        popup: resolve(__dirname, "popup.html"),
        serviceWorker: resolve(__dirname, "src/background/serviceWorker.ts")
      },
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "serviceWorker"
            ? "background/serviceWorker.js"
            : "assets/[name]-[hash].js"
      }
    }
  }
});
