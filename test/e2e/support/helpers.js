// Shared helpers for the e2e specs. The harness (scripts/test-e2e.sh) must
// export these before running Playwright; failing fast at load time turns a
// misconfigured run into an immediate, readable error instead of a 30-second
// timeout deep inside a spec.
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Run the suite via scripts/test-e2e.sh, which ` +
        `launches logstation and exports the e2e environment.`
    );
  }
  return value;
}

export const BASE_URL = requireEnv("E2E_BASE_URL");
export const E2E_LOGFILE = requireEnv("E2E_LOGFILE");
export const E2E_NAME = requireEnv("E2E_NAME");

// Load the app and wait until it is fully connected. document.title is only
// set after the websocket opens and /settings/logstation-name is fetched, so
// a matching title proves the backend, the websocket, and the UI are all up.
export async function waitForAppReady(page) {
  await page.goto(BASE_URL);
  await page.waitForFunction(
    (name) => document.title === name,
    E2E_NAME,
    { timeout: 30000 }
  );
}

// Read the log lines currently rendered in the (virtualized) viewer. Only
// visible rows exist in the DOM; the viewer is bottom-aligned and follows
// output, so the most recent lines are what you get.
export async function visibleLogLines(page) {
  const rows = page.locator('[data-testid="log-row"]');
  const count = await rows.count();
  const lines = [];
  for (let i = 0; i < count; i += 1) {
    lines.push((await rows.nth(i).innerText()).trim());
  }
  return lines;
}

// The largest line-sequence number among the given lines. loggenerator
// prefixes every line with an incrementing counter (`12: <lorem>`), so a
// growing maximum proves lines are flowing through as they are generated.
export function maxSequence(lines) {
  let max = -1;
  for (const line of lines) {
    const match = /^(\d+):/.exec(line);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max;
}
