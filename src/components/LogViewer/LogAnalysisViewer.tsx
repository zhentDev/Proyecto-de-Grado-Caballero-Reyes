import type React from "react";
import type { LogEntries } from "../../utils/logParser";
import CollapsibleLogSection from "../TextFileViewer/CollapsibleLogSection";

interface LogAnalysisViewerProps {
	logEntries: LogEntries;
	onEntryClick: (lineNumber: number) => void;
}

const LogAnalysisViewer: React.FC<LogAnalysisViewerProps> = ({
	logEntries,
	onEntryClick,
}) => {
	return (
		<div
			className="w-full p-2 bg-gray-950 opacity-75 text-white overflow-auto rounded-lg"
			style={{ maxHeight: "100%" }}
		>
			<CollapsibleLogSection
				title="Errors"
				entries={logEntries.errors}
				color="#ff5a5a"
				onEntryClick={onEntryClick}
			/>
			<CollapsibleLogSection
				title="Warnings"
				entries={logEntries.warnings}
				color="#ffd166"
				onEntryClick={onEntryClick}
			/>
		</div>
	);
};

export default LogAnalysisViewer;
