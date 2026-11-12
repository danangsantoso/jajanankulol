import express, { Express } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));
vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import { sdk } from "./_core/sdk";
import { registerPaymentProofRoutes } from "./paymentProofUpload";
import { storagePut } from "./storage";

function createApp(maxFileSize = 5) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  registerPaymentProofRoutes(app, maxFileSize);
  return app;
}

async function postProof(app: Express, dataUrl: unknown) {
  const server = await new Promise<ReturnType<Express["listen"]>>(resolve => {
    const started = app.listen(0, () => resolve(started));
  });
  const port = (server.address() as { port: number }).port;
  try {
    return await fetch(`http://127.0.0.1:${port}/api/payment-proofs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("endpoint unggah bukti QRIS", () => {
  afterEach(() => vi.resetAllMocks());

  it("menolak akses tanpa autentikasi", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValue(new Error("unauthorized"));
    const response = await postProof(createApp(), "data:image/png;base64,aQ==");
    expect(response.status).toBe(401);
  });

  it("menolak format foto salah dan ukuran melebihi batas", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 2, role: "cashier" } as never);
    const invalidFormat = await postProof(createApp(), "data:application/pdf;base64,aQ==");
    expect(invalidFormat.status).toBe(400);
    const overLimit = await postProof(createApp(3), "data:image/png;base64,MTIzNA==");
    expect(overLimit.status).toBe(400);
  });

  it("menyimpan foto valid dan mengembalikan referensi berkas", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 2, role: "cashier" } as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "payment-proofs/2/bukti.png", url: "/manus-storage/bukti.png" });
    const response = await postProof(createApp(), "data:image/png;base64,aQ==");
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ key: "payment-proofs/2/bukti.png", url: "/manus-storage/bukti.png", mimeType: "image/png" });
  });
});
