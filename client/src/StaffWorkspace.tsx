import { useState } from "react";
import StaffDashboard from "./StaffDashboard.js";
import StaffQueue from "./StaffQueue.js";
import { StaffQueueQuery } from "./api.js";

export default function StaffWorkspace({ staffName, onLogout, isAdministrator = false, onManageUsers }: { staffName: string; onLogout: () => void; isAdministrator?: boolean; onManageUsers?: () => void }) {
  const [view, setView] = useState<"dashboard" | "queue">("dashboard");
  const [queueQuery, setQueueQuery] = useState<StaffQueueQuery>({});
  const [ticketId, setTicketId] = useState<number | undefined>();
  const [actionId, setActionId] = useState<number | undefined>();
  if (view === "queue") return <StaffQueue staffName={staffName} onLogout={onLogout} isAdministrator={isAdministrator} onManageUsers={onManageUsers} onDashboard={() => setView("dashboard")} initialQuery={queueQuery} initialTicketId={ticketId} initialActionId={actionId} />;
  return <StaffDashboard staffName={staffName} onLogout={onLogout} isAdministrator={isAdministrator} onManageUsers={onManageUsers} onOpenQueue={(query) => { setTicketId(undefined); setActionId(undefined); setQueueQuery(query); setView("queue"); }} onOpenTicket={(id) => { setTicketId(id); setActionId(undefined); setQueueQuery({}); setView("queue"); }} onOpenAction={(id, selectedActionId) => { setTicketId(id); setActionId(selectedActionId); setQueueQuery({}); setView("queue"); }} />;
}
