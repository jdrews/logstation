import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// We aren't actually using css modules in our tests
//    Following the patterns that patternfly/react-log-viewer uses
//    https://github.com/patternfly/react-log-viewer/blob/v6.1.0/styleMock.js
vi.mock("*.css", () => ({}));
