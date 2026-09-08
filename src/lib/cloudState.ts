import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import type { AppState } from "../domain/models";
import { seedState } from "../data/seed";
import { db } from "./firebase";

const WORKSPACE_ID = "pauta-fluxo";

function cleanState(value: Partial<AppState>): AppState {
  return {
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    events: Array.isArray(value.events) ? value.events : [],
    notifications: Array.isArray(value.notifications) ? value.notifications : [],
    morningCapacity: value.morningCapacity ?? 90,
    afternoonCapacity: value.afternoonCapacity ?? 120,
    bufferMinutes: value.bufferMinutes ?? 10,
    ...(value.agendaPublishedAt ? { agendaPublishedAt: value.agendaPublishedAt } : {}),
  };
}

export function subscribeToWorkspace(
  onState: (state: AppState) => void,
  onError: (message: string) => void,
): Unsubscribe {
  if (!db) return () => undefined;
  const workspace = doc(db, "workspaces", WORKSPACE_ID);

  return onSnapshot(
    workspace,
    (snapshot) => {
      if (snapshot.exists()) {
        onState(cleanState(snapshot.data() as Partial<AppState>));
        return;
      }
      void setDoc(workspace, { ...seedState, syncedAt: serverTimestamp() }).catch((error: Error) => {
        onError(error.message);
      });
    },
    (error) => onError(error.message),
  );
}

export async function saveWorkspace(state: AppState): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, "workspaces", WORKSPACE_ID), { ...state, syncedAt: serverTimestamp() });
}
