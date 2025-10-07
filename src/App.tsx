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
	useEffect(() => {
		//new ResizeLayout()
	}, []);
	const setPathMain = useContentPathStore((state) => state.setPathMain);
	let path: string | null = useContentPathStore((state) => state.pathMain);
	const navigate = useNavigate();
	const [delimiter, setDelimiter] = useState("");

	useEffect(() => {
		// If path is false, redirect to "/"
		const checkProject = async () => {
			try {
				const result = await validateProyectExists();
				// Optionally update path in store here if needed
				path = result.path || null; // Ensure path is set to null if not found
				setPathMain(path);
				setDelimiter(result.separator || "");
				if (!path) navigate("/");
				else navigate("/editor");
			} catch (error) {
				console.error("Error validating project existence:", error);
				// navigate("/");
			}
		};
		checkProject();
	}, [path, navigate, setPathMain]);

	function ProtectedRoute({ element }: { element: JSX.Element }) {
		return path ? element : <Navigate to="/" />;
	}

	return (
		<div className="container-layout w-full h-full">
			<Routes>
				<Route path="/" element={<FormProyects />} />
				<Route
					path="/editor"
					element={
						<ProtectedRoute
							element={
								<div className="flex w-full h-full">
									<div className="bg-blue-300 text-black min-h-screen flex w-fit">
										<Menu />
									</div>
									<div className="flex justify-center items-center editor w-full h-full">
										<BannerEditor separator={delimiter} />
									</div>
								</div>
							}
						/>
					}
				/>
			</Routes>

			<Toaster />
		</div>
	);
}

export default App;
