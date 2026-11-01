import { expect, test } from "@playwright/test";
import { waitForAppReady } from "../support/helpers";

// Regression test for the fatih/color TTY-detection change (v1.16): when
// stdout is not a terminal, the library disables ANSI output, which silently
// stripped every color from the lines shipped to browser clients after the
// dependency bump. This test verifies the end-to-end payload: the app's own
// websocket must carry frames whose text contains ANSI escape sequences.
//
// The e2e config (scripts/test-e2e.sh) colors lines matching .*INFO.*
// (higreen) and .*ERROR.* (hired); loggenerator's default severity pool is
// {INFO, DEBUG, TRACE}, so a colored frame is expected within a few lines.
test("websocket payloads carry ANSI color escapes", async ({ page }) => {
  const frames = [];
  page.on("websocket", (webSocket) => {
    webSocket.on("framereceived", (frame) => {
      // Playwright delivers frames as { payload: string | Buffer }
      frames.push(frame.payload.toString());
    });
  });

  await waitForAppReady(page);

  // loggenerator writes a line every 250 ms, so a colored frame should
  // arrive well within the timeout if colorization is working.
  await expect
    .poll(
      async () =>
        frames.some((raw) => {
          try {
            const parsed = JSON.parse(raw);
            return (
              typeof parsed.text === "string" && parsed.text.includes("\x1b[")
            );
          } catch {
            return false;
          }
        }),
      { timeout: 15000 }
    )
    .toBe(true);
});
