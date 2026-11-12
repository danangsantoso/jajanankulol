import { describe, expect, it } from "vitest";
import { resolveGoogleEmailIdentity } from "./accountIdentity";

describe("identitas akun berbasis email", () => {
  it("mempertahankan akun Superadmin ketika email Google yang sama masuk", () => {
    expect(resolveGoogleEmailIdentity({ id: 1, email: "danang@example.com", openId: "legacy-superadmin", role: "superadmin", googleSubject: null }, "google-subject")).toEqual({ action: "reuse", userId: 1, openId: "legacy-superadmin", role: "superadmin" });
  });

  it("menolak email yang telah ditautkan pada subjek Google berbeda", () => {
    expect(() => resolveGoogleEmailIdentity({ id: 4, email: "same@example.com", openId: "google-old", role: "admin", googleSubject: "old-subject" }, "new-subject")).toThrow("Email ini sudah terhubung");
  });
});
