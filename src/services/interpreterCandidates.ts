export function buildInterpreterCandidates(
    configuredPath: string,
    pythonExtensionPath: string | undefined,
    preferPythonExtension: boolean,
): string[] {
    const seen = new Set<string>();
    const candidates: string[] = [];

    const add = (value: string | undefined): void => {
        const normalized = (value ?? '').trim();
        if (!normalized || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        candidates.push(normalized);
    };

    if (preferPythonExtension) {
        add(pythonExtensionPath);
        add(configuredPath);
    } else {
        add(configuredPath);
        add(pythonExtensionPath);
    }

    if (process.platform === 'win32') {
        if (seen.has('python')) {
            add('py');
        }
        if (seen.has('py')) {
            add('python');
        }
        return candidates;
    }

    if (seen.has('python3')) {
        add('python');
    }
    if (seen.has('python')) {
        add('python3');
    }
    return candidates;
}
