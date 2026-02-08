import React, { useState } from "react";
import {
  Play,
  Pause,
  Trash2,
  Search,
  ScrollText,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  X
} from "lucide-react";
import LogStationLogViewer from "./LogStationLogViewer";

// Green dot for active logs
const ActiveIndicator = () => (
  <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] ml-3 flex-shrink-0"></span>
);

const MainLayout = ({ logFiles, onClearLogs }) => {
  const [selectedLogFile, setSelectedLogFile] = useState(
    logFiles.keys().next().value || ""
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auto-select first log file if none selected and files become available
  React.useEffect(() => {
    if (!selectedLogFile && logFiles.size > 0) {
      setSelectedLogFile(logFiles.keys().next().value);
    }
  }, [logFiles, selectedLogFile]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  // Handlers for search navigation
  const handleNextMatch = () => {
    window.dispatchEvent(new CustomEvent("search-next"));
  };

  const handlePrevMatch = () => {
    window.dispatchEvent(new CustomEvent("search-prev"));
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    }
  };

  const handleClear = () => {
    onClearLogs?.();
  };

  return (
    <div className="bg-zinc-900 text-zinc-300 flex h-screen overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <aside
        className={`${isSidebarCollapsed ? "w-16" : "w-64"} bg-zinc-950 flex flex-col border-r border-zinc-800 flex-shrink-0 transition-all duration-300 ease-in-out`}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-2 h-14">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <ScrollText className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <h1 className="font-bold text-white tracking-wider truncate">LOGSTATION</h1>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-full flex justify-center">
              <ScrollText className="w-6 h-6 text-blue-500" />
            </div>
          )}

          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="text-zinc-500 hover:text-white"
              title="Collapse Sidebar"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle button area when collapsed */}
        {isSidebarCollapsed && (
          <div className="flex justify-center py-2 border-b border-zinc-800/50">
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="text-zinc-500 hover:text-white"
              title="Expand Sidebar"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {!isSidebarCollapsed && (
            <div className="text-xs font-semibold text-zinc-500 uppercase px-2 py-2">
              Log Files
            </div>
          )}

          {[...logFiles.keys()].map((fileName) => (
            <button
              key={fileName}
              onClick={() => {
                setSelectedLogFile(fileName);
                setIsPaused(false); // Resume tailing on file switch
              }}
              className={`w-full rounded flex items-center group cursor-pointer transition-colors ${selectedLogFile === fileName
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                } ${isSidebarCollapsed ? "justify-center py-2 flex-col gap-1 relative h-24" : "px-3 py-2 justify-between"}`}
              title={fileName}
            >
              {isSidebarCollapsed ? (
                <>
                  <div className="absolute top-2 right-2">
                    {selectedLogFile === fileName && <ActiveIndicator />}
                  </div>
                  {/* Rotate text */}
                  <span
                    className="text-xs whitespace-nowrap origin-center"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
                  >
                    {/* Shorten file name to just the file name, not the path */}
                    {fileName.trim().replace(/[/\\]+$/, "").split(/[/\\]/).pop()}
                  </span>
                </>
              ) : (
                <>
                  <span className="truncate text-sm" style={{ direction: "rtl", textAlign: "left" }} title={fileName}>
                    {/* Remove trailing slash */}
                    {"\u200E" + fileName.trim().replace(/[/\\]+$/, "")}
                  </span>
                  {selectedLogFile === fileName && <ActiveIndicator />}
                </>
              )}
            </button>
          ))}
        </div>

        {!isSidebarCollapsed && (
          <div className="p-3 bg-black/20 text-xs text-zinc-500 border-t border-zinc-800">
            {/* Footer content hidden when collapsed */}
            <a href="https://github.com/jdrews/logstation">github.com/jdrews/logstation</a>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 justify-between gap-4">

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="block w-full pl-10 pr-20 py-1.5 border border-zinc-700 rounded-md leading-5 bg-zinc-950 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
              placeholder="Search logs (RegEx supported)..."
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                <button
                  onClick={() => setSearchTerm("")}
                  className="p-1 hover:text-white text-zinc-500 mr-1"
                  title="Clear Search"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-xs text-zinc-500 mr-2">
                  {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : "0/0"}
                </span>
                <button onClick={handlePrevMatch} className="p-1 hover:text-white text-zinc-500">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={handleNextMatch} className="p-1 hover:text-white text-zinc-500">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-2 ${isPaused
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              title={isPaused ? "Resume Tailing" : "Pause Tailing"}
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </button>
            <button
              onClick={handleClear}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              title="Clear Buffer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Log Viewer Area */}
        <div className="flex-1 overflow-hidden bg-zinc-950 relative">
          <LogStationLogViewer
            data={logFiles.get(selectedLogFile) ?? []}
            searchTerm={searchTerm}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            onMatchCountChange={setTotalMatches}
            onCurrentMatchChange={setCurrentMatchIndex}
          />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
