import { useEffect, useState } from "react";
import { createTicket, DevelopmentRequester, getActiveRequesters, getCategories, getSystems, ReferenceItem } from "./api.js";

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
