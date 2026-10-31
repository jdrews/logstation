import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import MainLayout from "../MainLayout";
import { mockScrollToIndex, renderInFrame, scrollArgs } from "./virtuosoMock";

vi.mock("react-virtuoso", async () => (await import("./virtuosoMock")).default);

// The file label text in the sidebar includes an invisible directional mark,
// and both the <button> and its inner <span> carry the title attribute, so
// resolve the clickable button via its title.
const getLogFileButton = (name) =>
  screen.getAllByTitle(name).find((el) => el.tagName === "BUTTON");

describe("MainLayout", () => {
  beforeEach(() => {
    mockScrollToIndex.mockClear();
  });

  test("renders the sidebar, search bar, and controls", () => {
    const logFiles = new Map([["app.log", ["log line 1"]]]);
    renderInFrame(<MainLayout logFiles={logFiles} />);

    expect(screen.getByText("LOGSTATION")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search logs (RegEx supported)..."),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Pause Tailing")).toBeInTheDocument();
    expect(screen.getByTitle("Clear Buffer")).toBeInTheDocument();
  });

  test("lists every log file and selects the first by default", () => {
    const logFiles = new Map([
      ["a.log", ["line a"]],
      ["b.log", ["line b"]],
    ]);
    renderInFrame(<MainLayout logFiles={logFiles} />);

    expect(getLogFileButton("a.log")).toBeInTheDocument();
    expect(getLogFileButton("b.log")).toBeInTheDocument();

    // First file is selected, second is not
    expect(getLogFileButton("a.log")).toHaveClass("bg-zinc-800");
    expect(getLogFileButton("b.log")).not.toHaveClass("bg-zinc-800");
  });

  test("shows the selected file's content and switches files on click", () => {
    const logFiles = new Map([
      ["a.log", ["line a"]],
      ["b.log", ["line b"]],
    ]);
    renderInFrame(<MainLayout logFiles={logFiles} />);

    expect(screen.getByText("line a")).toBeInTheDocument();
    expect(screen.queryByText("line b")).not.toBeInTheDocument();

    fireEvent.click(getLogFileButton("b.log"));

    expect(screen.getByText("line b")).toBeInTheDocument();
    expect(screen.queryByText("line a")).not.toBeInTheDocument();
    expect(getLogFileButton("b.log")).toHaveClass("bg-zinc-800");
  });

  test("resumes tailing when switching log files while paused", () => {
    const logFiles = new Map([
      ["a.log", ["line a"]],
      ["b.log", ["line b"]],
    ]);
    renderInFrame(<MainLayout logFiles={logFiles} />);

    fireEvent.click(screen.getByTitle("Pause Tailing"));
    expect(screen.getByTitle("Resume Tailing")).toBeInTheDocument();

    fireEvent.click(getLogFileButton("b.log"));
    expect(screen.getByTitle("Pause Tailing")).toBeInTheDocument();
  });

  test("auto-selects the first file when log files arrive after mount", () => {
    const { rerender } = renderInFrame(<MainLayout logFiles={new Map()} />);

    rerender(<MainLayout logFiles={new Map([["late.log", ["late line"]]])} />);

    expect(screen.getByText("late line")).toBeInTheDocument();
  });

  test("collapses the sidebar to icons and expands it again", () => {
    const logFiles = new Map([["/var/log/app.log", ["log line 1"]]]);
    const { container } = renderInFrame(<MainLayout logFiles={logFiles} />);

    const sidebar = container.querySelector("aside");
    expect(sidebar).toHaveClass("w-64");

    // Collapse: title, full label, and footer disappear; rotated basename appears
    fireEvent.click(screen.getByTitle("Collapse Sidebar"));
    expect(sidebar).toHaveClass("w-16");
    expect(screen.queryByText("LOGSTATION")).not.toBeInTheDocument();
    expect(screen.queryByText("github.com/jdrews/logstation")).not.toBeInTheDocument();
    expect(screen.getByText("app.log")).toBeInTheDocument();
    expect(getLogFileButton("/var/log/app.log")).toBeInTheDocument();

    // Expand: everything is back
    fireEvent.click(screen.getByTitle("Expand Sidebar"));
    expect(sidebar).toHaveClass("w-64");
    expect(screen.getByText("LOGSTATION")).toBeInTheDocument();
    expect(screen.getByText("github.com/jdrews/logstation")).toBeInTheDocument();
  });

  describe("search", () => {
    const logFiles = new Map([
      ["app.log", ["line one", "line two", "line three"]],
    ]);
    const renderLayout = () => renderInFrame(<MainLayout logFiles={logFiles} />);
    const searchInput = () =>
      screen.getByPlaceholderText("Search logs (RegEx supported)...");

    test("shows the match counter and navigation controls for a search term", () => {
      renderLayout();
      fireEvent.change(searchInput(), { target: { value: "line" } });

      expect(screen.getByText("1/3")).toBeInTheDocument();
      expect(screen.getByTitle("Clear Search")).toBeInTheDocument();
      expect(screen.getByTitle("Previous Match")).toBeInTheDocument();
      expect(screen.getByTitle("Next Match")).toBeInTheDocument();
    });

    test("navigates to the next match with the Next button", () => {
      renderLayout();
      fireEvent.change(searchInput(), { target: { value: "line" } });

      fireEvent.click(screen.getByTitle("Next Match"));
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(1));
      expect(screen.getByText("2/3")).toBeInTheDocument();
    });

    test("navigates to the previous match with the Previous button", () => {
      renderLayout();
      fireEvent.change(searchInput(), { target: { value: "line" } });
      fireEvent.click(screen.getByTitle("Next Match"));

      fireEvent.click(screen.getByTitle("Previous Match"));
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(0));
      expect(screen.getByText("1/3")).toBeInTheDocument();
    });

    test("Enter moves to the next match, Shift+Enter to the previous", () => {
      renderLayout();
      fireEvent.change(searchInput(), { target: { value: "line" } });

      fireEvent.keyDown(searchInput(), { key: "Enter" });
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(1));

      fireEvent.keyDown(searchInput(), { key: "Enter", shiftKey: true });
      expect(mockScrollToIndex).toHaveBeenLastCalledWith(scrollArgs(0));
    });

    test("ignores non-Enter key presses in the search field", () => {
      renderLayout();
      fireEvent.change(searchInput(), { target: { value: "line" } });
      mockScrollToIndex.mockClear();

      fireEvent.keyDown(searchInput(), { key: "a" });
      fireEvent.keyDown(searchInput(), { key: "Escape" });
      expect(mockScrollToIndex).not.toHaveBeenCalled();
    });

    test("clears the search with the Clear Search button", () => {
      renderLayout();
      fireEvent.change(searchInput(), { target: { value: "line" } });
      expect(screen.getByText("1/3")).toBeInTheDocument();

      fireEvent.click(screen.getByTitle("Clear Search"));

      expect(searchInput()).toHaveValue("");
      expect(screen.queryByText("1/3")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Next Match")).not.toBeInTheDocument();
    });
  });

  describe("controls", () => {
    const logFiles = new Map([["app.log", ["log line 1"]]]);
    const renderLayout = (extraProps = {}) =>
      renderInFrame(<MainLayout logFiles={logFiles} {...extraProps} />);

    test("toggles between pause and resume", () => {
      renderLayout();

      fireEvent.click(screen.getByTitle("Pause Tailing"));
      expect(screen.getByTitle("Resume Tailing")).toBeInTheDocument();
      expect(screen.getByText("Resume")).toBeInTheDocument();

      fireEvent.click(screen.getByTitle("Resume Tailing"));
      expect(screen.getByTitle("Pause Tailing")).toBeInTheDocument();
      expect(screen.getByText("Pause")).toBeInTheDocument();
    });

    test("calls onClearLogs when the Clear Buffer button is clicked", () => {
      const onClearLogs = vi.fn();
      renderLayout({ onClearLogs });

      fireEvent.click(screen.getByTitle("Clear Buffer"));
      expect(onClearLogs).toHaveBeenCalledTimes(1);
    });

    test("does not throw when onClearLogs is not provided", () => {
      renderLayout();
      expect(() => fireEvent.click(screen.getByTitle("Clear Buffer"))).not.toThrow();
    });
  });
});
