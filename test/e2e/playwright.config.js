const { defineConfig } = require("@playwright/test");

// The harness (scripts/test-e2e.sh) launches logstation + loggenerator and
// exports E2E_BASE_URL (and E2E_LOGFILE) before invoking Playwright, so the
// suite always runs against a fresh, isolated instance.
module.exports = defineConfig({
  testDir: "./specs",
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  outputDir: "test-results",
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
});
