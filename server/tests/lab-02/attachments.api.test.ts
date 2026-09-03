import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

async function createOwnedTicket() {
  const response = await request(app).post("/api/tickets").send({
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    summary: "Attachment test ticket",
    description: "This ticket is used to test attachment lifecycle behavior.",
    requestedPriority: "MEDIUM",
  });
  expect(response.status).toBe(201);
  return response.body.id as number;
}

describe("Attachment lifecycle", () => {
  it("uploads, downloads, lists, and soft-removes an owned attachment", async () => {
    const ticketId = await createOwnedTicket();
    const upload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments?requesterId=1`)
      .attach("file", Buffer.from("sample pdf content"), { filename: "evidence.pdf", contentType: "application/pdf" });

    expect(upload.status).toBe(201);
    expect(upload.body.originalFilename).toBe("evidence.pdf");
    expect(upload.body.removedAt).toBeNull();

    const download = await request(app).get(`/api/attachments/${upload.body.id}/download?requesterId=1`);
    expect(download.status).toBe(200);
    expect(download.body.toString()).toBe("sample pdf content");

    const removed = await request(app)
      .delete(`/api/attachments/${upload.body.id}?requesterId=1`)
      .send({ removalReason: "Wrong evidence file" });
    expect(removed.status).toBe(200);
    expect(removed.body.removedAt).toBeTruthy();
    expect(removed.body.removalReason).toBe("Wrong evidence file");

    const metadata = await request(app).get(`/api/tickets/${ticketId}/attachments?requesterId=1`);
    expect(metadata.status).toBe(200);
    expect(metadata.body[0].originalFilename).toBe("evidence.pdf");
    expect(metadata.body[0].removedAt).toBeTruthy();

    const blocked = await request(app).get(`/api/attachments/${upload.body.id}/download?requesterId=1`);
    expect(blocked.status).toBe(404);
  });

  it("rejects unsupported files and cross-requester access", async () => {
    const ticketId = await createOwnedTicket();
    const invalid = await request(app)
      .post(`/api/tickets/${ticketId}/attachments?requesterId=1`)
      .attach("file", Buffer.from("not allowed"), { filename: "script.exe", contentType: "application/octet-stream" });
    expect(invalid.status).toBe(400);

    const oversized = await request(app)
      .post(`/api/tickets/${ticketId}/attachments?requesterId=1`)
      .attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "large.pdf", contentType: "application/pdf" });
    expect(oversized.status).toBe(413);

    for (let index = 0; index < 5; index += 1) {
      const upload = await request(app)
        .post(`/api/tickets/${ticketId}/attachments?requesterId=1`)
        .attach("file", Buffer.from(`file ${index}`), { filename: `evidence-${index}.pdf`, contentType: "application/pdf" });
      expect(upload.status).toBe(201);
    }

    const tooMany = await request(app)
      .post(`/api/tickets/${ticketId}/attachments?requesterId=1`)
      .attach("file", Buffer.from("sixth"), { filename: "sixth.pdf", contentType: "application/pdf" });
    expect(tooMany.status).toBe(409);

    const forbidden = await request(app).get(`/api/tickets/${ticketId}/attachments?requesterId=2`);
    expect(forbidden.status).toBe(404);
  });

  it("rejects an invalid removal reason and hides every attachment operation from another requester", async () => {
    const ticketId = await createOwnedTicket();
    const upload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments?requesterId=1`)
      .attach("file", Buffer.from("private"), { filename: "private.pdf", contentType: "application/pdf" });
    expect(upload.status).toBe(201);
    expect((await request(app).delete(`/api/attachments/${upload.body.id}?requesterId=1`).send({ removalReason: "x" })).status).toBe(400);
    expect((await request(app).post(`/api/tickets/${ticketId}/attachments?requesterId=2`).attach("file", Buffer.from("x"), { filename: "x.pdf", contentType: "application/pdf" })).status).toBe(404);
    expect((await request(app).get(`/api/attachments/${upload.body.id}/download?requesterId=2`)).status).toBe(404);
    expect((await request(app).delete(`/api/attachments/${upload.body.id}?requesterId=2`).send({ removalReason: "Not my file" })).status).toBe(404);
  });
});
