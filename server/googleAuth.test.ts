import { describe, expect, it } from "vitest";
import { getGoogleOAuthConfig, getGoogleRedirectUri } from "./googleAuth";

describe("konfigurasi Google OAuth", () => {
  it("hanya siap saat client ID dan client secret tersedia", () => {
    const previousId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const previousSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID; delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(getGoogleOAuthConfig()).toBeNull();
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client"; process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    expect(getGoogleOAuthConfig()).toEqual({ clientId: "client", clientSecret: "secret" });
    if (previousId) process.env.GOOGLE_OAUTH_CLIENT_ID = previousId; else delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (previousSecret) process.env.GOOGLE_OAUTH_CLIENT_SECRET = previousSecret; else delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  });

  it("menghasilkan callback HTTPS dari header proxy produksi", () => {
    const request = { protocol: "http", get: (header: string) => header === "x-forwarded-proto" ? "https" : header === "host" ? "jajananku.lol" : undefined } as unknown as import("express").Request;
    expect(getGoogleRedirectUri(request)).toBe("https://jajananku.lol/api/auth/google/callback");
  });

  it("menyatukan alias www ke callback produksi utama", () => {
    const request = { protocol: "https", get: (header: string) => header === "host" ? "www.jajananku.lol" : undefined } as unknown as import("express").Request;
    expect(getGoogleRedirectUri(request)).toBe("https://jajananku.lol/api/auth/google/callback");
  });

  it("tidak pernah memakai host Cloud Run internal pada runtime produksi", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const request = { protocol: "https", get: (header: string) => header === "host" ? "iezoxdstfi-2lk2eqrtmq-uk.a.run.app" : undefined } as unknown as import("express").Request;
    expect(getGoogleRedirectUri(request)).toBe("https://jajananku.lol/api/auth/google/callback");
    process.env.NODE_ENV = previous;
  });

  it("menangani host Cloud Run internal walaupun NODE_ENV tidak diteruskan", () => {
    const previous = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const request = { protocol: "https", get: (header: string) => header === "host" ? "iezoxdstfi-2lk2eqrtmq-uk.a.run.app" : undefined } as unknown as import("express").Request;
    expect(getGoogleRedirectUri(request)).toBe("https://jajananku.lol/api/auth/google/callback");
    process.env.NODE_ENV = previous;
  });
});
