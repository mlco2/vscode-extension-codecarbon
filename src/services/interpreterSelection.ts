export async function selectWorkingInterpreter(
    candidates: string[],
    probe: (candidate: string) => Promise<boolean>,
): Promise<string | null> {
    for (const candidate of candidates) {
        if (await probe(candidate)) {
            return candidate;
        }
    }
    return null;
}
