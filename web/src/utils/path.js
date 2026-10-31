// Path helpers for the log file selector display names.

// Strip trailing path separators. Uses a loop instead of a quantified regex to
// avoid the backtracking-prone pattern flagged by S8786.
export const trimTrailingSeparators = (path) => {
  let end = path.length;
  while (end > 0 && (path[end - 1] === "/" || path[end - 1] === "\\")) {
    end -= 1;
  }
  return path.slice(0, end);
};

// Return the last path segment (the file name) of a path, ignoring any trailing
// separators. Returns "" if there is no file name.
export const basename = (path) => path.split(/[/\\]/).findLast(Boolean) || "";
