import { useContentPathStore } from "../../store/contentPathStore";
import BannerForm from "../BannerForm";
import BannerList from "../BannerList";
import "./Menu.scss";

function Menu() {
	const path = useContentPathStore((state) => state.pathMain);

	return (
		<div className="menu flex">
			<div className="title-container is_horiz-skinny small">
				<h1 className="title">PoC1</h1>
			</div>
			<div className="bg-zinc-800 border-2 border-sky-950 rounded-md content">
				<BannerForm path={path ?? ""} />
				<BannerList />
			</div>
		</div>
	);
}

export default Menu;
