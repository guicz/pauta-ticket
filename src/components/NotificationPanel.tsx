import { Bell, CheckCheck, X } from "lucide-react";
import type { AppNotification } from "../domain/models";

export function NotificationPanel({ notifications, onClose, onMarkAllRead }: { notifications: AppNotification[]; onClose: () => void; onMarkAllRead: () => void }) {
  return (
    <div className="panel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="notification-panel" aria-label="Notificações">
        <header>
          <div><span className="eyebrow">ATUALIZAÇÕES</span><h2>Notificações</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar notificações"><X size={20} /></button>
        </header>
        <button className="mark-read" onClick={onMarkAllRead}><CheckCheck size={16} /> Marcar todas como lidas</button>
        <div className="notification-list">
          {notifications.map((notification) => (
            <article key={notification.id} className={`notification-item ${notification.read ? "read" : ""} level-${notification.level}`}>
              <span className="notification-icon"><Bell size={16} /></span>
              <div><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(notification.createdAt))}</small></div>
            </article>
          ))}
          {notifications.length === 0 && <div className="panel-empty"><Bell size={24} /><p>Nenhuma atualização por enquanto.</p></div>}
        </div>
      </aside>
    </div>
  );
}
