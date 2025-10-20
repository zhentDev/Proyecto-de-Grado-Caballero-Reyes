import type React from "react";
import { useState } from "react";
import type { LogEntry } from "../../utils/logParser";

interface CollapsibleLogSectionProps {
	title: string;
	entries: LogEntry[];
	color: string;
	onEntryClick: (lineNumber: number) => void;
}

const CollapsibleLogSection: React.FC<CollapsibleLogSectionProps> = ({
	title,
	entries,
	color,
	onEntryClick,
}) => {
	const [isExpanded, setIsExpanded] = useState(true);

	if (entries.length === 0) {
		return null;
	}

	return (
		<div className="w-full mb-2">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className={`w-full text-left p-2 text-lg font-bold rounded-t-md focus:outline-none bg-gray-800 text-white`}
			>
				<span style={{ color }}>{title}</span> ({entries.length}){" "}
				{isExpanded ? "[-]" : "[+]"}
			</button>
			{isExpanded && (
				<ul className="bg-gray-900 p-2 rounded-b-md list-none overflow-x-scroll">
					{entries.map((entry) => (
						<li
							key={entry.lineNumber}
							onClick={() => onEntryClick(entry.lineNumber)}
							className="text-sm whitespace-pre p-1 cursor-pointer hover:bg-gray-700"
						>
							{entry.line}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default CollapsibleLogSection;
