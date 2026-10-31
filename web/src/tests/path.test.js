import { describe, test, expect } from "vitest";
import { trimTrailingSeparators, basename } from "../utils/path";

describe("trimTrailingSeparators", () => {
  // [input, expected]
  const cases = [
    ["/var/log/app.log", "/var/log/app.log"], // no trailing separator
    ["/var/log/app.log/", "/var/log/app.log"], // single trailing slash
    ["C:\\logs\\app.log\\", "C:\\logs\\app.log"], // trailing backslash
    ["/var/log/app.log///", "/var/log/app.log"], // multiple trailing separators
    ["///", ""], // only separators
    ["", ""], // empty
  ];

  test.each(cases)("trimTrailingSeparators(%j) === %j", (input, expected) => {
    expect(trimTrailingSeparators(input)).toBe(expected);
  });
});

describe("basename", () => {
  // [input, expected]
  const cases = [
    ["/var/log/app.log", "app.log"], // unix path
    ["C:\\logs\\app.log", "app.log"], // windows path
    ["/var/log/app.log/", "app.log"], // trailing separator
    ["app.log", "app.log"], // bare file name
    ["///", ""], // only separators
  ];

  test.each(cases)("basename(%j) === %j", (input, expected) => {
    expect(basename(input)).toBe(expected);
  });
});
