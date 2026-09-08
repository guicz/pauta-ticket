import {
  BarChart3,
  Bell,
  ClipboardList,
  Focus,
  LayoutDashboard,
  ListTodo,
  LogOut,
  UserRound,
} from "lucide-react";
import type { AppNotification, Person } from "../domain/models";

export type AppView = "overview" | "queue" | "focus" | "report";

interface AppNavigationProps {
  person: Person;
  view: AppView;
  notifications: AppNotification[];
  onChangePerson: (person: Person) => void;
  onChangeView: (view: AppView) => void;
  onOpenNotifications: () => void;
  allowPersonSwitch?: boolean;
  syncLabel?: string;
  onSignOut?: () => void;
}

export function AppNavigation({
  person,
  view,
  notifications,
  onChangePerson,
  onChangeView,
  onOpenNotifications,
  allowPersonSwitch = true,
  syncLabel,
  onSignOut,
}: AppNavigationProps) {
  const unread = notifications.filter((notification) => !notification.read).length;
  const managerItems: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard }> = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "queue", label: "Fila de demandas", icon: ListTodo },
    { id: "report", label: "Relatório semanal", icon: BarChart3 },
  ];
  const guiItems: Array<{ id: AppView; label: string; icon: typeof Focus }> = [
    { id: "focus", label: "Meu agora", icon: Focus },
  ];
  const items = person === "pati" ? managerItems : guiItems;

  return (
    <aside className="app-sidebar" aria-label="Navegação principal">
      <div className="brand-mark" aria-label="Pauta Fluxo">
        <span className="brand-symbol"><ClipboardList size={19} /></span>
        <span><strong>Pauta</strong><small>fluxo</small></span>
      </div>

      <nav className="main-nav">
        <p className="nav-eyebrow">ESPAÇO DE TRABALHO</p>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => onChangeView(item.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="notification-shortcut" onClick={onOpenNotifications}>
          <Bell size={18} aria-hidden="true" />
          <span>Notificações</span>
          {unread > 0 && <strong aria-label={`${unread} notificações não lidas`}>{unread}</strong>}
        </button>

        <div className="profile-switch" aria-label="Alternar visão">
          <UserRound size={18} aria-hidden="true" />
          <div>
            <span>{person === "pati" ? "Pati" : "Guilherme"}</span>
            <small>{syncLabel ?? (person === "pati" ? "Gestão" : "Execução")}</small>
          </div>
          {allowPersonSwitch ? (
            <button
              onClick={() => onChangePerson(person === "pati" ? "gui" : "pati")}
              aria-label={`Mudar para visão de ${person === "pati" ? "Guilherme" : "Pati"}`}
            >
              Trocar
            </button>
          ) : (
            <button onClick={onSignOut} aria-label="Sair da conta" title="Sair da conta">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
