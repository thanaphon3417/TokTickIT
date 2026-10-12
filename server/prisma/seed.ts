import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/auth.js";

// Issue 3 — seed the four supported categories.
// The four names are: Account and Access, Hardware, Software, Network.
// Requirement: running the seed twice must NOT create duplicates.
// Hint: prisma.category.upsert({ where:{name}, update:{}, create:{name} }).
// TODO(Issue 3): upsert each category so the seed is idempotent.
async function main() {
  const prisma = getPrisma();
  const categoryNames = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const requesters = [
    { name: "Amina Lee", email: "amina.lee@example.com", isActive: true },
    { name: "Ben Carter", email: "ben.carter@example.com", isActive: true },
    { name: "Chalida Wong", email: "chalida.wong@example.com", isActive: true },
    { name: "Daniel Kim", email: "daniel.kim@example.com", isActive: true },
    { name: "Inactive Requester", email: "inactive@example.com", isActive: false },
  ];

  for (const requester of requesters) {
    await prisma.developmentRequester.upsert({
      where: { email: requester.email },
      update: requester,
      create: requester,
    });
  }

  const systems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of systems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const initialPasswordHash = await hashPassword("InitialPass123!");
  const users = [
    ...requesters.map((requester) => ({ ...requester, email: requester.email.toLowerCase(), role: "REQUESTER" as const, mustChangePassword: true })),
    { name: "Iris Staff", email: "iris.staff@toktickit.local", isActive: true, role: "IT_STAFF" as const, mustChangePassword: true },
    { name: "Noah Staff", email: "noah.staff@toktickit.local", isActive: true, role: "IT_STAFF" as const, mustChangePassword: true },
    { name: "Avery Admin", email: "avery.admin@toktickit.local", isActive: true, role: "ADMINISTRATOR" as const, mustChangePassword: false },
  ];

  for (const user of users) {
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: user.isActive, passwordHash: initialPasswordHash, mustChangePassword: user.mustChangePassword },
      create: { ...user, passwordHash: initialPasswordHash },
    });
    if (user.role === "REQUESTER") await prisma.developmentRequester.update({ where: { email: user.email }, data: { userId: savedUser.id } });
  }

  const [amina, ben, iris, noah, hardware, network, software, laptop, vpn, email] = await Promise.all([
    prisma.developmentRequester.findUniqueOrThrow({ where: { email: "amina.lee@example.com" } }),
    prisma.developmentRequester.findUniqueOrThrow({ where: { email: "ben.carter@example.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "iris.staff@toktickit.local" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "noah.staff@toktickit.local" } }),
    prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } }),
    prisma.category.findUniqueOrThrow({ where: { name: "Network" } }),
    prisma.category.findUniqueOrThrow({ where: { name: "Software" } }),
    prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" } }),
    prisma.relatedSystem.findUniqueOrThrow({ where: { name: "VPN" } }),
    prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Email" } }),
  ]);

  const demoTickets = [
    { ticketNumber: "TKT-2026-900001", requesterId: amina.id, categoryId: hardware.id, relatedSystemId: laptop.id, summary: "Laptop battery drains quickly", description: "My laptop battery drains much faster than usual even when the system is idle.", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const, currentStatus: "IN_PROGRESS" as const, ownerId: iris.id },
    { ticketNumber: "TKT-2026-900002", requesterId: ben.id, categoryId: network.id, relatedSystemId: vpn.id, summary: "VPN access is unavailable", description: "I cannot connect to the campus VPN from my approved device.", requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, currentStatus: "OPEN" as const, ownerId: null },
    { ticketNumber: "TKT-2026-900003", requesterId: amina.id, categoryId: software.id, relatedSystemId: email.id, summary: "Email sync delay", description: "New messages are taking a long time to appear in my mailbox.", requestedPriority: "LOW" as const, itPriority: "LOW" as const, currentStatus: "NEW" as const, ownerId: null },
  ];
  const savedTickets = [];
  for (const ticket of demoTickets) savedTickets.push(await prisma.ticket.upsert({ where: { ticketNumber: ticket.ticketNumber }, update: ticket, create: ticket }));

  const demoActions = [
    { ticketId: savedTickets[0].id, actionDateTime: new Date("2026-10-11T09:00:00.000Z"), description: "Inspected battery health report", result: "Battery health is below expected capacity.", performedById: iris.id, assigneeId: noah.id, followUpRequired: true, followUpNote: "Confirm replacement availability", attachmentNotes: null, status: "IN_PROGRESS" as const, idempotencyKey: "seed-lab4-action-900001-a" },
    { ticketId: savedTickets[1].id, actionDateTime: new Date("2026-10-10T12:00:00.000Z"), description: "Reviewed VPN connection logs", result: "", performedById: iris.id, assigneeId: iris.id, followUpRequired: false, followUpNote: null, attachmentNotes: "Log bundle reviewed", status: "COMPLETED" as const, idempotencyKey: "seed-lab4-action-900002-a" },
    { ticketId: savedTickets[1].id, actionDateTime: new Date("2026-10-11T12:00:00.000Z"), description: "Checked VPN gateway route", result: null, performedById: iris.id, assigneeId: noah.id, followUpRequired: false, followUpNote: null, attachmentNotes: null, status: "PLANNED" as const, idempotencyKey: "seed-lab4-action-900002-b" },
  ];
  for (const action of demoActions) await prisma.ticketAction.upsert({ where: { performedById_idempotencyKey: { performedById: action.performedById, idempotencyKey: action.idempotencyKey } }, update: action, create: action });

  console.log("Seeded TokTickIT reference data, demo users, staff queue tickets, and representative actions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
