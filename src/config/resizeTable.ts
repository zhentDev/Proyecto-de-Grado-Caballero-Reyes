interface ColumnElement extends HTMLElement {
    style: CSSStyleDeclaration;
    offsetWidth: number;
    classList: DOMTokenList;
}

export class ResizeTable {
    private columnResizing: ColumnElement | null;
    private columnResizingOffset: number;

    constructor() {
        this.columnResizing = null;
        this.columnResizingOffset = 0;
        this.resizeColumn = this.resizeColumn.bind(this);
        this.AddResizingEvent();
    }

    private AddResizingEvent(): void {
        const tableHeaders = document.querySelectorAll<HTMLTableCellElement>("thead th");

        tableHeaders.forEach((th: HTMLTableCellElement) => {
            if (th.textContent === "" || th.textContent === "Tipo") return;

            const grip = document.createElement("div");
            const table = document.querySelector("table"); //revisar si es necesario

            if (table) {
                grip.style.height = `${table.offsetHeight}px`; //revisar si es necesario
            }

            grip.classList.add("grip");

            const child = th.querySelector(".grip");

            if (!child) {
                th.appendChild(grip);
            }


            grip.addEventListener("mousedown", (e: MouseEvent) => {
                this.columnResizing = th;
                this.columnResizingOffset = th.offsetWidth - e.pageX;
                this.columnResizing.classList.add("resizing");

                const mouseMoveHandler = this.resizeColumn.bind(this);
                document.addEventListener("mousemove", mouseMoveHandler);

                document.addEventListener("mouseup", () => {
                    document.removeEventListener("mousemove", mouseMoveHandler);
                    if (this.columnResizing) {
                        this.columnResizing.classList.remove("resizing");
                    }
                }, { once: true });
            });
        });
    }

    private resizeColumn(e: MouseEvent): void {
        if (!this.columnResizing) return;

        this.columnResizing.style.minWidth = `${this.columnResizingOffset + e.pageX}px`;
    }
}