import { expect, test } from "@playwright/test";
import { E2E_LOGFILE, waitForAppReady } from "../support/helpers";

test("app shell loads with the e2e log file", async ({ page }) => {
  await waitForAppReady(page);

  // The tailed log file shows up in the sidebar
  await expect(
    page.locator(
      `[data-testid="sidebar-logfile"][data-logfile="${E2E_LOGFILE}"]`
    )
  ).toBeVisible();

  // The log viewer and search bar are present
  await expect(page.locator('[data-testid="log-viewer"]')).toBeVisible();
  await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
});
