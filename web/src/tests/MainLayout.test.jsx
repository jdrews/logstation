import { beforeEach, describe, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MainLayout from "../MainLayout";
import { mockViewportForTestGroup } from "jsdom-testing-mocks";

describe("MainLayout", () => {
  mockViewportForTestGroup({ width: "1024px", height: "768px" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should render the MainLayout component with a blank array of logs", () =>
    async () => {
      const logFiles = new Map([]);
      render(
        <div style={{ width: "1000px", height: "700px" }}>
          <MainLayout logFiles={logFiles} />
        </div>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("log selector bar")).toBeInTheDocument();
        expect(screen.getByText("logstation")).toBeInTheDocument();
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });
    });

  test("should render Tabs for each given log file", () => async () => {
    const logFiles = new Map([
      ["file1.log", ["log line 1", "log line 2"]],
      ["file2.log", ["log line 3", "log line 4"]],
      ["file3.log", ["log line 5", "log line 6"]],
    ]);

    render(
      <div style={{ width: "1000px", height: "700px" }}>
        <MainLayout logFiles={logFiles} />
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText("logstation")).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(4); // 3 log files + 1 disabled "logstation" tab
      expect(screen.getByText("file1.log")).toBeInTheDocument();
      expect(screen.getByText("file2.log")).toBeInTheDocument();
      expect(screen.getByText("file3.log")).toBeInTheDocument();
    });
  });

  test("should render the content of each log file", () => async () => {
    const logFiles = new Map([["file1.log", ["log line 1", "log line 2"]]]);

    render(
      <div style={{ width: "1000px", height: "700px" }}>
        <MainLayout logFiles={logFiles} />
      </div>,
    );

    // Wait for the initial render to complete
    await waitFor(() => {
      expect(screen.getByText("file1.log")).toBeInTheDocument();
    });

    // Click on the tab to show the content
    fireEvent.click(screen.getByText("file1.log"));

    // Wait for and check the content
    await waitFor(() => {
      expect(screen.getByText("log line 1")).toBeInTheDocument();
      expect(screen.getByText("log line 2")).toBeInTheDocument();
    });
  });
});
