import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTables, getProyect, getProyects } from "../api/db";
import { useContentPathStore } from "../store/contentPathStore";

type Proyect = {
	id: string | number;
	name: string;
	path: string;
	separator: string;
};

function ProyectsList() {
	const [proyects, setProyects] = useState<Proyect[]>([]);
	const navigate = useNavigate();
	const setFoldersNames = useContentPathStore((state) => state.setFoldersNames);

	useEffect(() => {
		const setup = async () => {
			try {
				await createTables();
			} catch (error) {
				console.error("Error creating tables:", error);
			}
			const data = await getProyects();
			setProyects(data as Proyect[]);
		};
		setup();
	}, []);

	function handlerSelectProyect(event: React.MouseEvent<HTMLButtonElement>) {
		if (!event.currentTarget.textContent) return;
		const fetchProyect = async () => {
			try {
				const textContent = event.currentTarget.textContent;
				if (!textContent) {
					console.error("No project name found in the clicked element.");
					return;
				}
				const data = await getProyect(textContent);
				const proyectData = data as Proyect[];
				navigate("/editor", { state: { path: proyectData[0].path } });
				setFoldersNames([proyectData[0].path]);
			} catch (error) {
				console.error("Error fetching projects:", error);
			}
		};
		fetchProyect();
	}

	return (
		<div className="flex flex-col gap-5 h-full p-5 bg-gray-800">
			<h2 className="text-2xl">Lista de Proyectos</h2>
			<div className="gap-2 justify-center items-center h-full p-4 bg-gray-700 rounded-lg overflow-y-auto">
				<ul className="justify-center items-center flex flex-col gap-2">
					{proyects.map((user) => (
						<li key={user.id}>
							<button
								type="button"
								onClick={(e) => handlerSelectProyect(e)}
								className="w-full text-left p-2 hover:bg-gray-600 rounded"
							>
								{user.name}
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default ProyectsList;
