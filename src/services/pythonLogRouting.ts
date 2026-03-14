export type PythonLogLevel = 'info' | 'warn' | 'error';

export interface RoutedPythonLogLine {
    level: PythonLogLevel;
    message: string;
    parsePayload: string;
}

export function routePythonLogLine(line: string, fromStderr: boolean): RoutedPythonLogLine {
    const levelMatch = line.match(/^\[codecarbon\s+(debug|info|warning|error|critical)\s+@\s*[^\]]+\]\s*(.*)$/i);
    const level = levelMatch?.[1]?.toLowerCase();
    const message = (levelMatch ? levelMatch[2] : line).trim() || line;

    if (level === 'debug' || level === 'info') {
        return { level: 'info', message, parsePayload: `${line}\n` };
    }
    if (level === 'warning') {
        return { level: 'warn', message, parsePayload: `${line}\n` };
    }
    if (level === 'error' || level === 'critical') {
        return { level: 'error', message, parsePayload: `${line}\n` };
    }
    if (fromStderr) {
        return { level: 'error', message: `Python error: ${line}`, parsePayload: `${line}\n` };
    }
    return { level: 'info', message: line, parsePayload: `${line}\n` };
}
