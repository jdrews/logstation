import { describe, test, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import App from "../App";

// Mock the websocket so we can deterministically fire its onopen handler.
// App assigns rws.onopen synchronously right after construction, so the call is
// deferred to the next tick (by which point the handler is in place).
vi.mock("reconnecting-websocket", () => ({
  default: class MockWebSocket {
    constructor() {
      setTimeout(() => this.onopen && this.onopen(), 0);
    }
  },
}));

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
  });

  test("logs an error when the websocket security settings fetch fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    render(<App />);
    await flushAsync();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load websocket security settings:",
      expect.any(Error),
    );
  });

  test("logs an error when the logstation name fetch fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // First fetch (websocket-security) resolves so the socket connects and
    // onopen fires; the second fetch (logstation-name) is made to reject.
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ useSecureWebSocket: false }) })
      .mockRejectedValueOnce(new Error("name fetch failed"));

    render(<App />);
    await flushAsync();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load logstation name:",
      expect.any(Error),
    );
  });
});
