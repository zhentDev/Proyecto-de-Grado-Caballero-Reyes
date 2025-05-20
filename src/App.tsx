import { Toaster } from "react-hot-toast";
import "./styles/App.css";
import "./styles/App.scss";
import "./config/index";
import BannerEditor from "./components/BannerEditor";
import { ResizeLayout } from "./config/resizeLayout"
import { useEffect } from "react";
import Menu from "./components/Menu/Menu";
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import {FolderExplorerButton} from "./components/FolderExplorerButton";




function App() {

	useEffect(() => {
		//new ResizeLayout()
	}, []);

	return (
		<div className="container-layout">
			<Routes>
				<Route  path =  "/" element ={<FolderExplorerButton/>}/> 
				<Route path="/editor" element={
					<div>
						<div className="bg-blue-300 text-black min-h-screen flex">
            <Menu />
        </div>
            <div className="flex justify-center items-center editor w-full">
                <BannerEditor />
            </div>
					</div>
				}/>
			</Routes>
			
			<Toaster />
		</div>
	);
}

export default App;
