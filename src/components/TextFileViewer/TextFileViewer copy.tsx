import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./TextFileViewer.scss";
import { listen } from "@tauri-apps/api/event";
import toast from "react-hot-toast";
import { ResizeTable } from "../../config/resizeTable";
import type { LogEntries } from "../../utils/logParser";
import { parseLogEntries } from "../../utils/logParser";
import LogAnalysisViewer from "../LogViewer/LogAnalysisViewer";

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

  useEffect(() => {
    setDismissedNotifications([]);
  }, [logData]);

  const displayedNotifications = notifications.filter(
    (n) => !dismissedNotifications.includes(n.id)
  );

  const handleDeleteNotification = (notificationIdToDismiss: string) => {
    setDismissedNotifications((prev) => [...prev, notificationIdToDismiss]);
  };

  const handleClearAllNotifications = () => {
    setDismissedNotifications(notifications.map((n) => n.id));
  };

  if (loading) return <div>Loading...</div>;

  const getIndentStyle = (level: number) => {
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
        textAlign: "left" as const,
      };
    }
    return { textAlign: "left" as const, paddingLeft: `${basePadding}px` };
  };

  const handleRightClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.currentTarget.innerText;
    navigator.clipboard.writeText(text).then(() => {});
    toast.success("Texto copiado", {
      duration: 2000,
      position: "bottom-right",
    });
  };

  const handleEntryClick = (lineNumber: number) => {
    const row = tableRef.current?.querySelector<HTMLTableRowElement>(
      `tr:nth-child(${lineNumber})`
    );
    const container = containerRef.current;

    if (row && container) {
      const rowHeight = row.offsetHeight;
      const desiredScrollTop = row.offsetTop - rowHeight; // scroll to 1 line above

      container.scrollTo({
        top: desiredScrollTop,
        behavior: "smooth",
      });
    }
  };

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
        <main className="w-full h-full flex items-stretch font-bold border-b-2 border-gray-600 text-lg shrink-0 bg-gray-800">
          <section className="w-full h-full p-1 text-center text-gray-500">
            <table
              ref={tableRef}
              className="table w-full text-sm responsive-log-table"
            >
              <colgroup>
                <col className="col-index" />
                <col className="col-type" />
                <col className="col-description" />
              </colgroup>
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={header}
                      className={`px-4 py-2 grow text-gray-500 ${classes[index]}`}
                      style={{ flexBasis: "160px" }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {logData.map((row, i) => {
                  const rowKey = row.join("_") + i || `row_${i}`;
                  let displayRow = row;
                  if (row.length > 3) {
                    displayRow = [row[0], row[1], row.slice(2).join(" ")];
                  }
                  const indent = indentLevels[i] || 0;

                  return (
                    <tr key={rowKey}>
                      <th className="p-1 font-normal text-lg select-none">
                        {i + 1}
                      </th>
                      {displayRow.map((item, j) => {
                        const isDescription = j === 2;
                        const content = item;
                        const isTaskMarker =
                          isDescription &&
                          (regexInicio.test(item) || regexFin.test(item));

                        const style: React.CSSProperties = isDescription
                          ? getIndentStyle(indent)
                          : { textAlign: "left" as const };
                        if (isTaskMarker) {
                          style.backgroundColor = "#3a536e"; // Color azul para marcadores de tarea
                        }

                        const baseClass = `px-2 py-1 border-b whitespace-normal break-words font-normal text-lg ${
                          classes[j + 1]
                        } ${row[0]} cursor-pointer row`;

                        return (
                          <th
                            key={`${rowKey}_${j}_${item}`}
                            className={baseClass}
                            onContextMenu={handleRightClick}
                            style={style}
                          >
                            {content}
                          </th>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </div>
  );
}

export default TextFileViewer;
