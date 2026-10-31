import { act, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import LogStationLogViewer from "../LogStationLogViewer";
import {
  mockAtBottomStateChange,
  mockScrollToIndex,
  renderInFrame,
  scrollArgs,
} from "./virtuosoMock";

vi.mock("react-virtuoso", async () => (await import("./virtuosoMock")).default);

const DEFAULT_DATA = ["line one", "line two", "line three"];

const renderViewer = (overrides = {}) => {
  const viewerProps = {
    data: DEFAULT_DATA,
    searchTerm: "",
    isPaused: false,
    setIsPaused: vi.fn(),
    onMatchCountChange: vi.fn(),
    onCurrentMatchChange: vi.fn(),
    ...overrides,
  };
  const element = (elementOverrides = {}) => (
    <LogStationLogViewer {...viewerProps} {...elementOverrides} />
  );
  const utils = renderInFrame(element());
  return { ...utils, element };
};

// Dispatch the custom events LogStationLogViewer listens for on window.
const dispatchSearch = (name) => {
  act(() => {
    window.dispatchEvent(new Event(name));
  });
};

describe("LogStationLogViewer", () => {
  beforeEach(() => {
    mockScrollToIndex.mockClear();
    mockAtBottomStateChange.current = null;
  });

  test("renders every provided log line", () => {
    renderViewer();
    DEFAULT_DATA.forEach((line) => {
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });

  test("renders no rows for empty data", () => {
    const { container } = renderViewer({ data: [] });
    expect(container.querySelectorAll("[data-row]")).toHaveLength(0);
  });

  test("shows newly appended log lines", () => {
    const { element, rerender } = renderViewer({ data: ["first line"] });
    expect(screen.getByText("first line")).toBeInTheDocument();

    rerender(element({ data: ["first line", "second line"] }));
    expect(screen.getByText("second line")).toBeInTheDocument();
  });

  describe("searching", () => {
    test("highlights literal matches and reports the match count", () => {
      const onMatchCountChange = vi.fn();
      const { container } = renderViewer({ searchTerm: "two", onMatchCountChange });

      const marks = container.querySelectorAll("mark");
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveTextContent("two");
      expect(onMatchCountChange).toHaveBeenCalledWith(1);
      expect(onMatchCountChange).not.toHaveBeenCalledWith(2);
    });

    test("treats regex metacharacters as plain text in a literal search", () => {
      const { container } = renderViewer({
        data: ["a.b", "axb"],
        searchTerm: "a.b",
      });
      const marks = container.querySelectorAll("mark");
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveTextContent("a.b");
    });

    test("supports /regex/ search syntax", () => {
      const onMatchCountChange = vi.fn();
      const { container } = renderViewer({ searchTerm: "/two|three/", onMatchCountChange });

      const marks = container.querySelectorAll("mark");
      expect(marks).toHaveLength(2);
      expect(marks[0]).toHaveTextContent("two");
      expect(marks[1]).toHaveTextContent("three");
      expect(onMatchCountChange).toHaveBeenCalledWith(2);
    });

    test("falls back to a literal search when the /regex/ is unsafe", () => {
      // "(a+)+$" is vulnerable to ReDoS, so safe-regex2 rejects it and the
      // full input is searched as a literal string (which matches nothing).
      const { container } = renderViewer({ searchTerm: "/(a+)+$/" });
      expect(container.querySelectorAll("mark")).toHaveLength(0);
    });

    test("falls back to a literal search when the /regex/ is invalid", () => {
      const { container } = renderViewer({ searchTerm: "/[unclosed/" });
      expect(container.querySelectorAll("mark")).toHaveLength(0);
    });

    test("reports zero matches and no highlights when nothing matches", () => {
      const onMatchCountChange = vi.fn();
      const { container } = renderViewer({ searchTerm: "zzz", onMatchCountChange });
      expect(container.querySelectorAll("mark")).toHaveLength(0);
      expect(onMatchCountChange).toHaveBeenCalledWith(0);
    });

    test("removes highlights when the search term is cleared", () => {
      const { element, container, rerender } = renderViewer({ searchTerm: "line" });
      expect(container.querySelectorAll("mark")).toHaveLength(3);

      rerender(element({ searchTerm: "" }));
      expect(container.querySelectorAll("mark")).toHaveLength(0);
    });
  });

  describe("match navigation", () => {
    test("search-next advances to the next match and wraps around", () => {
      renderViewer({ searchTerm: "line" });

      dispatchSearch("search-next");
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(1));

      dispatchSearch("search-next");
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(2));

      // Wraps back to the first match
      dispatchSearch("search-next");
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(0));
    });

    test("search-prev goes back to the previous match and wraps around", () => {
      renderViewer({ searchTerm: "line" });

      dispatchSearch("search-prev");
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(2));
    });

    test("does not scroll when there are no matches", () => {
      renderViewer({ searchTerm: "zzz" });
      // Ignore the initial scroll-to-bottom on mount
      mockScrollToIndex.mockClear();

      dispatchSearch("search-next");
      dispatchSearch("search-prev");
      expect(mockScrollToIndex).not.toHaveBeenCalled();
    });

    test("highlights the row of the active match", () => {
      const { container } = renderViewer({ searchTerm: "line" });
      const activeRow = () =>
        container.querySelector(".bg-blue-900\\/40")?.closest("[data-row]");

      // The first match is active initially
      expect(activeRow()?.getAttribute("data-row")).toBe("0");

      dispatchSearch("search-next");
      expect(activeRow()?.getAttribute("data-row")).toBe("1");
    });

    test("reports the current match index to the parent", () => {
      const onCurrentMatchChange = vi.fn();
      renderViewer({ searchTerm: "line", onCurrentMatchChange });

      expect(onCurrentMatchChange).toHaveBeenCalledWith(0);
      dispatchSearch("search-next");
      expect(onCurrentMatchChange).toHaveBeenCalledWith(1);
    });
  });

  describe("ANSI rendering", () => {
    test("renders basic foreground colors", () => {
      renderViewer({ data: ["\x1b[31mred text\x1b[0m"] });
      // anser converts named colors to "r, g, b", which the component wraps in rgb()
      expect(screen.getByText("red text")).toHaveStyle({ color: "rgb(187, 0, 0)" });
    });

    test("renders 256-color foreground and background colors", () => {
      // Anser splits this into two chunks: "orange" (fg only) and
      // " on blue" (fg + bg)
      renderViewer({ data: ["\x1b[38;5;9morange\x1b[44m on blue\x1b[0m"] });
      expect(screen.getByText("orange")).toHaveStyle({ color: "rgb(255, 85, 85)" });
      // The node text is normalized (trimmed) before matching
      expect(screen.getByText("on blue")).toHaveStyle({
        color: "rgb(255, 85, 85)",
        backgroundColor: "rgb(0, 0, 187)",
      });
    });

    test("applies bold, dim, italic, and underline decorations", () => {
      renderViewer({
        data: [
          "\x1b[1mbold text\x1b[0m",
          "\x1b[2mdim text\x1b[0m",
          "\x1b[3mitalic text\x1b[0m",
          "\x1b[4munderlined text\x1b[0m",
        ],
      });
      expect(screen.getByText("bold text")).toHaveStyle({ fontWeight: "bold" });
      expect(screen.getByText("dim text")).toHaveStyle({ opacity: "0.7" });
      expect(screen.getByText("italic text")).toHaveStyle({ fontStyle: "italic" });
      expect(screen.getByText("underlined text")).toHaveStyle({ textDecoration: "underline" });
    });

    test("renders plain text without styles", () => {
      renderViewer({ data: ["plain text"] });
      const span = screen.getByText("plain text");
      expect(span.getAttribute("style")).toBeNull();
      expect(span.className).toBe("");
    });
  });

  describe("tailing pause/resume", () => {
    test("pauses when the user scrolls away from the bottom", () => {
      const setIsPaused = vi.fn();
      renderViewer({ setIsPaused });

      act(() => {
        mockAtBottomStateChange.current(false);
      });
      expect(setIsPaused).toHaveBeenLastCalledWith(true);
    });

    test("resumes when the user scrolls back to the bottom", () => {
      const setIsPaused = vi.fn();
      renderViewer({ setIsPaused });

      act(() => {
        mockAtBottomStateChange.current(true);
      });
      expect(setIsPaused).toHaveBeenLastCalledWith(false);
    });

    test("follows output when not paused", () => {
      const { container } = renderViewer({ isPaused: false });
      expect(container.querySelector('[role="log"]')).toHaveAttribute(
        "data-follow-output",
        "auto",
      );
    });

    test("stops following output while paused", () => {
      const { container } = renderViewer({ isPaused: true });
      expect(container.querySelector('[role="log"]')).toHaveAttribute(
        "data-follow-output",
        "false",
      );
    });
  });
});
