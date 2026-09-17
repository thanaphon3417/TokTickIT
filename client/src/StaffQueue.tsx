import { useEffect, useState } from "react";
import { getCategories, getStaffTicket, getStaffTickets, ReferenceItem, StaffQueueQuery, StaffQueueResponse, StaffTicketDetail } from "./api.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const badgeClass = (value: string) => `queue-badge queue-badge--${value.toLowerCase().replaceAll("_", "-")}`;

export default function StaffQueue({ onLogout, staffName }: { onLogout: () => void; staffName: string }) {
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [result, setResult] = useState<StaffQueueResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<StaffQueueQuery>({ page: 1, pageSize: 10, sortBy: "updatedAt", sortOrder: "desc" });
  const [detail, setDetail] = useState<StaffTicketDetail | null>(null);

  async function load(next = query) {
    setLoading(true); setError("");
    try { setResult(await getStaffTickets(next)); setQuery(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve the staff ticket queue."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void Promise.all([getCategories().then(setCategories), load()]).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load queue references."));
  }, []);

  const change = (key: keyof StaffQueueQuery, value: string) => setQuery({ ...query, [key]: value, page: 1 });
  const clear = () => void load({ page: 1, pageSize: 10, sortBy: "updatedAt", sortOrder: "desc" });
  async function openDetail(ticketId: number) {
    setLoading(true); setError("");
    try { setDetail(await getStaffTicket(ticketId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve the staff ticket."); }
    finally { setLoading(false); }
  }

  return <div className="app-shell">
    <header className="app-header"><div className="app-header__inner">
      <a className="brand" href="#queue" onClick={(event) => { event.preventDefault(); void load({ ...query, page: 1 }); }}><span className="brand-mark" aria-hidden="true">◷</span><span className="brand-name">TokTickIT</span></a>
      <nav className="app-nav" aria-label="Application navigation"><button type="button" aria-current="page">My Queue</button></nav>
      <span className="profile">● {staffName} <button className="profile__logout" type="button" onClick={onLogout}>Log out</button></span>
    </div></header>
    <main id="queue" className="container page-content">
      <div className="page-title-row"><p className="eyebrow">IT Staff workspace</p><h1 className="h3 mb-1">{detail ? "Ticket Detail" : "My Queue"}</h1><p className="text-secondary mb-0">{detail ? detail.ticketNumber : "Find, review, and triage support requests."}</p></div>
      {detail ? <section className="staff-detail" aria-label="Staff Ticket Detail">
        <button className="btn btn-outline-success mb-4" type="button" onClick={() => setDetail(null)}>← Back to Queue</button>
        <dl className="staff-detail__grid"><div><dt>Ticket number</dt><dd>{detail.ticketNumber}</dd></div><div><dt>Ticket date</dt><dd>{new Date(detail.ticketDate).toLocaleString()}</dd></div><div><dt>Requester</dt><dd>{detail.requester.name}</dd></div><div><dt>Category</dt><dd>{detail.category.name}</dd></div><div><dt>Related system</dt><dd>{detail.relatedSystem.name}</dd></div><div><dt>Assignment</dt><dd>{detail.owner?.name ?? "Unassigned"}</dd></div><div><dt>Requested priority</dt><dd><span className={badgeClass(detail.requestedPriority)}>{detail.requestedPriority}</span></dd></div><div><dt>IT priority</dt><dd><span className={badgeClass(detail.itPriority)}>{detail.itPriority}</span></dd></div><div><dt>Status</dt><dd><span className={badgeClass(detail.currentStatus)}>{detail.currentStatus.replaceAll("_", " ")}</span></dd></div><div className="staff-detail__wide"><dt>Summary</dt><dd>{detail.summary}</dd></div><div className="staff-detail__wide"><dt>Description</dt><dd>{detail.description}</dd></div></dl>
        <p className="staff-detail__hint">Assignment, priority, status, comments, and internal notes will be available in Issue 6.</p>
      </section> : <>
      <section className="queue-filters">
        <div className="queue-filter queue-filter--search"><label className="form-label" htmlFor="queue-search">Search</label><input id="queue-search" className="form-control" placeholder="Ticket number, summary, or requester" value={query.search ?? ""} onChange={(event) => change("search", event.target.value)} /></div>
        <div className="queue-filter"><label className="form-label" htmlFor="queue-category">Category</label><select id="queue-category" className="form-select" value={query.categoryId ?? ""} onChange={(event) => change("categoryId", event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="queue-filter"><label className="form-label" htmlFor="queue-priority">Requested priority</label><select id="queue-priority" className="form-select" value={query.requestedPriority ?? ""} onChange={(event) => change("requestedPriority", event.target.value)}><option value="">All priorities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></div>
        <div className="queue-filter"><label className="form-label" htmlFor="queue-status">Status</label><select id="queue-status" className="form-select" value={query.currentStatus ?? ""} onChange={(event) => change("currentStatus", event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
        <div className="queue-filter"><label className="form-label" htmlFor="queue-sort">Sort by</label><select id="queue-sort" className="form-select" value={query.sortBy ?? "updatedAt"} onChange={(event) => change("sortBy", event.target.value)}><option value="updatedAt">Last updated</option><option value="createdAt">Created date</option><option value="ticketNumber">Ticket number</option><option value="summary">Summary</option><option value="requestedPriority">Requested priority</option><option value="itPriority">IT priority</option><option value="currentStatus">Status</option></select></div>
        <div className="queue-filter"><label className="form-label" htmlFor="queue-sort-order">Order</label><select id="queue-sort-order" className="form-select" value={query.sortOrder ?? "desc"} onChange={(event) => change("sortOrder", event.target.value)}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></div>
        <div className="queue-actions"><button className="btn btn-success" type="button" onClick={() => void load(query)}>Apply filters</button><button className="btn btn-outline-success" type="button" onClick={clear}>Clear</button></div>
      </section>
      {loading && <p role="status" className="mt-4">Loading ticket queue...</p>}
      {error && <div className="alert alert-danger mt-4" role="alert">{error}<button className="btn btn-outline-danger ms-3" type="button" onClick={() => void load()}>Retry</button></div>}
      {!loading && !error && result?.items.length === 0 && <p className="alert alert-info mt-4">No tickets match the current queue filters.</p>}
      {!loading && !error && result && result.items.length > 0 && <>
        <p className="queue-count">{result.pagination.totalItems} ticket{result.pagination.totalItems === 1 ? "" : "s"} in queue</p>
        <div className="queue-table"><table className="table"><thead><tr><th>Ticket</th><th>Requester</th><th>Summary</th><th>Category</th><th>Requested</th><th>IT priority</th><th>Status</th><th>Assignment</th></tr></thead><tbody>{result.items.map((ticket) => <tr key={ticket.id}><td><button className="queue-ticket-number" type="button" onClick={() => void openDetail(ticket.id)}>{ticket.ticketNumber}</button></td><td>{ticket.requester.name}</td><td>{ticket.summary}</td><td>{ticket.category.name}</td><td><span className={badgeClass(ticket.requestedPriority)}>{ticket.requestedPriority}</span></td><td><span className={badgeClass(ticket.itPriority)}>{ticket.itPriority}</span></td><td><span className={badgeClass(ticket.currentStatus)}>{ticket.currentStatus.replaceAll("_", " ")}</span></td><td><span className={ticket.owner ? "queue-assignee" : "queue-badge queue-badge--unassigned"}>{ticket.owner?.name ?? "Unassigned"}</span></td></tr>)}</tbody></table></div>
        <div className="queue-cards">{result.items.map((ticket) => <article className="queue-card" key={ticket.id}><button className="queue-ticket-number" type="button" onClick={() => void openDetail(ticket.id)}>{ticket.ticketNumber}</button><p className="queue-card__summary">{ticket.summary}</p><dl><div><dt>Requester</dt><dd>{ticket.requester.name}</dd></div><div><dt>Category</dt><dd>{ticket.category.name}</dd></div><div><dt>Requested</dt><dd><span className={badgeClass(ticket.requestedPriority)}>{ticket.requestedPriority}</span></dd></div><div><dt>IT priority</dt><dd><span className={badgeClass(ticket.itPriority)}>{ticket.itPriority}</span></dd></div><div><dt>Status</dt><dd><span className={badgeClass(ticket.currentStatus)}>{ticket.currentStatus.replaceAll("_", " ")}</span></dd></div><div><dt>Assignment</dt><dd><span className={ticket.owner ? "queue-assignee" : "queue-badge queue-badge--unassigned"}>{ticket.owner?.name ?? "Unassigned"}</span></dd></div></dl></article>)}</div>
        {result.pagination.totalPages > 1 && <div className="queue-pagination"><button className="btn btn-outline-success" disabled={query.page === 1} onClick={() => void load({ ...query, page: (query.page ?? 1) - 1 })}>Previous</button><span>Page {result.pagination.page} of {result.pagination.totalPages}</span><button className="btn btn-outline-success" disabled={query.page === result.pagination.totalPages} onClick={() => void load({ ...query, page: (query.page ?? 1) + 1 })}>Next</button></div>}
      </>}</>}
    </main>
  </div>;
}
