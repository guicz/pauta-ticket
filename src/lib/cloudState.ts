import { collection, doc, onSnapshot, query, where, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import type { AppState } from "../domain/models";
import type { Task } from "../domain/models";
import { seedState } from "../data/seed";
import { db } from "./firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";

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
      void saveWorkspace(seedState).catch((error: Error) => {
        onError(error.message);
      });
    },
    (error) => onError(error.message),
  );
}

export async function saveWorkspace(state: AppState): Promise<void> {
  if (!auth) return;
  await httpsCallable(getFunctions(auth.app, "us-central1"), "saveTeamWorkspace")(JSON.parse(JSON.stringify(state)));
}

export async function submitDemandRequest(task: Task): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, "demandRequests", task.id), { ...task, syncedAt: serverTimestamp() });
}

export function subscribeToDemandRequests(onTasks: (tasks: Task[]) => void, onError: (message: string) => void): Unsubscribe {
  if (!db) return () => undefined;
  return onSnapshot(collection(db, "demandRequests"), (snapshot) => {
    onTasks(snapshot.docs.map((item) => item.data() as Task));
  }, (error) => onError(error.message));
}

export function subscribeToOwnRequests(uid: string, onTasks: (tasks: Task[]) => void, onError: () => void): Unsubscribe {
  if (!db) return () => undefined;
  const owned = new Map<string, Task[]>();
  const receive = (key: string, tasks: Task[]) => { owned.set(key, tasks); onTasks([...new Map([...owned.values()].flat().map(task => [task.id, task])).values()]); };
  const stopUid = onSnapshot(query(collection(db, "demandRequests"), where("requesterUid", "==", uid)), snapshot => receive("uid", snapshot.docs.map(item => item.data() as Task)), onError);
  const email = auth?.currentUser?.email;
  const stopEmail = email ? onSnapshot(query(collection(db, "demandRequests"), where("requesterEmail", "==", email)), snapshot => receive("email", snapshot.docs.map(item => item.data() as Task)), onError) : () => {};
  return () => { stopUid(); stopEmail(); };
}
