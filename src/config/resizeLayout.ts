export class ResizeLayout {
	private menuResizing: HTMLElement | null;
	private menuResizingOffset: number;

	constructor() {
		this.ResizeMenu = this.ResizeMenu.bind(this);
		this.menuResizing = document.querySelector(".resizer");
		this.menuResizingOffset = 0;
		this.AddResizingEvents();
	}

	private AddResizingEvents(): void {
		const menu = document.getElementsByClassName("menu")[0];

		const grip = document.createElement("div");
		grip.style.height =
			document.getElementsByClassName("container-layout")[0].clientHeight +
			"px";
		grip.classList.add("gripLayout");

		const child = menu.querySelector(".gripLayout");

		if (!child) {
			menu.appendChild(grip);
		}

		grip.addEventListener("mousedown", (e) => {
			this.menuResizing = menu as HTMLElement;
			this.menuResizingOffset = menu.clientWidth - e.pageX;

			this.menuResizing.classList.add("resizingLayout");

			document.addEventListener("mousemove", this.ResizeMenu);

			document.addEventListener("mouseup", () => {
				document.removeEventListener("mousemove", this.ResizeMenu);
				this.menuResizing?.classList.remove("resizingLayout");
			});
		});
	}

	private ResizeMenu(e: MouseEvent): void {
		if (this.menuResizing) {
			this.menuResizing.style.minWidth =
				this.menuResizingOffset + e.pageX + "px";
			this.menuResizingOffset = this.menuResizing.clientWidth - e.pageX;
			if (this.menuResizingOffset + e.pageX >= 245) {
				document.removeEventListener("mousemove", this.ResizeMenu);
			}
		}
	}
}
