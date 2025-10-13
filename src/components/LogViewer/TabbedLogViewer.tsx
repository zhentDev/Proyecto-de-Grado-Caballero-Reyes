import type React from "react";
import { useState } from "react";
import TextFileViewer from "../TextFileViewer/TextFileViewer";

export interface LogFileInfo {
  name: string;
  path: string;
}

interface TabbedLogViewerProps {
  files: LogFileInfo[];
  delimiter: string;
}

const TabbedLogViewer: React.FC<TabbedLogViewerProps> = ({
  files,
  delimiter,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!files || files.length === 0) {
    return <div className="p-4 text-white">No files to display.</div>;
  }

  return (
    <div className="flex flex-col h-full text-white w-full">
      <div className="flex border-b border-gray-700">
        {files.map((file, index) => (
          <button
            key={file.path}
            type="button"
            className={`p-0 m-0 h-8 text font-medium align-middle items-center ${
              activeTab === index
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:bg-gray-800"
            }`}
            onClick={() => setActiveTab(index)}
          >
            {file.name}
          </button>
        ))}
      </div>
      <div className="bg-gray-900 flex-grow overflow-y-auto w-full h-full">
        <TextFileViewer path={files[activeTab].path} delimiter={delimiter} />
      </div>
    </div>
  );
};

export default TabbedLogViewer;
