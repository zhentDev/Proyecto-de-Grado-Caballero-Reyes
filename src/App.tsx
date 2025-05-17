import { Toaster } from "react-hot-toast";
import "./styles/App.css";
import "./styles/App.scss";
import "./config/index";
import BannerEditor from "./components/BannerEditor";
import { ResizeLayout } from "./config/resizeLayout"
import { useEffect } from "react";
import Menu from "./components/Menu/Menu";

function App() {

	useEffect(() => {
		new ResizeLayout()
	}, []);

	return (
		<div className="container-layout">
			<div className="bg-blue-300 text-black min-h-screen flex">
				<Menu />
			</div>

			<div className="flex justify-center items-center editor w-full">
				<BannerEditor />
			</div>
			<Toaster />
		</div>
	);
}

export default App;
