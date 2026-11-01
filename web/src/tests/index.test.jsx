import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

// The entry point fetches the websocket security settings on mount; reject
// the fetch so the test never touches the network (the app logs the failure
// and stays mounted).
vi.mock("reconnecting-websocket", () => ({
  default: class MockReconnectingWebSocket {
    constructor() {}
  },
}));

vi.mock("react-virtuoso", async () => (await import("./virtuosoMock")).default);

describe("index (entry point)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
  });

  test("mounts the app into #root", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("no network in tests"));
    document.body.innerHTML = '<div id="root"></div>';

    // Mount inside an async act() so the initial render, StrictMode's
    // effect double-invoke, and the rejected-fetch catch handler all flush
    // inside act. A plain `await import("../index")` races the assertion
    // on slow runners: the catch (a microtask) may not have run yet, and
    // the un-act'd effect re-run surfaces as an act() warning in
    // console.error (see PR #385 CI failure).
    await act(async () => {
      await import("../index");
    });

    expect(await screen.findByText("LOGSTATION")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load websocket security settings:",
      expect.any(Error),
    );
  });
});
