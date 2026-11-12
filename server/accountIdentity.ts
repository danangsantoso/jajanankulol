export type AccountIdentity = {
  id: number;
  email: string | null;
  openId: string;
  role: "cashier" | "admin" | "superadmin";
  googleSubject: string | null;
};

/** Returns the account to retain for a Google login, while protecting a different linked Google identity. */
export function resolveGoogleEmailIdentity(existingEmailAccount: AccountIdentity | undefined, subject: string) {
  if (!existingEmailAccount) return { action: "create" as const };
  if (existingEmailAccount.googleSubject && existingEmailAccount.googleSubject !== subject) {
    throw new Error("Email ini sudah terhubung ke akun Google lain.");
  }
  return { action: "reuse" as const, userId: existingEmailAccount.id, openId: existingEmailAccount.openId, role: existingEmailAccount.role };
}
