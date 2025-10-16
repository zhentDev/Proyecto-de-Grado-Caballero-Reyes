import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./TextFileViewer.scss";
import { listen } from "@tauri-apps/api/event";
import toast from "react-hot-toast";
import { ResizeTable } from "../../config/resizeTable";
import type { LogEntries } from "../../utils/logParser";
import { parseLogEntries } from "../../utils/logParser";
import LogAnalysisViewer from "../LogViewer/LogAnalysisViewer";
import { useVirtualizer } from "@tanstack/react-virtual";
("../LogViewer/VirtualizeLogGrid");
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import { VirtualizedGrid } from "../LogViewer/VirtualizeLogGrid";

interface TextFileViewerProps {
  path: string;
  delimiter: string;
}

const regexInicio =
  /(?:inicio|iniciar|comienzo|empezar|arranque|arrancar|incio|inico|comienso|empesar)[\s_]taskbot[\s_](\S+)/i;

const regexFin =
  /(?:fin|finalización|finalizar|terminar|acabar|termino|final|finalisacion|finalizacion|finalisar|termina)[\s_]taskbot[\s_](\S+)/i;

interface TaskInfo {
  name: string;
  lineNumber: number;
}

const analyzeAndGetIndentations = (data: string[][]) => {
  const levels: number[] = [];
  const taskStack: TaskInfo[] = [];

  data.forEach((row, index) => {
    const desc = row[2] || "";
    const normalizedDesc = desc
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const finMatch = normalizedDesc.match(regexFin);
    const inicioMatch = normalizedDesc.match(regexInicio);

    if (finMatch) {
      const taskName = finMatch[1];
      if (
        taskStack.length > 0 &&
        taskStack[taskStack.length - 1].name === taskName
      ) {
        taskStack.pop();
      }
    }

    levels.push(taskStack.length);

    if (inicioMatch) {
      const taskName = inicioMatch[1];
      taskStack.push({ name: taskName, lineNumber: index + 1 });
    }
  });

  return { levels, unclosedTasks: taskStack };
};

