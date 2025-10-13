import type React from "react";
import type { LogEntries } from "../../utils/logParser";
import CollapsibleLogSection from "./CollapsibleLogSection";

interface LogAnalysisViewerProps {
  logEntries: LogEntries;
}

const LogAnalysisViewer: React.FC<LogAnalysisViewerProps> = ({
  logEntries,
}) => {
  return (
    <div className="w-full p-4 bg-gray-950">
      <CollapsibleLogSection
        title="Errors"
        entries={logEntries.errors}
        color="#ff8a8a"
      />
      <CollapsibleLogSection
        title="Warnings"
        entries={logEntries.warnings}
        color="#ffd166"
      />
      <CollapsibleLogSection
        title="Suggestions"
        entries={logEntries.suggestions}
        color="#9de4c6"
      />
    </div>
  );
};

export default LogAnalysisViewer;
