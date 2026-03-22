import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(new URL(import.meta.url)));
const devcontainerEnvPath = path.join(projectRoot, ".devcontainer", ".env");
/** Devcontainer keeps secrets in `.devcontainer/.env`; Vite’s default `envDir` is only the repo root. */
const envDir = fs.existsSync(devcontainerEnvPath)
  ? path.join(projectRoot, ".devcontainer")
  : projectRoot;

export default defineConfig({
  envDir,
  test: {
    globals: true,
    environment: "node",
  },
  base: "/kinetic-campaigns/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
