export interface TrackerTransitionState {
    isRunning: boolean;
    isInstalled: boolean;
}

export function canStartTracker(state: TrackerTransitionState): boolean {
    return !state.isRunning && state.isInstalled;
}

export function canStopTracker(isRunning: boolean): boolean {
    return isRunning;
}
