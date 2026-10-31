import { screen } from "@testing-library/react";
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

    await import("../index");

    expect(await screen.findByText("LOGSTATION")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load websocket security settings:",
      expect.any(Error),
    );
  });
});
