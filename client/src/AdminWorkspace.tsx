import { useState } from "react";
import AdminUsers from "./AdminUsers.js";
import StaffQueue from "./StaffQueue.js";

export default function AdminWorkspace({ adminName, onLogout }: { adminName: string; onLogout: () => void }) {
  const [view, setView] = useState<"users" | "queue">("users");
  if (view === "queue") return <StaffQueue staffName={adminName} onLogout={onLogout} isAdministrator onManageUsers={() => setView("users")} />;
  return <AdminUsers adminName={adminName} onLogout={onLogout} onOpenQueue={() => setView("queue")} />;
}
