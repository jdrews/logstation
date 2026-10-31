// Shared mock of react-virtuoso for testing.
//
// The real Virtuoso measures the DOM to lay out its virtualized list, which
// jsdom cannot do reliably. This mock renders every item synchronously and
// exposes the imperative handle (scrollToIndex) that LogStationLogViewer
// calls, plus the atBottomStateChange handler so tests can simulate the
// user scrolling away from, and back to, the bottom of the list.

import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";

// Spied scrollToIndex. Vitest isolates the module registry per test file, so
// each test file gets its own spy instance.
export const mockScrollToIndex = vi.fn();

// Latest atBottomStateChange handler the component under test registered, so
// tests can simulate scrolling to / away from the bottom directly instead of
// clicking proxy elements in the DOM.
export const mockAtBottomStateChange = { current: null };

// The argument shape LogStationLogViewer passes to Virtuoso's scrollToIndex
// when navigating to a match.
export const scrollArgs = (index) => ({ index, align: "center", behavior: "auto" });

// Render a component inside a sized frame; the log viewer wants a container
// with explicit dimensions.
export const renderInFrame = (element) =>
  render(<div style={{ width: "1000px", height: "700px" }}>{element}</div>);

const Virtuoso = (props) => {
  const { ref, totalCount = 0, itemContent, followOutput, atBottomStateChange } = props;

  // React 19 passes `ref` to function components as a regular prop. Expose
  // the imperative handle the log viewer uses.
  if (ref) {
    ref.current = { scrollToIndex: mockScrollToIndex };
  }

  mockAtBottomStateChange.current = atBottomStateChange;

  return (
    <div role="log" data-follow-output={String(followOutput)}>
      {Array.from({ length: totalCount }, (_, i) => (
        <div key={i} data-row={i}>
          {itemContent(i)}
        </div>
      ))}
    </div>
  );
};

export default { Virtuoso };
