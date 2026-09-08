import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import type { Person } from "../domain/models";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? initializeFirestore(app, { ignoreUndefinedProperties: true }) : null;

export function personFromEmail(email: string | null): Person {
  const patiEmail = import.meta.env.VITE_PATI_EMAIL?.trim().toLowerCase();
  const guiEmail = (import.meta.env.VITE_GUI_EMAIL ?? "guilherme@dg5.com.br").trim().toLowerCase();
  const normalized = email?.trim().toLowerCase();
  if (normalized === patiEmail) return "pati";
  if (normalized === guiEmail) return "gui";
  return "atendimento";
}
