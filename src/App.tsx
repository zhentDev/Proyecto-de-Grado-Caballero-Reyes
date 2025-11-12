import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewwindow";
import { Toaster } from "react-hot-toast";
import "./styles/App.css";
import "./styles/App.scss";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { validateProyectExists } from "./api/db";
import BannerEditor from "./components/BannerEditor";
import { FormProyects } from "./components/FormProyects";
import Menu from "./components/Menu/Menu";
import SystemInfoBox from "./components/SystemInfoBox/SystemInfoBox";
import { useContentPathStore } from "./store/contentPathStore";

function App() {
  const path = useContentPathStore((state) => state.pathMain);
  const rehydrated = useContentPathStore((state) => state.rehydrated);
  const setPathMain = useContentPathStore((state) => state.setPathMain);
  const [delimiter, setDelimiter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setInitialTitle = async () => {
      try {
        const win = getCurrentWebviewWindow();
        if (win) {
          await win.setTitle("Nuevo título dinámico");
        }
      } catch (e) {
        console.error("Failed to set window title", e);
      }
    };
    // setInitialTitle();

    const checkProject = async () => {
      try {
        const result = await validateProyectExists();

        const delimiterValue = result.delimiter ? result.delimiter : "";

        setDelimiter(delimiterValue);
        const newPath = result.path || null;
        setPathMain(newPath);
        if (newPath) {
          await invoke("set_monitored_project", { path: newPath });
          await invoke("listen_for_directory_changes", { path: newPath });
        }
      } catch (error) {
        console.error("Error validating project existence:", error);
      } finally {
        setLoading(false);
      }
    };
    checkProject();
  }, [setPathMain]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!rehydrated) {
    return <div>Loading app state...</div>;
  }

  return (
    <div className="container-layout w-full h-full">
      <Routes>
        <Route
          path="/"
          element={path ? <Navigate to="/editor" /> : <FormProyects />}
        />
        <Route
          path="/editor"
          element={
            <div className="flex w-full h-full">
              <div className="bg-black text-black min-h-screen flex flex-col border-r border-gray-700">
                <Menu />
                <SystemInfoBox />
              </div>
              <div className="flex justify-center items-center editor w-full h-full">
                <BannerEditor delimiter={delimiter} />
              </div>
            </div>
          }
        />
      </Routes>
      <Toaster />
    </div>
  );
}
export default App;
