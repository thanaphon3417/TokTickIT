import { useEffect, useState } from "react";
import { getStaffDashboard, StaffDashboardResponse, StaffQueueQuery } from "./api.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "REOPENED"];
const priorities = ["HIGH", "MEDIUM", "LOW"];

export default function StaffDashboard({ staffName, isAdministrator = false, onLogout, onOpenQueue, onOpenTicket, onOpenAction, onManageUsers }: { staffName: string; isAdministrator?: boolean; onLogout: () => void; onOpenQueue: (query: StaffQueueQuery) => void; onOpenTicket: (ticketId: number) => void; onOpenAction: (ticketId: number, actionId: number) => void; onManageUsers?: () => void }) {
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(""); try { setData(await getStaffDashboard()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve the staff dashboard."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const queue = (query: StaffQueueQuery = {}) => onOpenQueue({ page: 1, pageSize: 10, sortBy: "updatedAt", sortOrder: "desc", ...query });
  return <div className="app-shell"><header className="app-header"><div className="app-header__inner"><a className="brand" href="#dashboard"><span className="brand-mark" aria-hidden="true">◷</span><span className="brand-name">TokTickIT</span></a><nav className="app-nav" aria-label="Application navigation"><button type="button" aria-current="page">Dashboard</button><button type="button" onClick={() => queue()}>My Queue</button>{isAdministrator && onManageUsers && <button type="button" onClick={onManageUsers}>Users</button>}</nav><span className="profile">● {staffName} <button className="profile__logout" type="button" onClick={onLogout}>Log out</button></span></div></header>
    <main id="dashboard" className="container page-content"><div className="page-title-row"><p className="eyebrow">{isAdministrator ? "Administrator workspace" : "IT Staff workspace"}</p><h1 className="h3 mb-1">Dashboard</h1><p className="text-secondary mb-0">Operational ticket and assigned action summaries.</p></div>
      <div className="dashboard dashboard--staff"><div className="dashboard-heading"><h2 className="visually-hidden">Staff dashboard metrics and work lists</h2><button className="btn btn-outline-success" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
        {loading && <p role="status">Loading staff dashboard...</p>}
        {error && <p className="alert alert-danger" role="alert">{error} <button className="btn btn-outline-success ms-2" type="button" onClick={() => void load()}>Retry</button></p>}
        {!loading && !error && data && <>
          <div className="dashboard-metrics dashboard-metrics--staff"><button className="dashboard-metric" type="button" onClick={() => queue({ owner: "unassigned", activeOnly: true })}><span>Unassigned tickets</span><strong>{data.metrics.unassigned}</strong><span className="dashboard-metric__link">Open matching queue</span></button><button className="dashboard-metric" type="button" onClick={() => queue({ owner: "me", activeOnly: true })}><span>Owned by me</span><strong>{data.metrics.ownedByMe}</strong><span className="dashboard-metric__link">Open matching queue</span></button><button className="dashboard-metric" type="button" onClick={() => document.getElementById("dashboard-my-actions")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>My open assigned actions</span><strong>{data.metrics.myOpenActions}</strong><span className="dashboard-metric__link">View assigned actions</span></button></div>
          <section className="dashboard-list"><h2 className="h5">Tickets by status</h2><div className="dashboard-filter-chips">{statuses.map((status) => <button key={status} type="button" className="dashboard-chip" onClick={() => queue({ currentStatus: status, activeOnly: true })}><span>{status.replaceAll("_", " ")}</span><strong>{data.metrics.byStatus[status] ?? 0}</strong></button>)}</div></section>
          <section className="dashboard-list"><h2 className="h5">Tickets by IT priority</h2><div className="dashboard-filter-chips">{priorities.map((priority) => <button key={priority} type="button" className="dashboard-chip" onClick={() => queue({ itPriority: priority, activeOnly: true })}><span>{priority}</span><strong>{data.metrics.byPriority[priority] ?? 0}</strong></button>)}</div></section>
          <div className="dashboard-sections dashboard-sections--staff"><TicketRows title="Recent tickets" tickets={data.recentTickets} onOpenTicket={onOpenTicket} empty="No non-terminal tickets to show." /><TicketRows title="Urgent tickets" tickets={data.urgentTickets} onOpenTicket={onOpenTicket} empty="No high-priority tickets need attention." /></div>
          <section className="dashboard-list" id="dashboard-my-actions"><div><h2 className="h5">My assigned actions</h2><p className="text-secondary">Planned and in-progress actions assigned to you.</p></div>{data.myActions.length === 0 ? <p className="alert alert-info mb-0">No open actions are assigned to you.</p> : <ul>{data.myActions.map((action) => <li key={action.id}><button type="button" className="dashboard-row" onClick={() => onOpenAction(action.ticketId, action.id)}><strong>{action.ticket.ticketNumber}</strong><span>{action.description}</span><span className={`queue-badge queue-badge--${action.status.toLowerCase().replaceAll("_", "-")}`}>{action.status.replaceAll("_", " ")}</span></button></li>)}</ul>}</section>
        </>}
      </div>
    </main>
  </div>;
}

function TicketRows({ title, tickets, onOpenTicket, empty }: { title: string; tickets: StaffDashboardResponse["recentTickets"]; onOpenTicket: (id: number) => void; empty: string }) {
  return <section className="dashboard-list"><h2 className="h5">{title}</h2>{tickets.length === 0 ? <p className="alert alert-info mb-0">{empty}</p> : <ul>{tickets.map((ticket) => <li key={ticket.id}><button type="button" className="dashboard-row" onClick={() => onOpenTicket(ticket.id)}><strong>{ticket.ticketNumber}</strong><span>{ticket.summary}</span><span className={`queue-badge queue-badge--${ticket.itPriority.toLowerCase()}`}>{ticket.itPriority}</span></button></li>)}</ul>}</section>;
}
