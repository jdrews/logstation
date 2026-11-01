import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "../App";

// Controllable mock of the websocket so tests can open the connection and
// deliver messages on demand. `vi.hoisted` keeps the instance list available
// inside the hoisted vi.mock factory.
const { mockRwsInstances } = vi.hoisted(() => ({ mockRwsInstances: [] }));

vi.mock("reconnecting-websocket", () => ({
  default: class MockReconnectingWebSocket {
    constructor(url) {
      this.url = url;
      mockRwsInstances.push(this);
    }

    // Simulate the connection opening
    open() {
      this.onopen?.();
    }

    // Simulate a server message
    receive(payload) {
      this.onmessage?.({ data: payload });
    }
  },
}));

vi.mock("react-virtuoso", async () => (await import("./virtuosoMock")).default);

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 20));

const json = (data) => ({ json: async () => data });

// Mock fetch as a queue of responses consumed in order. Pass { error } to
// simulate a rejected fetch.
const mockFetchSequence = (...responses) => {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response && response.error) {
      fetchMock.mockRejectedValueOnce(response.error);
    } else {
      fetchMock.mockResolvedValueOnce(response);
    }
  }
  global.fetch = fetchMock;
};

// The socket URL App should connect to, derived from the test environment's
// origin so the expectation tracks jsdom's location instead of hardcoding it.
const expectedSocketUrl = (secure) =>
  `${secure ? "wss" : "ws"}://${window.location.host}/ws`;

// Render App, flush the initial security-settings fetch, and open the socket.
const renderConnectedApp = async () => {
  render(<App />);
  await flushAsync();
  const socket = mockRwsInstances[mockRwsInstances.length - 1];
  act(() => {
    socket?.open();
  });
  await flushAsync();
  return { socket };
};

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
    mockRwsInstances.length = 0;
    document.title = "";
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
    expect(mockRwsInstances).toHaveLength(0);
  });

  test("logs an error when the logstation name fetch fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchSequence(
      json({ useSecureWebSocket: false }),
      // Second fetch (logstation-name) rejects
      { error: new Error("name fetch failed") },
    );

    render(<App />);
    await flushAsync();
    act(() => {
      mockRwsInstances[0].open();
    });
    await flushAsync();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load logstation name:",
      expect.any(Error),
    );
  });

  test("connects via ws:// and sets the document title from the server name", async () => {
    mockFetchSequence(
      json({ useSecureWebSocket: false }),
      json({ name: "My Logstation" }),
    );

    await renderConnectedApp();

    expect(mockRwsInstances[0].url).toBe(expectedSocketUrl(false));
    expect(document.title).toBe("My Logstation");
  });

  test("connects via wss:// when the server requires a secure websocket", async () => {
    mockFetchSequence(
      json({ useSecureWebSocket: true }),
      json({ name: "Secure Logstation" }),
    );

    await renderConnectedApp();

    expect(mockRwsInstances[0].url).toBe(expectedSocketUrl(true));
    expect(document.title).toBe("Secure Logstation");
  });

  test("appends incoming log lines to the right log files", async () => {
    mockFetchSequence(
      json({ useSecureWebSocket: false }),
      json({ name: "Logstation" }),
    );
    const { socket } = await renderConnectedApp();

    act(() => {
      socket.receive(JSON.stringify({ logfile: "app.log", text: "hello world" }));
    });
    await flushAsync();
    expect(screen.getByText("hello world")).toBeInTheDocument();

    // A second line to the same file is appended
    act(() => {
      socket.receive(JSON.stringify({ logfile: "app.log", text: "second line" }));
    });
    await flushAsync();
    expect(screen.getByText("second line")).toBeInTheDocument();
    expect(screen.getByText("hello world")).toBeInTheDocument();

    // A line for a new file appears in the sidebar file list
    act(() => {
      socket.receive(JSON.stringify({ logfile: "other.log", text: "other file line" }));
    });
    await flushAsync();
    expect(screen.getAllByTitle("other.log")).not.toHaveLength(0);
  });

  test("does not skip log lines when a burst of lines arrives in the same millisecond (issue #110)", async () => {
    mockFetchSequence(
      json({ useSecureWebSocket: false }),
      json({ name: "Logstation" }),
    );
    const { socket } = await renderConnectedApp();

    // Issue #110: lines written to the log file within the same millisecond
    // (e.g. a single multi-line write like Python's f.write("1\n2\n...\n10\n"))
    // reach the browser as a burst of websocket messages inside one React
    // update batch, and the viewer showed gaps in the sequence (1, 2, 4, 6,
    // 8, 10).
    //
    // The requirement this pins: no line of a same-millisecond burst may be
    // skipped. A handler that derives the next state from a stale snapshot of
    // the previous state (the render-closure value of logFiles) keeps only the
    // last line of the batch, because React applies only the last queued
    // non-functional update. The current handler uses a functional update,
    // which folds each message in order, so the whole burst survives.
    //
    // Reproduce the condition by delivering a burst of messages inside a
    // single act(): they all land in one React batch, before any re-render,
    // exactly like lines published within the same millisecond.
    const burstCount = 10;
    act(() => {
      for (let i = 1; i <= burstCount; i++) {
        socket.receive(JSON.stringify({ logfile: "app.log", text: `burst line ${i}` }));
      }
    });
    await flushAsync();

    // Every line of the burst must survive, in order.
    for (let i = 1; i <= burstCount; i++) {
      expect(screen.getByText(`burst line ${i}`)).toBeInTheDocument();
    }
  });

  test("clear buffer empties log lines but keeps the file list", async () => {
    mockFetchSequence(
      json({ useSecureWebSocket: false }),
      json({ name: "Logstation" }),
    );
    const { socket } = await renderConnectedApp();

    act(() => {
      socket.receive(JSON.stringify({ logfile: "app.log", text: "hello world" }));
    });
    await flushAsync();
    expect(screen.getByText("hello world")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Clear Buffer"));

    expect(screen.queryByText("hello world")).not.toBeInTheDocument();
    // The file stays in the sidebar, just empty
    expect(screen.getAllByTitle("app.log")).not.toHaveLength(0);
  });
});
