import { useEffect, useState } from "react";
import { CollaborationEntry, getCategories, getInternalNotes, getStaffTicket, getStaffTickets, getStaffUsers, getTicketComments, postInternalNote, postTicketComment, ReferenceItem, StaffQueueQuery, StaffQueueResponse, StaffTicketDetail, StaffUser, updateStaffTicket } from "./api.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const badgeClass = (value: string) => `queue-badge queue-badge--${value.toLowerCase().replaceAll("_", "-")}`;
type Tab = "comments" | "notes" | "attachments";

export default function StaffQueue({ onLogout, staffName }: { onLogout: () => void; staffName: string }) {
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [result, setResult] = useState<StaffQueueResponse | null>(null);
  const [detail, setDetail] = useState<StaffTicketDetail | null>(null);
  const [comments, setComments] = useState<CollaborationEntry[]>([]);
  const [notes, setNotes] = useState<CollaborationEntry[]>([]);
  const [query, setQuery] = useState<StaffQueueQuery>({ page: 1, pageSize: 10, sortBy: "updatedAt", sortOrder: "desc" });
  const [workflow, setWorkflow] = useState({ ownerId: "", itPriority: "MEDIUM", currentStatus: "NEW" });
  const [tab, setTab] = useState<Tab>("comments");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(next = query) {
    setLoading(true); setError("");
    try { setResult(await getStaffTickets(next)); setQuery(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve the staff ticket queue."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void Promise.all([getCategories().then(setCategories), getStaffUsers().then(setStaffUsers), load()]).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load queue references.")); }, []);
  const change = (key: keyof StaffQueueQuery, value: string) => setQuery({ ...query, [key]: value, page: 1 });
  const clear = () => void load({ page: 1, pageSize: 10, sortBy: "updatedAt", sortOrder: "desc" });

  async function openDetail(ticketId: number) {
    setLoading(true); setError("");
    try {
      const ticket = await getStaffTicket(ticketId);
      const [nextComments, nextNotes] = await Promise.all([getTicketComments(ticketId), getInternalNotes(ticketId)]);
      setDetail(ticket); setComments(nextComments); setNotes(nextNotes); setMessage(""); setTab("comments");
      setWorkflow({ ownerId: ticket.owner ? String(ticket.owner.id) : "", itPriority: ticket.itPriority, currentStatus: ticket.currentStatus });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve the staff ticket."); }
    finally { setLoading(false); }
  }
  async function saveWorkflow() {
    if (!detail) return;
    setSaving(true); setError("");
    try {
      const updated = await updateStaffTicket(detail.id, { ownerId: workflow.ownerId ? Number(workflow.ownerId) : null, itPriority: workflow.itPriority as "LOW" | "MEDIUM" | "HIGH", currentStatus: workflow.currentStatus });
      setDetail(updated); setWorkflow({ ownerId: updated.owner ? String(updated.owner.id) : "", itPriority: updated.itPriority, currentStatus: updated.currentStatus }); await load(query);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update the staff ticket."); }
    finally { setSaving(false); }
  }
  async function submitMessage() {
    if (!detail || !message.trim()) return;
    setSaving(true); setError("");
    try { if (tab === "comments") setComments([...comments, await postTicketComment(detail.id, message)]); else setNotes([...notes, await postInternalNote(detail.id, message)]); setMessage(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save message."); }
    finally { setSaving(false); }
  }
  const renderBadge = (value: string) => <span className={badgeClass(value)}>{value.replaceAll("_", " ")}</span>;

  if (detail) return <Shell staffName={staffName} onLogout={onLogout} onHome={() => { setDetail(null); void load(query); }} title="Ticket Detail" subtitle={detail.ticketNumber}>
    <section className="staff-detail" aria-label="Staff Ticket Detail">
      <button className="btn btn-outline-success mb-4" type="button" onClick={() => setDetail(null)}>← Back to Queue</button>
      <dl className="staff-detail__grid"><div><dt>Requester</dt><dd>{detail.requester.name}</dd></div><div><dt>Category</dt><dd>{detail.category.name}</dd></div><div><dt>Related system</dt><dd>{detail.relatedSystem.name}</dd></div><div><dt>Requested priority</dt><dd>{renderBadge(detail.requestedPriority)}</dd></div><div className="staff-detail__wide"><dt>Summary</dt><dd>{detail.summary}</dd></div><div className="staff-detail__wide"><dt>Description</dt><dd>{detail.description}</dd></div></dl>
      <div className="staff-work-controls"><h2 className="h5">Work controls</h2><Control label="Assignment"><select id="ticket-owner" className="form-select" value={workflow.ownerId} onChange={(event) => setWorkflow({ ...workflow, ownerId: event.target.value })}><option value="">Unassigned</option>{staffUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Control><Control label="IT priority"><select id="ticket-it-priority" className="form-select" value={workflow.itPriority} onChange={(event) => setWorkflow({ ...workflow, itPriority: event.target.value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></Control><Control label="Current status"><select id="ticket-status" className="form-select" value={workflow.currentStatus} onChange={(event) => setWorkflow({ ...workflow, currentStatus: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></Control><button className="btn btn-success" type="button" disabled={saving} onClick={() => void saveWorkflow()}>{saving ? "Saving..." : "Save changes"}</button></div>
      {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}<Conversation tab={tab} setTab={setTab} entries={tab === "comments" ? comments : notes} attachments={detail.attachments} message={message} setMessage={setMessage} saving={saving} submit={() => void submitMessage()} />
    </section>
  </Shell>;

  return <Shell staffName={staffName} onLogout={onLogout} onHome={() => void load({ ...query, page: 1 })} title="My Queue" subtitle="Find, review, and triage support requests.">
    <section className="queue-filters"><Control label="Search"><input id="queue-search" className="form-control" placeholder="Ticket number, summary, or requester" value={query.search ?? ""} onChange={(event) => change("search", event.target.value)} /></Control><Control label="Category"><select id="queue-category" className="form-select" value={query.categoryId ?? ""} onChange={(event) => change("categoryId", event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Control><Control label="Requested priority"><select id="queue-priority" className="form-select" value={query.requestedPriority ?? ""} onChange={(event) => change("requestedPriority", event.target.value)}><option value="">All priorities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></Control><Control label="Status"><select id="queue-status" className="form-select" value={query.currentStatus ?? ""} onChange={(event) => change("currentStatus", event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></Control><div className="queue-actions"><button className="btn btn-success" type="button" onClick={() => void load(query)}>Apply filters</button><button className="btn btn-outline-success" type="button" onClick={clear}>Clear</button></div></section>
    {loading && <p role="status" className="mt-4">Loading ticket queue...</p>}{error && <p className="alert alert-danger mt-4" role="alert">{error}</p>}{!loading && !error && result?.items.length === 0 && <p className="alert alert-info mt-4">No tickets match the current queue filters.</p>}{!loading && result && result.items.length > 0 && <QueueResult result={result} onOpen={openDetail} renderBadge={renderBadge} query={query} load={load} />}
  </Shell>;
}

function Shell({ staffName, onLogout, onHome, title, subtitle, children }: { staffName: string; onLogout: () => void; onHome: () => void; title: string; subtitle: string; children: React.ReactNode }) { return <div className="app-shell"><header className="app-header"><div className="app-header__inner"><a className="brand" href="#queue" onClick={(event) => { event.preventDefault(); onHome(); }}><span className="brand-mark">◷</span><span className="brand-name">TokTickIT</span></a><nav className="app-nav"><button type="button" onClick={onHome}>My Queue</button></nav><span className="profile">● {staffName} <button className="profile__logout" type="button" onClick={onLogout}>Log out</button></span></div></header><main id="queue" className="container page-content"><div className="page-title-row"><p className="eyebrow">IT Staff workspace</p><h1 className="h3 mb-1">{title}</h1><p className="text-secondary mb-0">{subtitle}</p></div>{children}</main></div>; }
function Control({ label, children }: { label: string; children: React.ReactNode }) { return <div className="queue-filter"><label className="form-label">{label}</label>{children}</div>; }
function Conversation({ tab, setTab, entries, attachments, message, setMessage, saving, submit }: { tab: Tab; setTab: (tab: Tab) => void; entries: CollaborationEntry[]; attachments: StaffTicketDetail["attachments"]; message: string; setMessage: (message: string) => void; saving: boolean; submit: () => void }) { return <><div className="staff-tabs" role="tablist"><button type="button" className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>Public comments</button><button type="button" className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}>Internal notes</button><button type="button" className={tab === "attachments" ? "active" : ""} onClick={() => setTab("attachments")}>Attachments</button></div>{tab === "attachments" ? <div className="staff-feed">{attachments.length === 0 ? <p className="text-secondary">No attachments.</p> : <ul className="staff-attachments">{attachments.map((attachment) => <li key={attachment.id}><strong>{attachment.originalFilename}</strong> · {attachment.sizeBytes} bytes {attachment.removedAt ? <em>Removed</em> : null}</li>)}</ul>}</div> : <><div className="staff-feed">{entries.length === 0 ? <p className="text-secondary">No entries yet.</p> : entries.map((entry) => <article key={entry.id} className="staff-entry"><strong>{entry.author.name}</strong><time>{new Date(entry.createdAt).toLocaleString()}</time><p>{entry.body}</p></article>)}</div><label className="form-label" htmlFor="staff-message">Add {tab === "comments" ? "public comment" : "internal note"}</label><textarea id="staff-message" className="form-control" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /><button className="btn btn-success mt-2" type="button" disabled={saving || !message.trim()} onClick={submit}>{tab === "comments" ? "Post comment" : "Add note"}</button></>}</>; }
function QueueResult({ result, onOpen, renderBadge, query, load }: { result: StaffQueueResponse; onOpen: (id: number) => void; renderBadge: (value: string) => React.ReactNode; query: StaffQueueQuery; load: (next: StaffQueueQuery) => Promise<void> }) { return <><p className="queue-count">{result.pagination.totalItems} tickets in queue</p><div className="queue-table"><table className="table"><thead><tr><th>Ticket</th><th>Requester</th><th>Summary</th><th>Category</th><th>Requested</th><th>IT priority</th><th>Status</th><th>Assignment</th></tr></thead><tbody>{result.items.map((ticket) => <tr key={ticket.id}><td><button className="queue-ticket-number" onClick={() => void onOpen(ticket.id)}>{ticket.ticketNumber}</button></td><td>{ticket.requester.name}</td><td>{ticket.summary}</td><td>{ticket.category.name}</td><td>{renderBadge(ticket.requestedPriority)}</td><td>{renderBadge(ticket.itPriority)}</td><td>{renderBadge(ticket.currentStatus)}</td><td>{ticket.owner?.name ?? "Unassigned"}</td></tr>)}</tbody></table></div>{result.pagination.totalPages > 1 && <div className="queue-pagination"><button className="btn btn-outline-success" disabled={result.pagination.page === 1} onClick={() => void load({ ...query, page: result.pagination.page - 1 })}>Previous</button><span>Page {result.pagination.page} of {result.pagination.totalPages}</span><button className="btn btn-outline-success" disabled={result.pagination.page === result.pagination.totalPages} onClick={() => void load({ ...query, page: result.pagination.page + 1 })}>Next</button></div>}</>; }
