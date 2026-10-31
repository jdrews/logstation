import { expect, test } from "@playwright/test";
import { maxSequence, visibleLogLines, waitForAppReady } from "../support/helpers";

// The core e2e: verify log lines come through to the browser as they are
// generated. loggenerator appends a line (with an incrementing counter) to
// the tailed file every 250 ms; this test asserts the viewer receives lines
// with strictly increasing sequence numbers over time.
test("log lines appear in the viewer as they are generated", async ({ page }) => {
  await waitForAppReady(page);

  // Wait for the first generated lines to make it through the full pipeline:
  // file -> tailer -> pubsub -> websocket -> react -> dom
  await expect
    .poll(async () => maxSequence(await visibleLogLines(page)), {
      timeout: 20000,
    })
    .toBeGreaterThanOrEqual(0);

  const firstMax = await maxSequence(await visibleLogLines(page));

  // The generator keeps writing; the viewer must keep receiving lines with
  // higher sequence numbers.
  await expect
    .poll(
      async () => (await maxSequence(await visibleLogLines(page))) - firstMax,
      { timeout: 30000 }
    )
    .toBeGreaterThan(0);
});
