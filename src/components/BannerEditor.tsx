import type React from "react";
import { useEffect, useState } from "react";
import { TfiPencil } from "react-icons/tfi";
import { getEnv } from "../config/initializePermissions";
import { useContentPathStore } from "../store/contentPathStore";
import ExcelView from "./ExcelView/ExcelView";
import LogAnalysisViewer from "./LogViewer/LogAnalysisViewer";
import TabbedLogViewer from "./LogViewer/TabbedLogViewer";
import SpecialFileViewer from "./SpecialFileViewer";
import TextFileViewer from "./TextFileViewer/TextFileViewer";

interface BannerEditorProps {
  separator: string;
}

const BannerEditor: React.FC<BannerEditorProps> = ({ separator }) => {
  const {
    selectedFile,
    selectedFilePath: pathComplete,
    pathMain: path,
    tabbedLogView,
    analysisLogView,
  } = useContentPathStore();

  console.log(`[BannerEditor] Render. tabbedLogView: ${!!tabbedLogView}, selectedFile: ${selectedFile?.name || 'null'}`); // Log al inicio del render

  const [, setText] = useState<string | undefined>("");

  useEffect(() => {
    getEnv(path);
  }, [path]);

  useEffect(() => {
    if (!selectedFile) {
      setText("");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".txt")) {
      setText(selectedFile.content || "");
    }
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile || selectedFile.name.toLowerCase().endsWith(".txt")) {
      return;
    }
  }, [selectedFile]);

  const renderContent = () => {
    console.log(`[BannerEditor] renderContent decision. tabbedLogView: ${!!tabbedLogView}, analysisLogView: ${!!analysisLogView}, selectedFile: ${selectedFile?.name || 'null'}`); // Log antes de la decisión

    if (tabbedLogView) {
      console.log(`[BannerEditor] Rendering TabbedLogViewer.`); // Log si renderiza TabbedLogViewer
      return (
        <TabbedLogViewer
          dateGroup={tabbedLogView.dateGroup}
          files={tabbedLogView.files}
          initialIndex={tabbedLogView.initialIndex}
          delimiter={` ${separator} `}
        />
      );
    }

    if (analysisLogView) {
      console.log(`[BannerEditor] Rendering LogAnalysisViewer.`); // Log si renderiza LogAnalysisViewer
      return (
        <LogAnalysisViewer
          fileName={analysisLogView.fileName}
          logContent={analysisLogView.logContent}
        />
      );
    }

    if (!selectedFile || !pathComplete) {
      console.log(`[BannerEditor] Rendering TfiPencil (empty state).`); // Log si renderiza el estado vacío
      return <TfiPencil className="text-9xl text-neutral-200" />;
    }

    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();

    console.log(`[BannerEditor] Rendering specific file viewer for: ${selectedFile.name}`); // Log si renderiza un visor específico
    switch (fileExtension) {
      case "txt":
        return (
          <TextFileViewer path={pathComplete} delimiter={` ${separator} `} />
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