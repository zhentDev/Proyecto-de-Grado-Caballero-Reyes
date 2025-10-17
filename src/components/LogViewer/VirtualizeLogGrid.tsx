import { Virtualizer } from "@tanstack/react-virtual";
import React from "react";

interface VirtualizedGridProps {
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  logData: string[][];
  headers: string[];
  classes: string[];
  indentLevels: number[];
  getIndentStyle: (level: number) => React.CSSProperties;
  regexInicio: RegExp;
  regexFin: RegExp;
  handleRightClick: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  tableRef: React.RefObject<HTMLTableElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({
  rowVirtualizer,
  logData,
  headers,
  classes,
  indentLevels,
  getIndentStyle,
  regexInicio,
  regexFin,
  handleRightClick,
  tableRef,
  containerRef,
}) => {
  return (
    <div
      className="w-full h-full flex flex-col overflow-scroll"
      ref={containerRef}
    >
      <main className="w-full h-full flex items-stretch font-bold border-b-2 border-gray-600 text-lg shrink-0 bg-gray-800">
        <section className="w-full h-full p-1 text-center text-gray-300">
          <table
            ref={tableRef}
            className="table w-full text-sm responsive-log-table table-fixed"
          >
            <colgroup>
              <col className="col-index" />
              <col className="col-type" />
              <col className="col-description" />
              <col className="col-empty-1" />
              <col className="col-empty-2" />
              <col className="col-empty-3" />
              <col className="col-empty-4" />
              <col className="col-empty-5" />
              <col className="col-empty-6" />
            </colgroup>
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={header}
                    className={`px-4 py-2 text-gray-500 ${classes[index]} text-2xl font-normal select-none`}
                    style={{ width: "160px" }}
                  >
                    {header}
                  </th>
                ))}
                <th className="hidden">.</th>
                <th className="hidden">.</th>
                <th className="hidden">.</th>
                <th className="hidden">.</th>
                <th className="hidden">.</th>
              </tr>
            </thead>

            <tbody
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const i = virtualItem.index;
                const row = logData[i];
                const rowKey = row.join("_") + i || `row_${i}`;
                const indent = indentLevels[i] || 0;

                let displayRow = row;
                if (row.length > 3) {
                  displayRow = [row[0], row[1], row.slice(2).join(" ")];
                }

                return (
                  <tr
                    key={rowKey}
                    className="absolute top-0 left-0 w-full table table-fixed"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <td className="p-1 font-normal text-lg select-none w-28 text-center align-middle border-b whitespace-normal break-words h-6 max-w-full min-w-0 text-wrap">
                      {i + 1}
                    </td>
                    {displayRow.map((item, j) => {
                      const isDescription = j === 2;
                      const isTaskMarker =
                        isDescription &&
                        (regexInicio.test(item) || regexFin.test(item));

                      const style: React.CSSProperties = isDescription
                        ? getIndentStyle(indent)
                        : { textAlign: "left" };

                      if (isTaskMarker) {
                        style.backgroundColor = "#3a536e";
                      }

                      const baseClass = `px-2 py-1 border-b font-normal text-lg break-words whitespace-normal align-top max-w-full min-w-0 ${
                        classes[j + 1]
                      } ${row[0]} cursor-pointer row`;

                      return (
                        <td
                          key={`${rowKey}_${j}_${item}`}
                          className={baseClass}
                          onContextMenu={handleRightClick}
                          style={style}
                          colSpan={j === 1 ? 2 : 8}
                        >
                          {item}
                        </td>
                      );
                    })}
                    <td className="hidden"> </td>
                    <td className="hidden"> </td>
                    <td className="hidden"> </td>
                    <td className="hidden"> </td>
                    <td className="hidden"> </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};
