import { describe, expect, it } from "vitest";
import { getGoogleOAuthConfig } from "./googleAuth";

describe("kredensial Google OAuth", () => {
  it("diterima oleh endpoint token Google sebelum alur masuk diaktifkan", async () => {
    const config = getGoogleOAuthConfig();
    expect(config).not.toBeNull();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config!.clientId, client_secret: config!.clientSecret, grant_type: "refresh_token", refresh_token: "invalid-validation-token" }),
    });
    const payload = await response.json() as { error?: string };
    if (payload.error === "invalid_client") throw new Error("Kredensial Google OAuth ditolak oleh Google.");
    expect(response.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
  }, 15_000);
});
