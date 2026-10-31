import { expect, test } from "@playwright/test";
import { visibleLogLines, waitForAppReady } from "../support/helpers";

test("search finds generated lines and reports a match count", async ({
  page,
}) => {
  await waitForAppReady(page);

  // Wait until at least a couple of lines are in the buffer
  await expect
    .poll(async () => (await visibleLogLines(page)).length, { timeout: 20000 })
    .toBeGreaterThanOrEqual(2);

  // Every generated line contains a ": " after its counter
  await page.locator('[data-testid="search-input"]').fill(": ");

  const counter = page.locator('[data-testid="match-counter"]');
  // [1-9] in the total rules out the "0/0" placeholder, which the counter
  // shows until the match count is computed.
  await expect(counter).toHaveText(/\d+\/[1-9]\d*/);
  const [current, total] = (await counter.textContent()).split("/");
  expect(Number(current)).toBe(1);
  expect(Number(total)).toBeGreaterThanOrEqual(2);

  // The matched lines are actually highlighted in the viewer
  await expect(
    page.locator('[data-testid="log-row"] mark').first()
  ).toBeVisible();
});
