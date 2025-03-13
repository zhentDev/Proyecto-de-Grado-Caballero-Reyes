import { Toaster } from "react-hot-toast";
import BannerList from "./components/BannerList";
import "./App.css";
import "./config/index";

function App() {
	return (
		<div className="bg-neutral-950 text-white min-h-screen p-2 grid grid-cols-12">
			<div className="col-span-3 bg-zinc-900">
				<BannerList />
			</div>

			<div className="col-span-9 flex justify-center items-center">
				{/* <SnippetEditor /> */}
			</div>
			<Toaster />
		</div>
	);
}

export default App;
