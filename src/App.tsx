import {
  WebviewWindow,
  getCurrentWebviewWindow,
} from "@tauri-apps/api/webviewwindow";
import { Toaster } from "react-hot-toast";
import "./styles/App.css";
import "./styles/App.scss";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { validateProyectExists } from "./api/db";
import BannerEditor from "./components/BannerEditor";
import { FormProyects } from "./components/FormProyects";
import Menu from "./components/Menu/Menu";
import SystemInfoBox from "./components/SystemInfoBox/SystemInfoBox"; // Added import
import { useContentPathStore } from "./store/contentPathStore";

function App() {
  const path = useContentPathStore((state) => state.pathMain);
  const rehydrated = useContentPathStore((state) => state.rehydrated);
  const setPathMain = useContentPathStore((state) => state.setPathMain);
  const [delimiter, setDelimiter] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const setInitialTitle = async () => {
      try {
        const win = getCurrentWebviewWindow();
        if (win) {
          // await win.setTitle("Nuevo título dinámico");
        }
      } catch (e) {
        console.error("Failed to set window title", e);
      }
    };
    setInitialTitle();

    const checkProject = async () => {
      try {
        const result = await validateProyectExists();
        const newPath = result.path || null;
        setPathMain(newPath);
        setDelimiter(result.separator || "");
      } catch (error) {
        console.error("Error validating project existence:", error);
      } finally {
        setLoading(false);
      }
    };
    checkProject();
  }, [setPathMain]);

  const handleBack = () => {
    setPathMain(null);
    navigate("/");
  };

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  if (!rehydrated) {
    // espera a que Zustand rehidrate desde localStorage
    return <div>Loading app state...</div>;
  }

  console.log(path);

  return (
    <div className="container-layout w-full h-full">
      <Routes>
        <Route
          path="/"
          element={path ? <Navigate to="/editor" /> : <FormProyects />}
          // element={<Navigate to="/editor" />}
        />
        <Route
          path="/editor"
          element={
            <div className="flex w-full h-full">
              <div className="bg-black text-black min-h-screen flex flex-col">
                <Menu />
                <SystemInfoBox />
              </div>
              <div className="flex justify-center items-center editor w-full h-full">
                <BannerEditor separator={delimiter} />
              </div>
            </div>
          }
        />
      </Routes>
      {/* <Route
          path="/editor"
          element={
            path ? (
              <div className="flex w-full h-full">
                <div className="bg-black text-black min-h-screen flex flex-col">
                  <Menu />
                  <SystemInfoBox />
                </div>
                <div className="flex justify-center items-center editor w-full h-full">
                  <BannerEditor separator={delimiter} />
                </div>
              </div>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes> */}

      <Toaster />
    </div>
  );
}
export default App;
