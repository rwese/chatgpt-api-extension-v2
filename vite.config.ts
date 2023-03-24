import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import webExtension from "@samrum/vite-plugin-web-extension";
import path from "path";
import { getManifest } from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      vue(),
      webExtension({
        manifest: getManifest(Number(env.MANIFEST_VERSION), Boolean(env.IS_DEVELOPMENT)),
      }),
    ],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // sourcemap: true,
      watch: {
        clearScreen: false,
        include: ["src/**", ".env"],
      },
    },
  };
});
