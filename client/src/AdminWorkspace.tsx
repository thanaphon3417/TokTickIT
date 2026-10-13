import { useState } from "react";
import AdminUsers from "./AdminUsers.js";
import StaffDashboard from "./StaffDashboard.js";
import StaffQueue from "./StaffQueue.js";
import { StaffQueueQuery } from "./api.js";

export default function AdminWorkspace({ adminName, onLogout }: { adminName: string; onLogout: () => void }) {
  const [view, setView] = useState<"users" | "dashboard" | "queue">("users");
  const [queueQuery, setQueueQuery] = useState<StaffQueueQuery>({});
  const [ticketId, setTicketId] = useState<number | undefined>();
  const [actionId, setActionId] = useState<number | undefined>();
  if (view === "dashboard") return <StaffDashboard staffName={adminName} isAdministrator onLogout={onLogout} onManageUsers={() => setView("users")} onOpenQueue={(query) => { setQueueQuery(query); setTicketId(undefined); setActionId(undefined); setView("queue"); }} onOpenTicket={(id) => { setQueueQuery({}); setTicketId(id); setActionId(undefined); setView("queue"); }} onOpenAction={(id, selectedActionId) => { setQueueQuery({}); setTicketId(id); setActionId(selectedActionId); setView("queue"); }} />;
  if (view === "queue") return <StaffQueue staffName={adminName} onLogout={onLogout} isAdministrator onManageUsers={() => setView("users")} onDashboard={() => setView("dashboard")} initialQuery={queueQuery} initialTicketId={ticketId} initialActionId={actionId} />;
  return <AdminUsers adminName={adminName} onLogout={onLogout} onOpenQueue={() => { setQueueQuery({}); setTicketId(undefined); setView("queue"); }} onOpenDashboard={() => setView("dashboard")} />;
}
