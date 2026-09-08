import { useState, type FormEvent } from "react";
import { ClipboardList, LockKeyhole, Wifi } from "lucide-react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, firebaseConfigured } from "../lib/firebase";

interface LoginScreenProps {
  onDemo: () => void;
}

function friendlyError(code: string): string {
  if (code.includes("invalid-credential")) return "E-mail ou senha incorretos.";
  if (code.includes("too-many-requests")) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (code.includes("network-request-failed")) return "Sem conexão com a internet.";
  return "Não foi possível entrar. Confira os dados e tente novamente.";
}

export function LoginScreen({ onDemo }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enterWithGoogle() {
    if (!auth) return;
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (reason) {
      const code = typeof reason === "object" && reason && "code" in reason ? String(reason.code) : "";
      if (!code.includes("popup-closed-by-user")) setError(friendlyError(code));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (reason) {
      const code = typeof reason === "object" && reason && "code" in reason ? String(reason.code) : "";
      setError(friendlyError(code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-symbol"><ClipboardList size={22} /></span>
          <div><strong>Pauta fluxo</strong><small>Um lugar calmo para concluir</small></div>
        </div>

        <div className="login-copy">
          <span className="eyebrow">ACESSO DA EQUIPE</span>
          <h1>Entre no seu espaço de trabalho</h1>
          <p>A pauta aparece do jeito certo para cada pessoa: gestão para a Pati e foco para o Gui.</p>
        </div>

        <button className="button google-button large full" type="button" onClick={enterWithGoogle} disabled={busy || !firebaseConfigured}>
          <span className="google-mark">G</span> {busy ? "Abrindo…" : "Entrar com Google"}
        </button>

        <div className="login-divider"><span>ou use e-mail e senha</span></div>

        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Senha</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={6} />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="button primary large full" disabled={busy || !firebaseConfigured}>
            <LockKeyhole size={17} /> {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="login-sync-note"><Wifi size={16} /><span>As alterações ficam sincronizadas entre vocês em tempo real.</span></div>
        <button className="demo-link" type="button" onClick={onDemo}>Visualizar demonstração sem entrar</button>
      </section>
    </main>
  );
}
