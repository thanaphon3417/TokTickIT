import { describe, expect, it } from "vitest";
import { requesterAgent } from "../lab-03/requester-test-helper.js";

async function createOwnedTicket() {
  const agent = await requesterAgent();
  const response = await agent.post("/api/tickets").send({ requesterId: 999, categoryId: 1, relatedSystemId: 1, summary: "Attachment test ticket", description: "This ticket is used to test attachment lifecycle behavior.", requestedPriority: "MEDIUM" });
  expect(response.status).toBe(201);
  return { agent, ticketId: response.body.id as number };
}

describe("Attachment lifecycle", () => {
  it("uploads, downloads, lists, and soft-removes an owned attachment", async () => {
    const { agent, ticketId } = await createOwnedTicket();
    const upload = await agent.post(`/api/tickets/${ticketId}/attachments?requesterId=999`).attach("file", Buffer.from("sample pdf content"), { filename: "evidence.pdf", contentType: "application/pdf" });
    expect(upload.status).toBe(201);
    expect((await agent.get(`/api/attachments/${upload.body.id}/download?requesterId=999`)).status).toBe(200);
    await agent.delete(`/api/attachments/${upload.body.id}?requesterId=999`).send({ removalReason: "Wrong evidence file" }).expect(200);
    expect((await agent.get(`/api/tickets/${ticketId}/attachments?requesterId=999`)).body[0].removedAt).toBeTruthy();
    expect((await agent.get(`/api/attachments/${upload.body.id}/download?requesterId=999`)).status).toBe(404);
  });

  it("rejects unsupported, oversized, and sixth active files", async () => {
    const { agent, ticketId } = await createOwnedTicket();
    expect((await agent.post(`/api/tickets/${ticketId}/attachments`).attach("file", Buffer.from("not allowed"), { filename: "script.exe", contentType: "application/octet-stream" })).status).toBe(400);
    expect((await agent.post(`/api/tickets/${ticketId}/attachments`).attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "large.pdf", contentType: "application/pdf" })).status).toBe(413);
    for (let index = 0; index < 5; index += 1) expect((await agent.post(`/api/tickets/${ticketId}/attachments`).attach("file", Buffer.from(`file ${index}`), { filename: `evidence-${index}.pdf`, contentType: "application/pdf" })).status).toBe(201);
    expect((await agent.post(`/api/tickets/${ticketId}/attachments`).attach("file", Buffer.from("sixth"), { filename: "sixth.pdf", contentType: "application/pdf" })).status).toBe(409);
  });

  it("hides attachment operations from another authenticated requester", async () => {
    const { agent, ticketId } = await createOwnedTicket();
    const upload = await agent.post(`/api/tickets/${ticketId}/attachments`).attach("file", Buffer.from("private"), { filename: "private.pdf", contentType: "application/pdf" });
    const other = await requesterAgent("ben.carter@example.com");
    expect((await other.get(`/api/tickets/${ticketId}/attachments?requesterId=1`)).status).toBe(404);
    expect((await other.get(`/api/attachments/${upload.body.id}/download?requesterId=1`)).status).toBe(404);
    expect((await other.delete(`/api/attachments/${upload.body.id}?requesterId=1`).send({ removalReason: "Not my file" })).status).toBe(404);
  });
});
