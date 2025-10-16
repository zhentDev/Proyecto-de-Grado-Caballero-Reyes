import type React from "react";
import { useEffect, useState } from "react";
import TextFileViewer from "../TextFileViewer/TextFileViewer";
import "./TabbedLogViewer.scss";
import LogDeletionWarning from "./LogDeletionWarning";

export interface LogFileInfo {
  name: string;
  path: string;
}

interface TabbedLogViewerProps {
  dateGroup: string;
  files: LogFileInfo[];
  initialIndex: number;
  delimiter: string;
}

const TabbedLogViewer: React.FC<TabbedLogViewerProps> = ({
  dateGroup,
  files,
  initialIndex,
  delimiter,
}) => {
  console.log(`[TabbedLogViewer] Render. initialIndex prop: ${initialIndex}, dateGroup: ${dateGroup}`); // Log al inicio del render

  const [activeTab, setActiveTab] = useState(initialIndex);
  console.log(`[TabbedLogViewer] useState initialized activeTab to: ${activeTab}`); // Log la inicialización de useState

  // Effect to sync active tab with props
  useEffect(() => {
    console.log(`[TabbedLogViewer] useEffect triggered. initialIndex: ${initialIndex}. Setting activeTab to: ${initialIndex}`); // Log cuando el useEffect se dispara
    setActiveTab(initialIndex);
  }, [initialIndex, files]);

  if (!files || files.length === 0) {
    return <div className="p-4 text-white">No files to display.</div>;
  }

  // Phase 2: Show deletion warning if there are more than 7 tabs
  if (files.length > 7) {
    return <LogDeletionWarning dateGroup={dateGroup} files={files} />;
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 rounded-t-lg overflow-hidden">
      <div className="flex items-center bg-gray-800 p-2">
        <h2 className="text-md font-bold text-white tracking-wider">
          {dateGroup}
        </h2>
      </div>
      <div className="tab-bar">
        {files.map((file, index) => (
          <button
            key={file.path}
            type="button"
            className={`tab-button ${activeTab === index ? "active" : ""}`}
            onClick={() => {
              console.log(`[TabbedLogViewer] Tab button clicked: ${file.name}, index: ${index}`); // Log cuando se hace clic en una pestaña
              setActiveTab(index);
            }}
          >
            {file.name}
          </button>
        ))}
      </div>
      <div className="flex-grow overflow-y-auto w-full h-full p-1 bg-gray-900">
        {/* Check if files[activeTab] exists to prevent errors on fast re-renders */}
                {files[activeTab] && (
                  <TextFileViewer
                    key={files[activeTab].path} // Add a key here
                    path={files[activeTab].path} delimiter={delimiter}
                  />
                )}
      </div>
    </div>
  );
};

export default TabbedLogViewer;
