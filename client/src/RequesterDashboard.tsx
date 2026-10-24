import { useEffect, useState } from "react";
import { DashboardTicket, getRequesterDashboard, RequesterDashboardResponse } from "./api.js";

export default function RequesterDashboard({ onOpenTickets, onOpenAllTickets, onOpenTicket }: { onOpenTickets: (filter: "open" | "waiting" | "recentlyUpdated" | "recentlyResolved") => void; onOpenAllTickets: () => void; onOpenTicket: (ticketId: number) => void }) {
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(""); try { setData(await getRequesterDashboard()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve the requester dashboard."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const cards = data ? [
    { label: "Open tickets", value: data.metrics.open, filter: "open" as const },
    { label: "Waiting for you", value: data.metrics.waitingForRequester, filter: "waiting" as const },
    { label: "Recently updated", value: data.metrics.recentlyUpdated, filter: "recentlyUpdated" as const },
    { label: "Recently resolved", value: data.metrics.recentlyResolved, filter: "recentlyResolved" as const },
  ] : [];
  return <section className="dashboard" aria-labelledby="requester-dashboard-heading">
    <div className="dashboard-heading"><div><p className="eyebrow">Requester workspace</p><h2 id="requester-dashboard-heading" className="h4">Dashboard</h2><p className="text-secondary">A summary of your tickets and the latest activity.</p></div><button className="btn btn-outline-success" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {loading && <p role="status">Loading your dashboard...</p>}
    {error && <p className="alert alert-danger" role="alert">{error} <button className="btn btn-outline-success ms-2" type="button" onClick={() => void load()}>Retry</button></p>}
    {!loading && !error && data && <>
      <div className="dashboard-metrics">{cards.map((card) => <button type="button" className="dashboard-metric" key={card.filter} onClick={() => onOpenTickets(card.filter)}><span>{card.label}</span><strong>{card.value}</strong><span className="dashboard-metric__link">View matching tickets</span></button>)}</div>
      <div className="dashboard-sections">
        <TicketList title="Attention required" description="Tickets waiting for your response." tickets={data.attentionTickets} onOpenTicket={onOpenTicket} onOpenAllTickets={onOpenAllTickets} empty="No tickets are waiting for your response." />
        <TicketList title="Recently updated" description="Your ticket activity from the past seven days." tickets={data.recentTickets} onOpenTicket={onOpenTicket} onOpenAllTickets={onOpenAllTickets} empty="No tickets were updated in the past seven days." />
        <TicketList title="Recently resolved" description="Resolved or closed within the past seven days." tickets={data.recentlyResolvedTickets} onOpenTicket={onOpenTicket} onOpenAllTickets={onOpenAllTickets} empty="No recently resolved tickets." />
      </div>
    </>}
  </section>;
}

function TicketList({ title, description, tickets, onOpenTicket, onOpenAllTickets, empty }: { title: string; description: string; tickets: DashboardTicket[]; onOpenTicket: (id: number) => void; onOpenAllTickets: () => void; empty: string }) {
  return <section className="dashboard-list"><div><h3 className="h5">{title}</h3><p className="text-secondary">{description}</p></div>{tickets.length === 0 ? <div className="alert alert-info mb-0"><p className="mb-2">{empty}</p><button className="btn btn-outline-success" type="button" onClick={onOpenAllTickets}>My Tickets</button></div> : <ul>{tickets.map((ticket) => <li key={ticket.id}><button type="button" className="dashboard-row" onClick={() => onOpenTicket(ticket.id)}><strong>{ticket.ticketNumber}</strong><span>{ticket.summary}</span><span className={`queue-badge queue-badge--${ticket.currentStatus.toLowerCase().replaceAll("_", "-")}`}>{ticket.currentStatus.replaceAll("_", " ")}</span></button></li>)}</ul>}</section>;
}
