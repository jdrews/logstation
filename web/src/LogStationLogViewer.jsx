import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import Anser from "anser";
import { clsx } from "clsx";
import safeRegex from "safe-regex2";

// Helper to escape regex special characters if searchTerm is text
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a safe RegExp from user input. If the user provides /pattern/ syntax,
// validate it with safe-regex2 first; unsafe patterns fall back to literal search.
function buildSafeRegExp(patternOrSearch, flags) {
  // Check if this is regex syntax /.../
  const isRegexSyntax = typeof patternOrSearch === "string" &&
    patternOrSearch.startsWith("/") && patternOrSearch.endsWith("/") && patternOrSearch.length > 2;

  let source;
  if (isRegexSyntax) {
    const rawPattern = patternOrSearch.slice(1, -1);
    try {
      // Validate the pattern is not vulnerable to ReDoS before using it
      if (safeRegex(rawPattern)) {
        source = rawPattern;
      } else {
        // Unsafe regex — fall back to escaped literal search on the full input
        return new RegExp(escapeRegExp(patternOrSearch), flags);
      }
    } catch {
      // Invalid regex syntax — fall back to escaped literal
      return new RegExp(escapeRegExp(patternOrSearch), flags);
    }
  } else {
    source = escapeRegExp(patternOrSearch);
  }

  return new RegExp(source, flags);
}

// Variant that wraps the pattern in a capture group for highlighting via split()
function buildSafeRegExpGrouped(patternOrSearch, flags) {
  const isRegexSyntax = typeof patternOrSearch === "string" &&
    patternOrSearch.startsWith("/") && patternOrSearch.endsWith("/") && patternOrSearch.length > 2;

  let source;
  if (isRegexSyntax) {
    const rawPattern = patternOrSearch.slice(1, -1);
    try {
      if (safeRegex(rawPattern)) {
        source = `(${rawPattern})`;
      } else {
        return new RegExp(`(${escapeRegExp(patternOrSearch)})`, flags);
      }
    } catch {
      return new RegExp(`(${escapeRegExp(patternOrSearch)})`, flags);
    }
  } else {
    source = `(${escapeRegExp(patternOrSearch)})`;
  }

  return new RegExp(source, flags);
}

