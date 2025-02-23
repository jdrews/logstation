import { beforeEach, describe, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LogStationLogViewer from "../LogStationLogViewer";
import { act } from "react";
import { mockViewportForTestGroup } from "jsdom-testing-mocks";

describe("LogStationLogViewer", () => {
  const mockData = ["Log line 1", "Log line 2", "Log line 3"];
  mockViewportForTestGroup({ width: "1024px", height: "768px" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLogViewer = (data, logFileName) => {
    return render(
      <div style={{ width: "1000px", height: "700px" }}>
        <LogStationLogViewer data={data} logFileName={logFileName} />
      </div>,
    );
  };

  test("renders log viewer with provided data", () => async () => {
    // Wait for the component to render entirely before asserting
    await act(async () => {
      renderLogViewer(mockData, "test.log");
    });

    mockData.forEach((line) => {
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });

  test("shows resume button when scrolled up", () => async () => {
    await act(async () => {
      renderLogViewer(mockData, "test.log");
    });

    // Simulate scroll up to trigger pause
    act(() => {
      const logViewer = screen.getByRole("log");
      fireEvent.scroll(logViewer, {
        target: {
          scrollHeight: 1000,
          scrollTop: 0,
          clientHeight: 100,
        },
      });
    });

    expect(screen.getByText("resume")).toBeInTheDocument();
  });

  test("hides resume button when at bottom", () => async () => {
    await act(async () => {
      renderLogViewer(mockData, "test.log");
    });

    // Simulate scroll up to trigger pause
    act(() => {
      const logViewer = screen.getByRole("log");
      fireEvent.scroll(logViewer, {
        target: {
          scrollHeight: 1000,
          scrollTop: 0,
          clientHeight: 100,
        },
      });
    });

    // Simulate scroll to bottom
    act(() => {
      const logViewer = screen.getByRole("log");
      fireEvent.scroll(logViewer, {
        target: {
          scrollHeight: 1000,
          scrollTop: 100,
          clientHeight: 100,
        },
      });
    });

    expect(screen.queryByText("resume")).not.toBeInTheDocument();
  });

  test("resets pause state when log file changes", () => async () => {
    await act(async () => {
      renderLogViewer(mockData, "test.log");
    });

    // Simulate scroll up to trigger pause
    act(() => {
      const logViewer = screen.getByRole("log");
      fireEvent.scroll(logViewer, {
        target: {
          scrollHeight: 1000,
          scrollTop: 0,
          clientHeight: 100,
        },
      });
    });

    expect(screen.getByText("resume")).toBeInTheDocument();

    // Change log file
    await act(async () => {
      renderLogViewer(mockData, "test2.log");
    });

    expect(screen.queryByText("resume")).not.toBeInTheDocument();
  });
});
