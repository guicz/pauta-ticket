import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const required = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_APP_ID", "VITE_PATI_EMAIL"];
  if (command === "build" && mode === "production" && required.some(key => !env[key])) {
    throw new Error("Production requires Firebase configuration. Copy .env.example to .env.production before deploying.");
  }
  return {
  plugins: [react()],
  };
});
