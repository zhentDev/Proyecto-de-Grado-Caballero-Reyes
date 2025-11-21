import { Toaster } from "react-hot-toast";
import "./styles/App.css";
import "./styles/App.scss";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getProyect, validateProyectExists } from "./api/db";
import BannerEditor from "./components/BannerEditor";
import { FormProyects } from "./components/FormProyects";
import Menu from "./components/Menu/Menu";
import SystemInfoBox from "./components/SystemInfoBox/SystemInfoBox";
import { useContentPathStore } from "./store/contentPathStore";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

type Proyect = {
  id: string | number;
  name: string;
  path: string;
  delimiter: string;
};

function App() {
  const path = useContentPathStore((state) => state.pathMain);
  const rehydrated = useContentPathStore((state) => state.rehydrated);
  const setPathMain = useContentPathStore((state) => state.setPathMain);
  const [delimiter, setDelimiter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        }
      } catch (error) {
        console.error("Error validating project existence:", error);
      } finally {
        setLoading(false);
      }
    };
    checkProject();
  }, [setPathMain]);

  useEffect(() => {
    const unlisten = listen("request-project-path", async (event) => {
      console.log("request-project-path event received in App.tsx", event.payload);
      const { projectName, originalPayload } = event.payload as { projectName: string, originalPayload: any };
      try {
        const data = await getProyect(projectName);
        const proyectData = data as Proyect[];
        if (proyectData.length > 0) {
          emit("project-path-response", {
            projectPath: proyectData[0].path,
            originalPayload: originalPayload,
          });
        } else {
          emit("project-path-response", {
            projectPath: null,
            originalPayload: originalPayload,
          });
        }
      } catch (error) {
        console.error("Error fetching project for backend request:", error);
        emit("project-path-response", {
          projectPath: null,
          originalPayload: originalPayload,
        });
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

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
