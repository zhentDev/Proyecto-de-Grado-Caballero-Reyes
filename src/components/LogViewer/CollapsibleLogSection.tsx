import type React from "react";
import { useState } from "react";

interface CollapsibleLogSectionProps {
	title: string;
	entries: string[];
	color: string;
}

const CollapsibleLogSection: React.FC<CollapsibleLogSectionProps> = ({
	title,
	entries,
	color,
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
				<ul className="bg-gray-900 p-2 rounded-b-md list-none">
					{entries.map((entry, index) => (
						<li
							key={index}
							className="text-sm whitespace-pre-wrap break-words p-1"
						>
							{entry}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default CollapsibleLogSection;
