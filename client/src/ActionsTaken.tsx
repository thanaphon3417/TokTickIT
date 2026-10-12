import { cloneElement, ReactElement, useEffect, useRef, useState } from "react";
import { createTicketAction, getStaffUsers, getTicketActions, StaffUser, TicketAction, TicketActionInput, updateTicketAction } from "./api.js";

const toLocalInput = (date = new Date()) => { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); };
const emptyForm = (): TicketActionInput => ({ actionDateTime: toLocalInput(), description: "", result: "", assigneeId: null, followUpRequired: false, followUpNote: "", attachmentNotes: "" });
const transitions: Record<TicketAction["status"], TicketAction["status"][]> = { PLANNED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
const pretty = (value: string) => value.replaceAll("_", " ");
type ApiFailure = Error & { fieldErrors?: Record<string, string>; currentVersion?: number; currentStatus?: string; statusCode?: number };

export default function ActionsTaken({ ticketId, canEdit, onActionsChange }: { ticketId: number; canEdit: boolean; onActionsChange?: (actions: TicketAction[]) => void }) {
  const [actions, setActions] = useState<TicketAction[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<TicketAction | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<TicketActionInput>(emptyForm());
  const [status, setStatus] = useState<TicketAction["status"]>("PLANNED");
  const idempotency = useRef<{ payload: string; key: string } | null>(null);

  async function reload() {
    setLoading(true); setError("");
    try { const next = await getTicketActions(ticketId); setActions(next); onActionsChange?.(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve ticket actions."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); if (canEdit) void getStaffUsers().then(setStaff).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to retrieve active staff.")); }, [ticketId, canEdit]);

  function beginCreate() { setEditing(null); setEditorOpen(true); setForm(emptyForm()); setStatus("PLANNED"); setFieldErrors({}); setError(""); setSuccess(""); idempotency.current = null; }
  function beginEdit(action: TicketAction) {
    setEditing(action); setEditorOpen(true); setForm({ actionDateTime: toLocalInput(new Date(action.actionDateTime)), description: action.description, result: action.result ?? "", assigneeId: action.assigneeId, followUpRequired: action.followUpRequired, followUpNote: action.followUpNote ?? "", attachmentNotes: action.attachmentNotes ?? "" });
    setStatus(action.status); setFieldErrors({}); setError(""); setSuccess("");
  }
  function cancel() { setEditing(null); setEditorOpen(false); setFieldErrors({}); setError(""); idempotency.current = null; }
  function setValue<K extends keyof TicketActionInput>(key: K, value: TicketActionInput[K]) { setForm((current) => ({ ...current, [key]: value })); setFieldErrors((current) => ({ ...current, [key]: "" })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    const validation: Record<string, string> = {};
    if (!form.actionDateTime || Number.isNaN(new Date(form.actionDateTime).getTime())) validation.actionDateTime = "Enter a valid action date and time.";
    if (!form.description.trim() || form.description.trim().length > 2000) validation.description = "Description is required and must be at most 2,000 characters.";
    if (form.result.length > 2000) validation.result = "Result must be at most 2,000 characters.";
    if (form.attachmentNotes.length > 1000) validation.attachmentNotes = "Attachment notes must be at most 1,000 characters.";
    if (form.followUpRequired && !form.followUpNote.trim()) validation.followUpNote = "Enter a follow-up note when follow-up is required.";
    if (form.followUpNote.length > 1000) validation.followUpNote = "Follow-up note must be at most 1,000 characters.";
    setFieldErrors(validation); if (Object.keys(validation).length) return;
    setSaving(true);
    const input = { ...form, actionDateTime: new Date(form.actionDateTime).toISOString(), description: form.description.trim(), result: form.result.trim(), followUpNote: form.followUpRequired ? form.followUpNote.trim() : "", attachmentNotes: form.attachmentNotes.trim() };
    try {
      if (editing) {
        const updated = await updateTicketAction(ticketId, editing.id, { ...input, expectedVersion: editing.version, status });
        const next = actions.map((action) => action.id === updated.id ? updated : action); setActions(next); onActionsChange?.(next); setSuccess("Action updated.");
      } else {
        const serialized = JSON.stringify(input);
        if (!idempotency.current || idempotency.current.payload !== serialized) idempotency.current = { payload: serialized, key: crypto.randomUUID() };
        const created = await createTicketAction(ticketId, input, idempotency.current.key);
        const next = [...actions, created].sort((a, b) => a.actionDateTime.localeCompare(b.actionDateTime) || a.id - b.id); setActions(next); onActionsChange?.(next); idempotency.current = null; setSuccess("Action added.");
      }
      setEditing(null); setEditorOpen(false); setFieldErrors({});
    } catch (cause) {
      const failure = cause as ApiFailure;
      setError(failure.currentVersion ? `${failure.message} Current server version: ${failure.currentVersion}${failure.currentStatus ? ` (${pretty(failure.currentStatus)}).` : "."} Your entries are preserved; review and reload before resolving the conflict.` : failure.message || "Unable to save action.");
      setFieldErrors(failure.fieldErrors ?? {});
    } finally { setSaving(false); }
  }

  return <section className="actions-panel" aria-labelledby="actions-heading">
    <div className="actions-panel__heading"><div><h2 id="actions-heading" className="h5">Actions Taken</h2><p className="text-secondary mb-0">Work recorded for this ticket.</p></div>{canEdit && !editorOpen && <button className="btn btn-success" type="button" onClick={beginCreate}>Add action</button>}</div>
    {loading && <p role="status" className="mt-3">Loading actions...</p>}
    {error && <p className="alert alert-danger mt-3" role="alert">{error} <button type="button" className="btn btn-outline-success ms-2" onClick={() => void reload()}>Reload actions</button></p>}
    {success && <p className="alert alert-success mt-3" role="status">{success}</p>}
    {!loading && !error && actions.length === 0 && <p className="alert alert-info mt-3">No actions have been recorded yet.</p>}
    {!loading && actions.length > 0 && <div className="actions-list">{actions.map((action) => <article className="actions-card" key={action.id}>
      <div className="actions-card__header"><h3 className="h6 mb-0">{pretty(action.status)}</h3><time dateTime={action.actionDateTime}>{new Date(action.actionDateTime).toLocaleString()}</time></div>
      <dl className="actions-card__grid"><div><dt>Description</dt><dd>{action.description}</dd></div><div><dt>Result</dt><dd>{action.result || "Not recorded"}</dd></div><div><dt>Performed by</dt><dd>{action.performedBy.name}</dd></div><div><dt>Assignee</dt><dd>{action.assignee?.name ?? "Unassigned"}</dd></div><div><dt>Follow-up</dt><dd>{action.followUpRequired ? `Required: ${action.followUpNote}` : "Not required"}</dd></div><div><dt>Attachment notes</dt><dd>{action.attachmentNotes || "None"}</dd></div></dl>
      {canEdit && !editorOpen && !editing && <button className="btn btn-outline-success mt-2" type="button" disabled={action.status === "COMPLETED" || action.status === "CANCELLED"} onClick={() => beginEdit(action)}>Edit action</button>}
    </article>)}</div>}
    {canEdit && editing && (editing.status === "COMPLETED" || editing.status === "CANCELLED") && <p className="alert alert-info mt-3">This action is {pretty(editing.status).toLowerCase()} and can no longer be edited.</p>}
    {canEdit && editorOpen && <form className="actions-editor" onSubmit={(event) => void submit(event)} noValidate>
      <h3 className="h6">{editing ? "Edit action" : "New action"}</h3>
      {editing && <p className="text-secondary">Action date/time and creator are read-only after creation. Version {editing.version}.</p>}
      <Field id="action-date" label="Action date and time" error={fieldErrors.actionDateTime}><input className="form-control" id="action-date" type="datetime-local" value={form.actionDateTime} disabled={Boolean(editing)} onChange={(event) => setValue("actionDateTime", event.target.value)} /></Field>
      <Field id="action-description" label="Description" error={fieldErrors.description}><textarea className="form-control" id="action-description" rows={3} maxLength={2000} value={form.description} onChange={(event) => setValue("description", event.target.value)} /></Field>
      <Field id="action-result" label="Result (optional)" error={fieldErrors.result}><textarea className="form-control" id="action-result" rows={2} maxLength={2000} value={form.result} onChange={(event) => setValue("result", event.target.value)} /></Field>
      <Field id="action-assignee" label="Assignee (optional)" error={fieldErrors.assigneeId}><select className="form-select" id="action-assignee" value={form.assigneeId ?? ""} onChange={(event) => setValue("assigneeId", event.target.value ? Number(event.target.value) : null)}><option value="">Unassigned</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
      <label className="actions-check"><input type="checkbox" checked={form.followUpRequired} onChange={(event) => { setValue("followUpRequired", event.target.checked); if (!event.target.checked) setValue("followUpNote", ""); }} /> Follow-up required</label>
      {form.followUpRequired && <Field id="action-follow-up" label="Follow-up note" error={fieldErrors.followUpNote}><textarea className="form-control" id="action-follow-up" rows={2} maxLength={1000} value={form.followUpNote} onChange={(event) => setValue("followUpNote", event.target.value)} /></Field>}
      <Field id="action-attachments" label="Attachment notes (optional)" error={fieldErrors.attachmentNotes}><textarea className="form-control" id="action-attachments" rows={2} maxLength={1000} value={form.attachmentNotes} onChange={(event) => setValue("attachmentNotes", event.target.value)} /></Field>
      {editing && editing.status !== "COMPLETED" && editing.status !== "CANCELLED" && <Field id="action-status" label="Status" error={fieldErrors.status}><select className="form-select" id="action-status" value={status} onChange={(event) => setStatus(event.target.value as TicketAction["status"])}>{[editing.status, ...transitions[editing.status]].map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></Field>}
      <div className="actions-editor__buttons"><button className="btn btn-success" type="submit" disabled={saving}>{saving ? "Saving..." : "Save action"}</button><button className="btn btn-outline-success" type="button" disabled={saving} onClick={cancel}>Cancel</button></div>
    </form>}
  </section>;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  const errorId = `${id}-error`;
  const control = cloneElement(children as ReactElement, { "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined });
  return <div className="actions-field"><label className="form-label" htmlFor={id}>{label}</label>{control}{error && <p className="text-danger mb-0" id={errorId}>{error}</p>}</div>;
}
