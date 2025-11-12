import type React from "react";
import { useEffect } from "react";
import { TfiPencil } from "react-icons/tfi";
import { getEnv } from "../config/initializePermissions";
import {} from "../config/initializeSystemTry";
import { useContentPathStore } from "../store/contentPathStore";
import { parseLogEntries } from "../utils/logParser";
import ExcelView from "./ExcelView/ExcelView";
import LogAnalysisViewer from "./LogViewer/LogAnalysisViewer";
import TabbedLogViewer from "./LogViewer/TabbedLogViewer";
import SpecialFileViewer from "./SpecialFileViewer";
import TextFileViewer from "./TextFileViewer/TextFileViewer";

interface BannerEditorProps {
  delimiter: string;
}

const BannerEditor: React.FC<BannerEditorProps> = ({ delimiter }) => {
  const {
    selectedFile,
    selectedFilePath: pathComplete,
    pathMain: path,
    tabbedLogView,
    analysisLogView,
  } = useContentPathStore();

  useEffect(() => {
    getEnv(path);
  }, [path]);

  useEffect(() => {
    if (!selectedFile || selectedFile.name.toLowerCase().endsWith(".txt")) {
      return;
    }
  }, [selectedFile]);

  const renderContent = () => {
    if (tabbedLogView) {
      return (
        <TabbedLogViewer
          dateGroup={tabbedLogView.dateGroup}
          files={tabbedLogView.files}
          initialIndex={tabbedLogView.initialIndex}
          delimiter={` ${delimiter} `}
        />
      );
    }

    if (analysisLogView) {
      const lines = analysisLogView.logContent.split("\n");
      const logEntries = parseLogEntries(lines, lines);
      // biome-ignore lint/suspicious/noEmptyBlockStatements: <explanation>
      const handleEntryClick = (_lineNumber: number) => {};
      return (
        <LogAnalysisViewer
          logEntries={logEntries}
          onEntryClick={handleEntryClick}
        />
      );
    }

    if (!selectedFile || !pathComplete) {
      return <TfiPencil className="text-9xl text-neutral-200" />;
    }

    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();

    switch (fileExtension) {
      case "txt":
        return (
          <TextFileViewer path={pathComplete} delimiter={` ${delimiter} `} />
        );
      case "xlsx":
      case "xls":
      case "csv":
        return <ExcelView path={pathComplete} />;
      case "log":
        // This case is handled by analysisLogView, but as a fallback:
        return <SpecialFileViewer fileName={selectedFile.name} />;
      default:
        return <SpecialFileViewer fileName={selectedFile.name} />;
    }
  };

  return <>{renderContent()}</>;
};

export default BannerEditor;
