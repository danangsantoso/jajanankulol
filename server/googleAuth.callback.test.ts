import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertGoogleAdmin, getOnboardingProfile, createSessionToken } = vi.hoisted(() => ({ upsertGoogleAdmin: vi.fn(), getOnboardingProfile: vi.fn(), createSessionToken: vi.fn() }));
vi.mock("./db", () => ({ upsertGoogleAdmin, getOnboardingProfile }));
vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken } }));

import { registerGoogleAuthRoutes } from "./googleAuth";

type Handler = (req: any, res: any) => Promise<unknown> | unknown;

function captureCallback() {
  const handlers = new Map<string, Handler>();
  registerGoogleAuthRoutes({ get: (path: string, handler: Handler) => handlers.set(path, handler) } as any);
  return handlers.get("/api/auth/google/callback")!;
}

function callbackRequest() {
  return { protocol: "https", headers: { cookie: "jajananku_google_state=state-1" }, query: { state: "state-1", code: "google-code" }, get: (header: string) => header === "host" ? "jajananku.lol" : header === "x-forwarded-proto" ? "https" : undefined };
}

function callbackResponse() {
  return { cookie: vi.fn(), clearCookie: vi.fn(), redirect: vi.fn() };
}

describe("callback Google OAuth", () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    upsertGoogleAdmin.mockResolvedValue({ id: 44, openId: "google-subject", name: "Dina", email: "dina@example.com" });
    createSessionToken.mockResolvedValue("session-token");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sub: "subject", email: "dina@example.com", name: "Dina" }) }));
  });

  it("mengarah ke onboarding untuk akun Google baru", async () => {
    getOnboardingProfile.mockResolvedValue({ completed: false });
    const response = callbackResponse();
    await captureCallback()(callbackRequest(), response);
    expect(response.redirect).toHaveBeenCalledWith("/onboarding");
    expect(response.cookie).toHaveBeenCalled();
  });

  it("mengarah ke dashboard setelah onboarding telah lengkap", async () => {
    getOnboardingProfile.mockResolvedValue({ completed: true });
    const response = callbackResponse();
    await captureCallback()(callbackRequest(), response);
    expect(response.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
