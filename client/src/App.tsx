import { useEffect, useState } from "react";
import { createTicket, DevelopmentRequester, getActiveRequesters, getCategories, getSystems, getTicket, getTickets, ReferenceItem, TicketDetail, TicketListResponse } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "loading" | "success" | "empty" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("loading");
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ categoryId: "", relatedSystemId: "", summary: "", description: "", requestedPriority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" });
  const [formError, setFormError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [tickets, setTickets] = useState<TicketListResponse | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [ticketPage, setTicketPage] = useState(1);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailError, setDetailError] = useState("");

  async function loadRequesters() {
    setState("loading");
    setErrorMessage("");

    try {
      const activeRequesters = await getActiveRequesters();
      setRequesters(activeRequesters);
      setSelectedId(localStorage.getItem("toktickit.requesterId") ?? "");
      setState(activeRequesters.length === 0 ? "empty" : "success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to retrieve active development requesters.",
      );
      setState("error");
    }
  }

  useEffect(() => {
    void loadRequesters();
  }, []);

  function handleContinue() {
    if (selectedId) {
      localStorage.setItem("toktickit.requesterId", selectedId);
      setShowCreate(true);
      void Promise.all([getCategories(), getSystems()]).then(([loadedCategories, loadedSystems]) => {
        setCategories(loadedCategories);
        setSystems(loadedSystems);
      }).catch((error: unknown) => {
        setFormError(error instanceof Error ? error.message : "Unable to load ticket reference data.");
      });
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setTicketNumber("");
    try {
      const ticket = await createTicket({
        requesterId: Number(selectedId),
        categoryId: Number(form.categoryId),
        relatedSystemId: Number(form.relatedSystemId),
        summary: form.summary,
        description: form.description,
        requestedPriority: form.requestedPriority,
      });
      setTicketNumber(ticket.ticketNumber);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadTickets(page = ticketPage) {
    setTicketLoading(true);
    setTicketError("");
    try {
      setTickets(await getTickets({ requesterId: Number(selectedId), search, categoryId: filterCategory || undefined, requestedPriority: filterPriority || undefined, sortBy, sortOrder, page, pageSize: 5 }));
      setTicketPage(page);
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : "Unable to retrieve tickets.");
    } finally {
      setTicketLoading(false);
    }
  }

  function openTickets() {
    setShowTickets(true);
    void loadTickets(1);
  }

  async function openDetail(ticketId: number) {
    setDetailError("");
    try {
      setDetail(await getTicket(ticketId, Number(selectedId)));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to retrieve ticket.");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-3">TokTickIT</h1>
      <h2 className="h4 mb-2">Select Development Requester</h2>
      <p>This is a Lab 2 testing selector, not a login screen.</p>

      {state === "loading" && (
        <p className="mt-4" role="status">
          Loading active requesters...
        </p>
      )}

      {state === "success" && !showCreate && (
        <form onSubmit={(event) => { event.preventDefault(); handleContinue(); }}>
          <label className="form-label" htmlFor="requester">
            Development Requester <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            id="requester"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            required
          >
            <option value="">Select a requester</option>
            {requesters.map((requester) => (
              <option key={requester.id} value={requester.id}>
                {requester.name} ({requester.email})
              </option>
            ))}
          </select>
          <button className="btn btn-success mt-3" type="submit" disabled={!selectedId}>
            Continue
          </button>
        </form>
      )}

      {showCreate && (
        <section className="mt-4">
          <p>Requester ID: <strong>{selectedId}</strong></p>
          {ticketNumber ? <p className="alert alert-success" role="status">Ticket created: <strong>{ticketNumber}</strong></p> : null}
          {formError ? <p className="alert alert-danger" role="alert">{formError}</p> : null}
          <form onSubmit={handleCreate}>
            <label className="form-label" htmlFor="category">Category *</label>
            <select className="form-select" id="category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required>
              <option value="">Select a category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <label className="form-label mt-3" htmlFor="system">Related System *</label>
            <select className="form-select" id="system" value={form.relatedSystemId} onChange={(event) => setForm({ ...form, relatedSystemId: event.target.value })} required>
              <option value="">Select a system</option>
              {systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
            </select>
            <label className="form-label mt-3" htmlFor="priority">Requested Priority *</label>
            <select className="form-select" id="priority" value={form.requestedPriority} onChange={(event) => setForm({ ...form, requestedPriority: event.target.value as "LOW" | "MEDIUM" | "HIGH" })}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
            </select>
            <label className="form-label mt-3" htmlFor="summary">Summary *</label>
            <input className="form-control" id="summary" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} required minLength={5} maxLength={120} />
            <label className="form-label mt-3" htmlFor="description">Description *</label>
            <textarea className="form-control" id="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required minLength={10} maxLength={5000} rows={6} />
            <button className="btn btn-success mt-3" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Ticket"}</button>
          </form>
        </section>
      )}

      {showCreate && !showTickets && (
        <button className="btn btn-outline-success mt-3" type="button" onClick={openTickets}>My Tickets</button>
      )}

      {showTickets && (
        <section className="mt-4">
          <h2 className="h4">My Tickets</h2>
          <div className="row g-2">
            <div className="col-md-5"><label className="form-label" htmlFor="ticket-search">Search</label><input className="form-control" id="ticket-search" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="ticket-category">Category</label><select className="form-select" id="ticket-category" value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}><option value="">All</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="col-md-3"><label className="form-label" htmlFor="ticket-priority">Priority</label><select className="form-select" id="ticket-priority" value={filterPriority} onChange={(event) => setFilterPriority(event.target.value)}><option value="">All</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
            <div className="col-md-2"><label className="form-label" htmlFor="ticket-sort">Sort</label><select className="form-select" id="ticket-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="createdAt">Created date</option><option value="updatedAt">Last updated</option><option value="ticketNumber">Ticket number</option><option value="summary">Summary</option></select></div>
            <div className="col-md-2"><label className="form-label" htmlFor="ticket-sort-order">Order</label><select className="form-select" id="ticket-sort-order" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></div>
            <div className="col-md-1 d-flex align-items-end"><button className="btn btn-success" type="button" onClick={() => void loadTickets(1)}>Find</button></div>
          </div>
          {ticketLoading && <p role="status" className="mt-3">Loading tickets...</p>}
          {ticketError && <p role="alert" className="alert alert-danger mt-3">{ticketError}</p>}
          {!ticketLoading && !ticketError && tickets && tickets.items.length === 0 && <p className="alert alert-info mt-3">{search || filterCategory || filterPriority ? "No tickets match your search." : "You have no tickets yet."}</p>}
          {!ticketLoading && tickets && tickets.items.length > 0 && <div className="table-responsive mt-3"><table className="table"><thead><tr><th>Ticket Number</th><th>Summary</th><th>Category</th><th>Priority</th><th>Status</th></tr></thead><tbody>{tickets.items.map((ticket) => <tr key={ticket.id}><td><button className="btn btn-link p-0" type="button" onClick={() => void openDetail(ticket.id)}>{ticket.ticketNumber}</button></td><td>{ticket.summary}</td><td>{ticket.category.name}</td><td>{ticket.requestedPriority}</td><td>{ticket.currentStatus}</td></tr>)}</tbody></table></div>}
          {tickets && tickets.pagination.totalPages > 1 && <div className="d-flex gap-2"><button className="btn btn-outline-secondary" type="button" disabled={ticketPage <= 1} onClick={() => void loadTickets(ticketPage - 1)}>Previous</button><span className="align-self-center">Page {ticketPage} of {tickets.pagination.totalPages}</span><button className="btn btn-outline-secondary" type="button" disabled={ticketPage >= tickets.pagination.totalPages} onClick={() => void loadTickets(ticketPage + 1)}>Next</button></div>}
        </section>
      )}

      {detailError && <p className="alert alert-danger mt-3" role="alert">{detailError}</p>}
      {detail && (
        <section className="mt-4" aria-label="Ticket Detail">
          <h2 className="h4">Ticket Detail</h2>
          <dl>
            <dt>Ticket Number</dt><dd>{detail.ticketNumber}</dd>
            <dt>Ticket Date</dt><dd>{new Date(detail.ticketDate).toLocaleString()}</dd>
            <dt>Requester</dt><dd>{detail.requester.name}</dd>
            <dt>Category</dt><dd>{detail.category.name}</dd>
            <dt>Related System</dt><dd>{detail.relatedSystem.name}</dd>
            <dt>Requested Priority</dt><dd>{detail.requestedPriority}</dd>
            <dt>Current Status</dt><dd>{detail.currentStatus}</dd>
            <dt>Summary</dt><dd>{detail.summary}</dd>
            <dt>Description</dt><dd>{detail.description}</dd>
          </dl>
          <p>Attachments will be available in the next Lab 2 increment.</p>
        </section>
      )}

      {state === "empty" && (
        <p className="alert alert-warning mt-4" role="status">
          No active development requesters are available.
        </p>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-4" role="alert">
          <p className="mb-2">{errorMessage}</p>
          <button className="btn btn-outline-danger" type="button" onClick={() => void loadRequesters()}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
