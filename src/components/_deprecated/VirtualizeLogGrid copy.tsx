// VirtualizedGrid.tsx - Reemplaza tu componente con este

import React, { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  RowData,
  Table,
} from "@tanstack/react-table";
// Importa el tipo Virtualizer directamente de la librería
import { Virtualizer } from "@tanstack/react-virtual";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {}
}

// **AQUÍ ESTÁ EL CAMBIO PRINCIPAL**
// Especificamos que el virtualizador trabaja con un HTMLDivElement,
// que es exactamente lo que el componente padre le pasa.
type VirtualizedGridProps<TData> = {
  table: Table<TData>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>; // <--- TIPO CORREGIDO
};

export const VirtualizedGrid = <TData,>({
  table,
  rowVirtualizer,
}: VirtualizedGridProps<TData>) => {
  const { rows } = table.getRowModel();
  const virtualRows = rowVirtualizer.getVirtualItems();

  const gridTemplateColumns = useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((col) => (col.getSize() === 0 ? "1fr" : `${col.getSize()}px`)) // Aseguramos que la columna flexible funcione
        .join(" "),
    [table]
  );

  const baseClass = `absolute top-10 left-0 grid w-full border-b border-gray-700 cursor-pointer row`;

  return (
    // El ref ahora se obtiene directamente del virtualizer y se castea al tipo correcto
    <div
      ref={
        rowVirtualizer.options
          .getScrollElement as React.RefObject<HTMLDivElement>
      }
      className="h-[calc(100vh-5px)] w-full overflow-auto border border-gray-600 table text-xl responsive-log-table table-fixed"
      id="table"
    >
      <div
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        className="relative w-full"
        id="thead"
      >
        {/* Encabezado Fijo */}
        <div
          className="grid sticky top-0 z-10 bg-gray-600 text-white border-b-2 border-gray-600"
          style={{ gridTemplateColumns }}
          id="tr"
        >
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => (
              <div
                key={header.id}
                className="px-4 py-2 font-bold flex items-center *:text-gray-500"
                style={{ width: "160px" }}
                id="th"
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </div>
            ))
          )}
        </div>

        {/* Filas Virtualizadas */}

        <div className="" id="tr">
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];

            return (
              <div
                key={row.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                  gridTemplateColumns,
                }}
                className={`${baseClass} text-white ${
                  row.getVisibleCells()[0].row.original[0]
                }`}
                id="tr"
              >
                {row.getVisibleCells().map((cell) => (
                  <React.Fragment key={cell.id}>
                    <span className="w-fit h-full px-4 py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
