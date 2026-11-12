import { AppBrand } from "@/components/AppBrand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, Phone, Store } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = trpc.onboarding.profile.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ businessName: "", ownerName: "", whatsappNumber: "", address: "", description: "" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/login");
  }, [authLoading, isAuthenticated, setLocation]);
  useEffect(() => {
    if (!profile) return;
    if (profile.completed) {
      setLocation("/dashboard");
      return;
    }
    setForm({ businessName: profile.businessName, ownerName: profile.ownerName, whatsappNumber: profile.whatsappNumber, address: profile.address, description: profile.description });
  }, [profile, setLocation]);

  const complete = trpc.onboarding.complete.useMutation({
    onSuccess: async () => {
      await utils.workspace.current.invalidate();
      toast.success("Data usaha tersimpan. Masa coba 3 hari Anda telah aktif.");
      setLocation("/dashboard");
    },
    onError: error => toast.error(error.message),
  });

  if (authLoading || isLoading || !isAuthenticated) return <div className="min-h-screen grid place-items-center bg-[#f7fffd]"><Loader2 className="h-6 w-6 animate-spin text-[#008c7d]" /></div>;

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  return <main className="min-h-screen bg-[#f7fffd] px-4 py-7 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex justify-center sm:justify-start"><AppBrand /></header>
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] bg-gradient-to-br from-[#35cabb] via-[#16a998] to-[#007f76] p-7 text-white shadow-xl sm:p-10">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">Langkah terakhir</span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight">Siapkan toko Anda dalam beberapa menit.</h1>
          <p className="mt-4 text-base leading-7 text-white/80">Lengkapi profil usaha untuk memulai pengelolaan kasir, stok, QR item, dan laporan.</p>
          <div className="mt-8 space-y-4 text-sm text-white/90">
            <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 font-bold">1</span><span>Data usaha tersimpan aman</span></div>
            <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 font-bold">2</span><span>Mulai masa coba gratis 3 hari</span></div>
            <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 font-bold">3</span><span>Masuk ke dashboard usaha</span></div>
          </div>
        </section>
        <Card className="border-0 bg-white shadow-xl shadow-[#0d786c]/10"><CardContent className="p-6 sm:p-9">
          <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#008c7d]">Profil usaha</p><h2 className="mt-2 font-display text-3xl font-extrabold text-[#073f3a]">Ceritakan toko Anda</h2><p className="mt-2 text-sm leading-6 text-[#5f7773]">Kolom bertanda wajib diperlukan agar akun usaha dapat langsung digunakan.</p></div>
          <form className="space-y-5" onSubmit={event => { event.preventDefault(); complete.mutate({ ...form, description: form.description || null }); }}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="businessName">Nama usaha</Label><div className="relative"><Store className="absolute left-3 top-3 h-4 w-4 text-[#008c7d]" /><Input id="businessName" value={form.businessName} onChange={e => update("businessName", e.target.value)} className="h-11 pl-10" placeholder="Contoh: Warung Bahagia" required /></div></div>
              <div className="space-y-2"><Label htmlFor="ownerName">Nama pemilik</Label><Input id="ownerName" value={form.ownerName} onChange={e => update("ownerName", e.target.value)} className="h-11" placeholder="Nama Anda" required /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="whatsappNumber">Nomor WhatsApp</Label><div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-[#008c7d]" /><Input id="whatsappNumber" inputMode="numeric" value={form.whatsappNumber} onChange={e => update("whatsappNumber", e.target.value.replace(/\D/g, ""))} className="h-11 pl-10" placeholder="Contoh: 6281234567890" required /></div><p className="text-xs text-[#6d8580]">Gunakan angka tanpa tanda tambah atau spasi.</p></div>
            <div className="space-y-2"><Label htmlFor="address">Alamat usaha</Label><div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-[#008c7d]" /><Input id="address" value={form.address} onChange={e => update("address", e.target.value)} className="h-11 pl-10" placeholder="Jalan, kelurahan, kota" required /></div></div>
            <div className="space-y-2"><Label htmlFor="description">Jenis atau deskripsi usaha <span className="font-normal text-[#6d8580]">(opsional)</span></Label><Textarea id="description" value={form.description} onChange={e => update("description", e.target.value)} placeholder="Contoh: Jajanan pasar dan minuman dingin" rows={3} /></div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-[#008c7d] text-base hover:bg-[#006f63]" disabled={complete.isPending}>{complete.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan data usaha</> : "Simpan & mulai masa coba"}</Button>
          </form>
        </CardContent></Card>
      </div>
    </div>
  </main>;
}
