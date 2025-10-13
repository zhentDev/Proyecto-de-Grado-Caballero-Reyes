import { Toaster } from "react-hot-toast";
import "./styles/App.css";
import "./styles/App.scss";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { validateProyectExists } from "./api/db";
import BannerEditor from "./components/BannerEditor";
import { FormProyects } from "./components/FormProyects";
import Menu from "./components/Menu/Menu";
import { ResizeLayout } from "./config/resizeLayout";
import { useContentPathStore } from "./store/contentPathStore";

function App() {
  const setPathMain = useContentPathStore((state) => state.setPathMain);
  const path = useContentPathStore((state) => state.pathMain);
  const [delimiter, setDelimiter] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
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

  if (loading) {
    return <div>Loading...</div>;
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
            path ? (
              <div className="flex w-full h-full">
                <div className="bg-black text-black min-h-screen flex w-fit">
                  <Menu />
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
      </Routes>

      <Toaster />
    </div>
  );
}
export default App;
