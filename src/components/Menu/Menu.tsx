import { useNavigate } from "react-router-dom";
import { useContentPathStore } from "../../store/contentPathStore";
import BannerForm from "../BannerForm";
import BannerList from "../BannerList";
import "./Menu.scss";

function Menu() {
  const path = useContentPathStore((state) => state.pathMain);
  const setPathMain = useContentPathStore((state) => state.setPathMain);
  const navigate = useNavigate();

  const handleBack = () => {
    setPathMain(null);
    navigate("/");
  };

  const projectName = path ? path.split("\\").pop() : "";

  	return (
  		<div className="menu flex flex-col gap-2 p-2 flex-grow min-h-0">      {path && (
        <h1 className="text-white font-bold mr-4 text-sm bg-transparent w-full p-1 rounded-md truncate h-8 z-50">
          {projectName}
        </h1>
      )}
      <button
        type="button"
        className="back-button rounded-md w-3/5 mx-auto text-xs flex-shrink-0"
        onClick={handleBack}
      >
        Volver
      </button>
      {/* This container will now grow and handle overflow correctly */}
      <div className="bg-zinc-800 border-2 border-sky-950 rounded-md content flex flex-col flex-grow min-h-0 overflow-y-auto">
        <BannerForm path={path ?? ""} />
        <BannerList />
      </div>
    </div>
  );
}

export default Menu;
