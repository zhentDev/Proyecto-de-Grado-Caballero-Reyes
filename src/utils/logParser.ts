/**
 * Tries to parse a date string with multiple common formats.
 * @param dateString The date string to parse.
 * @returns A Date object or null if parsing fails.
 */
export function parseDate(dateString: string): Date | null {
  // Format: dd-MM-yyyy hh:mm:ss
  let match = dateString.match(
    /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/
  );
  if (match) {
    const [, day, month, year, hour, minute, second] = match.map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  // Format: dd/MM/yyyy hh:mm:ss
  match = dateString.match(
    /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/
  );
  if (match) {
    const [, day, month, year, hour, minute, second] = match.map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  // Format: yyyy-MM-dd hh:mm:ss
  match = dateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match.map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  return null;
}

interface TimestampedLine {
  date: Date;
  line: string;
}

/**
 * Splits log content into separate executions based on start markers and time gaps.
 * @param content The content of the log file.
 * @param timeThresholdInSeconds The time in seconds to consider a new execution.
 * @returns An array of strings, where each string is the content of a single execution.
 */
export function splitLogIntoExecutions(
  content: string,
  timeThresholdInSeconds = 30
): string[] {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return [];
  }

  const timestampedLines: (TimestampedLine & { original: string })[] = [];
  const nonTimestampedLines: string[] = [];

  for (const line of lines) {
    const dateMatch = line.match(
      /^(\d{2}[-\/]\d{2}[-\/]\d{4} \d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/
    );
    const date = dateMatch ? parseDate(dateMatch[0]) : null;
    if (date) {
      timestampedLines.push({ date, line, original: line });
    } else {
      nonTimestampedLines.push(line);
    }
  }

  if (timestampedLines.length === 0) {
    // If no timestamps, split by 'INICIO.' or return as a single block.
    const executions = content.split("INICIO.");
    if (executions.length > 1) {
      return executions
        .filter((e) => e.trim() !== "")
        .map((e) => `INICIO.${e}`);
    }
    return content ? [content] : [];
  }

  const executions: string[] = [];
  let currentExecution: string[] = [timestampedLines[0].original];

  for (let i = 1; i < timestampedLines.length; i++) {
    const prev = timestampedLines[i - 1];
    const curr = timestampedLines[i];
    let isNewExecution = false;

    // If a line contains 'INICIO.', it's definitively a new execution.
    if (curr.line.includes("INICIO.")) {
      isNewExecution = true;
    } else {
      // If not, check for a significant time gap.
      const diffInSeconds = (curr.date.getTime() - prev.date.getTime()) / 1000;
      if (diffInSeconds > timeThresholdInSeconds) {
        isNewExecution = true;
      }
    }

    if (isNewExecution) {
      executions.push(currentExecution.join("\n"));
      currentExecution = [curr.original];
    } else {
      currentExecution.push(curr.original);
    }
  }

  // Add the last execution
  if (currentExecution.length > 0) {
    executions.push(currentExecution.join("\n"));
  }

  // Append non-timestamped lines to the last execution
  if (nonTimestampedLines.length > 0 && executions.length > 0) {
    executions[executions.length - 1] += `\n${nonTimestampedLines.join("\n")}`;
  } else if (nonTimestampedLines.length > 0) {
    return [nonTimestampedLines.join("\n")];
  }

  return executions;
}

/**
 * Extracts a date string (ddMMyyyy) from a log filename.
 * @param filename The name of the log file.
 * @returns The date string or null if not found.
 */
export function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{2})(\d{2})(\d{4})/);
  return match ? match[0] : null;
}

export interface LogEntry {
  line: string;
  lineNumber: number;
}

export interface LogEntries {
  errors: LogEntry[];
  warnings: LogEntry[];
}

export function parseLogEntries(
  lines: string[],
  linesComplete: string[]
): LogEntries {
  const errors: LogEntry[] = [];
  const warnings: LogEntry[] = [];

  // Expresiones regulares para detectar errores y advertencias, insensibles a mayúsculas/minúsculas y acentos.
  const errorRegex = /error|err|errores/i;
  const warningRegex = /warning|warn|advertencia|advertencias/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineComplete = linesComplete[i];
    // Normalizar la línea para manejar acentos y otros caracteres especiales.
    const normalizedLine = line
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (errorRegex.test(normalizedLine)) {
      errors.push({ line: lineComplete, lineNumber: i + 1 });
    } else if (warningRegex.test(normalizedLine)) {
      warnings.push({ line: lineComplete, lineNumber: i + 1 });
    }
  }

  return { errors, warnings };
}
