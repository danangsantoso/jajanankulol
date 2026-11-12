import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ChangePasswordPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const changePassword = trpc.auth.changeRequiredPassword.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await utils.workspace.current.invalidate();
      toast.success("Kata sandi berhasil diperbarui. Selamat datang di Jajananku.");
      setLocation(user?.role === "superadmin" ? "/superadmin" : user?.role === "cashier" ? "/pos" : "/dashboard");
    },
    onError: error => toast.error(error.message || "Kata sandi belum dapat diperbarui."),
  });

  useEffect(() => {
    if (loading) return;
    if (!user) setLocation("/login");
    else if (user.passwordChangeRequired !== "yes") setLocation(user.role === "superadmin" ? "/superadmin" : user.role === "cashier" ? "/pos" : "/dashboard");
  }, [loading, setLocation, user]);

  if (loading || !user) return <main className="grid min-h-screen place-items-center bg-[#f7fffd] text-[#0c796e]"><Loader2 className="h-7 w-7 animate-spin" /></main>;
  if (user.passwordChangeRequired !== "yes") return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) return toast.error("Kata sandi baru minimal 8 karakter.");
    if (newPassword !== confirmation) return toast.error("Konfirmasi kata sandi belum sama.");
    if (newPassword === currentPassword) return toast.error("Gunakan kata sandi baru yang berbeda dari kata sandi awal.");
    changePassword.mutate({ currentPassword, newPassword });
  };

  return <main className="grid min-h-screen place-items-center bg-[#f7fffd] p-5 text-[#103d37]"><section className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-[0_28px_90px_rgba(12,121,110,.16)] md:p-10"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e7fbf7] text-[#0c796e]"><KeyRound className="h-7 w-7" /></div><p className="mt-7 text-xs font-extrabold uppercase tracking-[.18em] text-[#0c796e]">Keamanan akun</p><h1 className="mt-2 font-display text-3xl font-extrabold">Ganti kata sandi awal Anda</h1><p className="mt-3 text-sm leading-6 text-[#638079]">Superadmin telah membuat akun Anda. Untuk keamanan, buat kata sandi pribadi sebelum mengakses aplikasi.</p><form className="mt-7 space-y-5" onSubmit={submit}><div className="space-y-2"><Label htmlFor="current-password">Kata sandi awal</Label><Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="new-password">Kata sandi baru</Label><Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="confirm-password">Konfirmasi kata sandi baru</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></div><Button className="h-12 w-full rounded-2xl bg-[#0c796e] font-extrabold hover:bg-[#09645c]" disabled={changePassword.isPending}>{changePassword.isPending ? "Menyimpan…" : "Simpan kata sandi baru"}</Button></form><div className="mt-6 flex gap-3 rounded-2xl bg-[#f2fbf9] p-4 text-sm leading-6 text-[#58736d]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0c796e]" />Kata sandi awal tidak dapat digunakan setelah proses ini selesai.</div></section></main>;
}
