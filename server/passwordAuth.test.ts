import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordAuth";

describe("kata sandi akun", () => {
  it("memverifikasi kata sandi yang benar tanpa menyimpannya sebagai teks biasa", () => {
    const hash = hashPassword("AdminBaru123!");
    expect(hash).not.toContain("AdminBaru123!");
    expect(verifyPassword("AdminBaru123!", hash)).toBe(true);
    expect(verifyPassword("salah", hash)).toBe(false);
  });
});