const LogStationLogViewer = ({
  data,
  searchTerm,
  isPaused,
  setIsPaused,
  onMatchCountChange,
  onCurrentMatchChange
}) => {
  const virtuosoRef = useRef(null);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Calculate Matches
  // Returns an array of line indices that contain the search term
  const matches = useMemo(() => {
    if (!searchTerm || !data) return [];

    const regex = buildSafeRegExp(searchTerm, "i");

    const matchedIndices = [];
    data.forEach((line, index) => {
      // Stripping ANSI for search
      const plainText = Anser.ansiToText(line);
      if (regex.test(plainText)) {
        matchedIndices.push(index);
      }
    });
    return matchedIndices;
  }, [data, searchTerm]);

  // Update parent about match counts
  useEffect(() => {
    onMatchCountChange?.(matches.length);
    if (matches.length > 0) {
      // Reset or clamp current match index
      setCurrentMatchIdx(prev => {
        if (prev >= matches.length) return 0;
        return prev;
      });
    } else {
      setCurrentMatchIdx(0);
    }
  }, [matches.length, onMatchCountChange]);

  // Update parent about current match index
  useEffect(() => {
    onCurrentMatchChange?.(currentMatchIdx);
  }, [currentMatchIdx, onCurrentMatchChange]);

  // Search Navigation Handlers
  const scrollToMatch = useCallback((index) => {
    if (matches.length === 0) return;
    const lineIdx = matches[index];
    virtuosoRef.current?.scrollToIndex({ index: lineIdx, align: "center", behavior: "auto" });
  }, [matches]);

  useEffect(() => {
    const handleNext = () => {
      setCurrentMatchIdx(prev => {
        const next = (prev + 1) % matches.length;
        scrollToMatch(next);
        return next;
      });
    };

    const handlePrev = () => {
      setCurrentMatchIdx(prev => {
        const next = (prev - 1 + matches.length) % matches.length;
        scrollToMatch(next);
        return next;
      });
    };

    window.addEventListener("search-next", handleNext);
    window.addEventListener("search-prev", handlePrev);
    return () => {
      window.removeEventListener("search-next", handleNext);
      window.removeEventListener("search-prev", handlePrev);
    };
  }, [matches, scrollToMatch]);

  // Row Renderer with ANSI and Highlighting
  const rowRenderer = useCallback((index) => {
    const line = data[index];
    const isMatchedLine = matches.includes(index);
    const isActiveMatch = matches[currentMatchIdx] === index;

    const json = Anser.ansiToJson(line, { use_classes: false });

    // Prepare safe regex for rendering highlights
    const regex = buildSafeRegExpGrouped(searchTerm, "gi");

    return (
      <div className={clsx(
        "font-mono text-sm leading-6 whitespace-pre-wrap break-all px-4 py-0.5 hover:bg-zinc-800/50",
        isActiveMatch && "bg-blue-900/40 ring-1 ring-inset ring-blue-500/50" // Highlight full line for active match
      )}>
        {json.map((chunk, chunkIdx) => {
          const style = {};
          // Anser returns "r, g, b" for palette colors
          if (chunk.fg) style.color = chunk.fg.includes(",") ? `rgb(${chunk.fg})` : chunk.fg;
          if (chunk.bg) style.backgroundColor = chunk.bg.includes(",") ? `rgb(${chunk.bg})` : chunk.bg;

          if (chunk.decoration === 'bold' || chunk.decorations?.includes('bold')) style.fontWeight = 'bold';
          if (chunk.decoration === 'dim' || chunk.decorations?.includes('dim')) style.opacity = 0.7;
          if (chunk.decoration === 'italic' || chunk.decorations?.includes('italic')) style.fontStyle = 'italic';
          if (chunk.decoration === 'underline' || chunk.decorations?.includes('underline')) style.textDecoration = 'underline';

          // Simple text rendering if no search
          if (!searchTerm) {
            return (
              <span key={chunkIdx} style={style} className={chunk.decoration}>
                {chunk.content}
              </span>
            );
          }

          // Highlighting logic
          const parts = chunk.content.split(regex);
          return (
            <span key={chunkIdx} style={style} className={chunk.decoration}>
              {parts.map((part, partIdx) => {
                if (part.toLowerCase() === '') return null;
                const isMatch = regex.test(part);
                regex.lastIndex = 0; // Reset regex

                if (isMatch) {
                  return (
                    <mark key={partIdx} className="bg-yellow-500/50 text-white rounded-sm px-0.5 mx-px">
                      {part}
                    </mark>
                  );
                }
                return part;
              })}
            </span>
          );
        })}
      </div>
    );
  }, [data, matches, currentMatchIdx, searchTerm]);

  // Auto-scrolling & Pause Logic
  const handleAtBottomStateChange = (atBottom) => {
    // If user scrolls up (atBottom becomes false), we pause.
    if (!atBottom) {
      setIsPaused(true);
    } else {
      // If user hits bottom manually, we resume tailing
      setIsPaused(false);
    }
  };

  // Force scroll to bottom when resuming
  useEffect(() => {
    if (!isPaused && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: data.length - 1, align: "end", behavior: "auto" });
    }
  }, [isPaused, data.length]);

  return (
    <div className="h-full w-full">
      <Virtuoso
        ref={virtuosoRef}
        totalCount={data.length}
        itemContent={rowRenderer}
        followOutput={isPaused ? false : "auto"}
        atBottomStateChange={handleAtBottomStateChange}
        alignToBottom={true} // Start at bottom
        initialTopMostItemIndex={data.length - 1} // Initial scroll
        className="h-full w-full thin-scrollbar"
      />
    </div>
  );
};

export default LogStationLogViewer;
