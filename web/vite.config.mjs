import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./src/tests/setupTests.js"],
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
    },
  },
});
