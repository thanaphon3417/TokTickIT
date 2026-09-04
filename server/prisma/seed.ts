import { getPrisma } from "../src/prisma.js";

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

  console.log("Seeded TokTickIT categories, systems, and development requesters.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
