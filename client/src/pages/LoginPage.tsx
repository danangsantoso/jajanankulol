import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function GoogleMark({ className = "" }: { className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" focusable="false"><path fill="#4285F4" d="M21.35 11.1h-9.18v3.64h5.27c-.23 1.17-.91 2.16-1.94 2.83v2.36h3.13c1.83-1.69 2.9-4.18 2.9-7.11 0-.68-.06-1.34-.18-1.98Z" /><path fill="#34A853" d="M12.17 20.64c2.63 0 4.84-.87 6.45-2.36l-3.13-2.36c-.87.58-1.98.92-3.32.92-2.55 0-4.71-1.72-5.48-4.03H3.46v2.44a9.75 9.75 0 0 0 8.71 5.39Z" /><path fill="#FBBC05" d="M6.69 12.81a5.86 5.86 0 0 1 0-3.74V6.63H3.46a9.74 9.74 0 0 0 0 8.62l3.23-2.44Z" /><path fill="#EA4335" d="M12.17 5.05c1.43 0 2.72.49 3.73 1.45l2.8-2.8C17 2.1 14.8 1.1 12.17 1.1a9.75 9.75 0 0 0-8.71 5.53l3.23 2.44c.77-2.31 2.93-4.02 5.48-4.02Z" /></svg>;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user, loading } = useAuth();
  const workspace = trpc.workspace.current.useQuery(undefined, { enabled: !!user && user.role === "admin", retry: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const googleNotice = useMemo(() => new URLSearchParams(window.location.search).get("google"), []);
  const login = trpc.auth.loginPassword.useMutation({
    onSuccess: async data => {
      utils.auth.me.setData(undefined, data.user);
      await utils.auth.me.invalidate();
      await utils.workspace.current.invalidate();
      toast.success("Login berhasil. Selamat datang di Jajananku.");
      setLocation(data.redirectPath);
    },
    onError: error => toast.error(error.message || "Email atau kata sandi tidak sesuai."),
  });

  useEffect(() => {
    if (loading || !user) return;
    if (user.passwordChangeRequired === "yes") {
      setLocation("/ganti-password");
      return;
    }
    if (user.role === "admin" && workspace.isLoading) return;
    if (user.role === "superadmin") setLocation("/superadmin");
    else if (user.role === "cashier") setLocation("/pos");
    else if (workspace.data?.onboardingStatus === "pending") setLocation("/onboarding");
    else setLocation("/dashboard");
  }, [loading, setLocation, user, workspace.data?.onboardingStatus, workspace.isLoading]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  if (loading || user) return <main className="grid min-h-screen place-items-center bg-[#f7fffd] text-[#0c796e]"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin" /><p className="mt-3 text-sm font-bold">Membuka ruang kerja Anda…</p></div></main>;

  return (
    <main className="min-h-screen bg-[#f7fffd] px-5 py-6 text-[#103d37] md:grid md:place-items-center md:p-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_90px_rgba(12,121,110,.16)] md:grid-cols-[.92fr_1.08fr]">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#57d6c9] via-[#21bdb2] to-[#0d847a] p-7 text-white md:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#f7c334]/25 blur-2xl" />
          <button className="relative inline-flex items-center gap-2 text-sm font-bold text-white/90 hover:text-white" onClick={() => setLocation("/")}> 
            <ArrowLeft className="h-4 w-4" /> Kembali ke landing page
          </button>
          <div className="relative mt-14">
            <img src="/manus-storage/jajananku-logo_5fd59c99.png" className="h-20 w-20 rounded-3xl shadow-xl" />
            <p className="mt-8 text-xs font-extrabold uppercase tracking-[.18em] text-white/75">Akses operasional</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight md:text-5xl">Satu pintu untuk usaha yang terus tumbuh.</h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">Daftar dengan Google untuk mendapatkan ruang usaha, masa coba gratis tiga hari, dan kendali operasional multi-cabang.</p>
          </div>
        </section>
        <section className="p-7 md:p-12">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#0c796e]">Masuk ke Jajananku</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold">Selamat datang kembali.</h2>
            <p className="mt-2 text-sm leading-6 text-[#638079]">Gunakan akun yang telah diaktifkan oleh pengelola, atau lanjutkan dengan Google untuk pendaftaran baru.</p>
          </div>
          {googleNotice === "setup" && <p className="mt-5 rounded-2xl bg-[#fff5d9] p-3 text-sm text-[#8a6100]">Masuk Google sedang disiapkan. Hubungi pengelola bila tombol belum dapat digunakan.</p>}
          {googleNotice === "failed" && <p className="mt-5 rounded-2xl bg-[#fee9e8] p-3 text-sm text-[#a43831]">Masuk Google tidak berhasil. Silakan coba lagi atau gunakan akun yang sudah diaktifkan.</p>}
          <Button type="button" className="mt-7 h-12 w-full rounded-2xl bg-white text-[#103d37] shadow-sm ring-1 ring-[#dceeea] hover:bg-[#f6fffd]" onClick={() => { window.location.href = "/api/auth/google/start"; }}>
            <GoogleMark className="mr-3 h-5 w-5 shrink-0" />Lanjutkan dengan Google
          </Button>
          <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-[#dceeea]" /><span className="text-xs font-bold uppercase tracking-[.14em] text-[#7d9892]">atau</span><div className="h-px flex-1 bg-[#dceeea]" /></div>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@usaha.com" autoComplete="email" required /></div>
            <div className="space-y-2"><Label htmlFor="password">Kata sandi</Label><Input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan kata sandi" autoComplete="current-password" required /></div>
            <Button className="h-12 w-full rounded-2xl bg-[#0c796e] font-extrabold hover:bg-[#09645c]" disabled={login.isPending}>{login.isPending ? "Memeriksa akses…" : <><KeyRound className="mr-2 h-4 w-4" />Masuk ke aplikasi</>}</Button>
          </form>
          <div className="mt-8 rounded-2xl border border-[#dceeea] bg-[#fbfffe] p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0c796e]" /><p className="text-sm leading-6 text-[#58736d]">Akun yang belum memiliki paket aktif akan menerima pemberitahuan untuk menghubungi admin atau memilih paket langganan.</p></div></div>
        </section>
      </div>
    </main>
  );
}
