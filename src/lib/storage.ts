import type { AppState } from "../domain/models";
import { seedState } from "../data/seed";

// Previous demo remains recoverable under its original key.
const STORAGE_KEY = "pauta-fluxo-state-v3";

export function loadState(): AppState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as AppState) : seedState;
  } catch {
    return seedState;
  }
}

export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): AppState {
  window.localStorage.removeItem(STORAGE_KEY);
  return seedState;
}
