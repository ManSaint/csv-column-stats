import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // E2E and a11y specs belong to Playwright, not Vitest.
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
  },
});
