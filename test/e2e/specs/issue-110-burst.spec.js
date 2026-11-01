import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { E2E_LOGFILE, waitForAppReady } from "../support/helpers";

// Regression test for https://github.com/jdrews/logstation/issues/110:
// "Lines are getting skipped when reading multiple lines within the same
// millisecond."
//
// The original report wrote a multi-line string to the tailed file in a
// single write call (Python's f.write("1\n2\n...\n10\n")) and the viewer
// showed gaps in the sequence (1, 2, 4, 6, 8, 10). This spec reproduces that
// exact condition: one synchronous append of the whole burst is a single
// write(2) syscall, so every line of the burst lands in the file within the
// same millisecond. The tailer then reads them all at once and the browser
// receives them as a burst of websocket messages.
//
// The test asserts that NO line of the burst is skipped: every burst line
// must be present in the app's log state. Verification goes through the
// app's search (data-testid="match-counter"), which counts matches over ALL
// lines in state, not just the virtualized viewer's visible window — a DOM
// check would be unreliable because the virtualized list can transiently
// render only a subset of a freshly appended batch.
test("a burst of lines written within the same millisecond is not skipped (issue #110)", async ({ page }) => {
  await waitForAppReady(page);

  // Let the pipeline drain any startup traffic so the burst is the only
  // "BURST-110-" content that will ever appear.
  await page.waitForTimeout(1000);

  const burstCount = 15;
  const burstLines = Array.from({ length: burstCount }, (_, i) => `BURST-110-${i + 1}`);

  // Single synchronous append = single write(2) syscall = the whole burst
  // within the same millisecond, mirroring the issue's reproduction script.
  fs.appendFileSync(E2E_LOGFILE, burstLines.join("\n") + "\n");

  // Search for the burst prefix. The counter shows "current/total" over the
  // full log state, so "…/15" proves all 15 burst lines made it through the
  // entire pipeline (file -> tailer -> pubsub -> websocket -> react state)
  // with none skipped.
  const searchInput = page.getByTestId("search-input");
  await searchInput.fill("BURST-110-");

  const matchCounter = page.getByTestId("match-counter");
  await expect
    .poll(async () => (await matchCounter.textContent())?.trim(), {
      timeout: 15000,
    })
    .toMatch(new RegExp(`/\\b${burstCount}$`));

  // Leave the UI in a clean state for the other specs.
  await searchInput.fill("");
});
