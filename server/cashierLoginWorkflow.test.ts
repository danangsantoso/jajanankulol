import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "./passwordAuth";

const { createSessionToken } = vi.hoisted(() => ({ createSessionToken: vi.fn().mockResolvedValue("session-token") }));
vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken } }));

import { passwordAccountRepository } from "./db";
import { appRouter } from "./routers";

describe("login kasir dengan kata sandi buatan admin", () => {
  afterEach(() => vi.restoreAllMocks());

  it("menjalankan autentikasi nyata: berhasil dengan password benar dan gagal dengan password salah", async () => {
    const password = "KasirAman123";
    const account = { id: 50, openId: "cashier_test", name: "Rina", email: "rina@toko.id", role: "cashier" as const, status: "active" as const, loginMethod: "tenant_password" as const, passwordHash: hashPassword(password), passwordUpdatedAt: new Date(), passwordChangeRequired: "no" as const, activeBranchId: 10, lastSignedIn: null, createdAt: new Date(), updatedAt: new Date() };
    vi.spyOn(passwordAccountRepository, "findByEmail").mockImplementation(async email => email === account.email ? account : undefined);
    const recordSignIn = vi.spyOn(passwordAccountRepository, "recordSignIn").mockResolvedValue();
    const cookie = vi.fn();
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {}, get: () => "jajananku.lol" }, res: { cookie, clearCookie: vi.fn() } } as any);

    const success = await caller.auth.loginPassword({ email: account.email, password });
    expect(success).toMatchObject({ redirectPath: "/pos", user: { role: "cashier" } });
    expect(recordSignIn).toHaveBeenCalledWith(account.id);
    expect(cookie).toHaveBeenCalled();

    await expect(caller.auth.loginPassword({ email: account.email, password: "PasswordSalah" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(recordSignIn).toHaveBeenCalledTimes(1);
  });

  it("menolak kredensial lama yang tidak terdaftar dan tidak membuat sesi", async () => {
    vi.spyOn(passwordAccountRepository, "findByEmail").mockResolvedValue(undefined);
    const cookie = vi.fn();
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {}, get: () => "jajananku.lol" }, res: { cookie, clearCookie: vi.fn() } } as any);

    await expect(caller.auth.loginPassword({ email: "legacy@example.test", password: "NotARealPassword123" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(cookie).not.toHaveBeenCalled();
  });

  it("mengarahkan akun dengan kata sandi awal ke halaman wajib ganti kata sandi", async () => {
    const password = "AdminAwal123";
    const account = { id: 51, openId: "tenant_admin_test", name: "Dina", email: "dina@toko.id", role: "admin" as const, status: "active" as const, loginMethod: "tenant_password" as const, passwordHash: hashPassword(password), passwordUpdatedAt: new Date(), passwordChangeRequired: "yes" as const, activeBranchId: 10, lastSignedIn: null, createdAt: new Date(), updatedAt: new Date() };
    vi.spyOn(passwordAccountRepository, "findByEmail").mockResolvedValue(account);
    vi.spyOn(passwordAccountRepository, "recordSignIn").mockResolvedValue();
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {}, get: () => "jajananku.lol" }, res: { cookie: vi.fn(), clearCookie: vi.fn() } } as any);
    await expect(caller.auth.loginPassword({ email: account.email, password })).resolves.toMatchObject({ redirectPath: "/ganti-password", user: { passwordChangeRequired: "yes" } });
  });
});