function TextFileViewer({ path, delimiter }: TextFileViewerProps) {
  const [logData, setLogData] = useState<string[][]>([]);
  const [logEntries, setLogEntries] = useState<LogEntries>({
    errors: [],
    warnings: [],
  });
  const [loading, setLoading] = useState(true);
  const [maquina, setMaquina] = useState<string | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >([]);
  const [isBannerExpanded, setIsBannerExpanded] = useState(true);
  const [isLogAnalysisExpanded, setIsLogAnalysisExpanded] = useState(true);
  const [showLogAnalysis, setShowLogAnalysis] = useState(false);
  const resizeInstance = useRef<ResizeTable | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headers = ["", "Tipo", "Fecha", "Descripción"];
  const classes = ["show", "hidden", "show", "show"];
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedReload = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const [rows, maquinaValue]: [string[][], string | null] = await invoke(
          "process_log_file",
          { path, delimiter }
        );
        setLogData(rows);
        setMaquina(maquinaValue ?? null);

        // Actualizar logEntries con el contenido parseado
        const linesComplete = rows.map((row) => `${row[2]} ${row[3]}`);
        const linesType = rows.map((row) => row[0]);

        const parsedEntries = parseLogEntries(linesType, linesComplete);
        setLogEntries(parsedEntries);
      } catch (error) {
        console.error("Error reloading file:", error);
      }
    }, 500);
  }, [path, delimiter]);

  useEffect(() => {
    const setupWatcher = async () => {
      try {
        await invoke("watch_file", { path });
      } catch (err) {
        console.error("Error iniciando watcher:", err);
      }
    };
    setupWatcher();
  }, [path]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const loadData = async () => {
      try {
        const [data, maquinaValue]: [string[][], string | null] = await invoke(
          "process_log_file",
          { path, delimiter }
        );
        if (data.length > 0) {
          setLogData(data);
          const linesComplete = data.map((row) => `${row[2]} ${row[3]}`);
          const linesType = data.map((row) => row[0]);

          const parsedEntries = parseLogEntries(linesType, linesComplete);
          setLogEntries(parsedEntries);
        }
        setMaquina(maquinaValue ?? null);
        unlisten = await listen("file-change", () => {
          debouncedReload();
        });
      } catch (error) {
        console.error("Error loading file:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    return () => {
      if (unlisten) unlisten();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [path, delimiter, debouncedReload]);

  useEffect(() => {
    if (logData.length > 0 && tableRef.current) {
      resizeInstance.current = new ResizeTable();
    }
    return () => {
      if (resizeInstance.current) resizeInstance.current = null;
    };
  }, [logData]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logData]);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
          selection?.removeAllRanges();
        });
        toast.success("Texto seleccionado copiado", {
          duration: 2000,
          position: "bottom-right",
        });
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    setDismissedNotifications([]);
  }, [logData]);

  const { levels: indentLevels, unclosedTasks } = useMemo(
    () => analyzeAndGetIndentations(logData),
    [logData]
  );

  const notifications = useMemo(
    () =>
      unclosedTasks.map((taskInfo, index) => ({
        id: `${taskInfo.name.split("\\").at(-1)}-${index}`,
        message: `Tarea sin cerrar: ${taskInfo.name.split("\\").at(-1)}`,
        lineNumber: taskInfo.lineNumber,
      })),
    [unclosedTasks]
  );

  const displayedNotifications = notifications.filter(
    (n) => !dismissedNotifications.includes(n.id)
  );

  const handleDeleteNotification = (notificationIdToDismiss: string) => {
    setDismissedNotifications((prev) => [...prev, notificationIdToDismiss]);
  };

  const handleClearAllNotifications = () => {
    setDismissedNotifications(notifications.map((n) => n.id));
  };

  const getIndentStyle = useCallback((level: number): React.CSSProperties => {
    const basePadding = 8;
    const indentSize = level * 15;
    const totalPadding = basePadding + indentSize;
    const borderColors = [
      "#6a9a8a",
      "#7cbda8",
      "#8cd0b7",
      "#9de4c6",
      "#adf8d5",
    ];
    if (level > 0) {
      const color = borderColors[(level - 1) % borderColors.length];
      return {
        paddingLeft: `${totalPadding}px`,
        borderLeft: `3px solid ${color}`,
        textAlign: "left",
      };
    }
    return { textAlign: "left", paddingLeft: `${basePadding}px` };
  }, []); // Array vacío porque no depende de ningún prop o estado del componente

  const handleRightClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.currentTarget.innerText;
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Texto copiado", {
          duration: 2000,
          position: "bottom-right",
        });
      });
    },
    []
  ); // Array vacío porque `toast` es una función importada estable

  const handleEntryClick = (lineNumber: number) => {
    // lineNumber es 1-based, el índice del virtualizador es 0-based
    rowVirtualizer.scrollToIndex(lineNumber - 1, { align: "start" });
  };

  // Define las columnas DENTRO del componente para que accedan a la lógica
  const columns = useMemo(() => {
    type LogEntry = string[];
    const columnHelper = createColumnHelper<LogEntry>();
    const allColumns = [
      columnHelper.display({
        id: "index",
        header: headers[0] || "Índice",
        size: 60,
        cell: (info) => (
          <div
            className="w-full h-full flex items-center justify-center text-gray-500 select-none"
            onContextMenu={handleRightClick}
          >
            {info.row.index + 1}
          </div>
        ),
      }),
      columnHelper.accessor((row) => row[0], {
        id: "type",
        header: headers[1] || "Tipo",
        size: 150,
        cell: (info) => (
          <div
            className="w-full h-full flex items-center px-2"
            onContextMenu={handleRightClick}
          >
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor((row) => row[1], {
        id: "timestamp",
        header: headers[2] || "Fecha",
        size: 200,
        cell: (info) => (
          <div
            className="w-full h-full flex items-center px-2"
            onContextMenu={handleRightClick}
          >
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.slice(2).join(" "), {
        id: "description",
        header: headers[3] || "Descripción",
        size: 0, // El tamaño 0 con grid 1fr hará que ocupe el resto
        cell: (info) => {
          const indentLevel = indentLevels[info.row.index] || 0;
          const style = getIndentStyle(indentLevel);
          const value = info.getValue();
          const isTaskMarker = regexInicio.test(value) || regexFin.test(value);
          if (isTaskMarker) {
            style.backgroundColor = "#3a536e";
          }

          return (
            <div
              className="w-full h-full min-w-0 break-words py-2 flex items-center"
              style={style}
              onContextMenu={handleRightClick}
            >
              {value}
            </div>
          );
        },
      }),
    ];
    // Filtra las columnas basado en tu array de clases
    return allColumns.filter((col, index) => classes[index] === "show");
  }, [indentLevels, getIndentStyle, handleRightClick]); // Depende de logData para que se recalcule si cambia

  const table = useReactTable({
    data: logData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowVirtualizer = useVirtualizer({
    count: logData.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 75,
    overscan: 5,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full h-full" style={{ position: "relative" }}>
      <div
        style={{
          position: "fixed",
          top: "0px",
          right: "50px",
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={() => {
            const newShowLogAnalysis = !showLogAnalysis;
            setShowLogAnalysis(newShowLogAnalysis);
            if (newShowLogAnalysis) {
              setIsBannerExpanded(false);
            }
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-amber-800 shadow-lg z-1000"
        >
          Análisis de Log
        </button>
      </div>

      {showLogAnalysis && (
        <div className="absolute top-10 right-1/4 w-1/2 max-h-[80%] overflow-y-auto bg-[rgba(40,40,40,0.9)] text-white rounded-lg p-4 shadow-lg z-[2000]">
          <LogAnalysisViewer
            logEntries={logEntries}
            onEntryClick={handleEntryClick}
          />
        </div>
      )}

      {maquina && (
        <div
          style={{
            position: "fixed",
            top: "0px",
            right: "230px",
            zIndex: 1000,
            background: "rgba(30,30,30,0.8)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(255,255,255,0.48)",
            fontWeight: "bold",
            fontSize: "1rem",
            pointerEvents: "none",
            userSelect: "text",
          }}
        >
          Máquina: {maquina}
        </div>
      )}

      {displayedNotifications.length > 0 && (
        <div className="absolute top-10 left-4 w-fit h-auto max-h-[40%] overflow-y-auto bg-[rgba(40,40,40,0.95)] text-blue-400 rounded-lg p-4 shadow-lg z-[2000]">
          <button
            type="button"
            onClick={() => {
              const newIsBannerExpanded = !isBannerExpanded;
              setIsBannerExpanded(newIsBannerExpanded);
              if (newIsBannerExpanded) {
                setShowLogAnalysis(false);
              }
            }}
            className="mt-0 mb-3 border-b border-[#555] pb-2 cursor-pointer select-none bg-transparent text-teal-800 w-full text-left opacity-80 hover:opacity-100"
            aria-expanded={isBannerExpanded}
          >
            Alertas de Tareas {isBannerExpanded ? "[-]" : "[+]"}
          </button>

          {isBannerExpanded && (
            <>
              <ul className="m-0 p-0 list-none w-auto">
                {displayedNotifications.map((notif) => (
                  <li
                    key={notif.id}
                    className="flex justify-between items-center mb-2 text-sm"
                  >
                    <span
                      className="whitespace-nowrap overflow-hidden text-ellipsis pr-4 cursor-pointer hover:underline"
                      onClick={() => handleEntryClick(notif.lineNumber)}
                    >
                      {notif.message}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotification(notif.id)}
                      className="bg-none border-none text-[#ff8a8a] cursor-pointer text-base pl-2 px-3"
                    >
                      X
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleClearAllNotifications}
                className="w-full py-2 mt-4 border-none rounded bg-[#555] text-white cursor-pointer"
              >
                Limpiar Todo
              </button>
            </>
          )}
        </div>
      )}

      <div
        className="w-full h-full flex flex-col overflow-auto"
        ref={containerRef}
      >
        {/* <main>
          <section
            className="w-full h-full p-1 text-center text-gray-500 font-bold border-gray-600 shrink-0 bg-gray-800"
            ref={containerRef}
          >
            <VirtualizedGrid table={table} rowVirtualizer={rowVirtualizer} />
          </section>
        </main> */}

        <div
          className="w-full h-full flex flex-col overflow-auto"
          ref={containerRef}
        >
          <main className="w-full h-full flex items-stretch font-bold border-b-2 border-gray-600 text-lg shrink-0 bg-gray-800">
            <section className="w-full h-full p-1 text-center text-gray-200">
              <table
                ref={tableRef}
                className="table h-auto w-full text-sm responsive-log-table table-fixed"
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
                        className={`px-4 py-2 text-gray-500 ${classes[index]}`}
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
                        <td className="hidden"></td>
                        <td className="hidden"></td>
                        <td className="hidden"></td>
                        <td className="hidden"></td>
                        <td className="hidden"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default TextFileViewer;
