import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) {
        return path.resolve(__dirname, "src/assets", id.replace("figma:asset/", ""));
      }
      return undefined;
    },
  };
}

export default defineConfig({
  base: "/",
  server: { host: "localhost", port: 5173, open: "/" },
  plugins: [figmaAssetResolver(), react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
