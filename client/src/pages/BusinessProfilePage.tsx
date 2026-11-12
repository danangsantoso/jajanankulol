import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, CalendarClock, CheckCircle2, CircleAlert, Loader2, MapPin, Phone, Save, Store, UserRound } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ProfileForm = { businessName: string; ownerName: string; whatsappNumber: string; address: string; description: string };

const formatDate = (value?: Date | string | null) => value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "Belum ditentukan";

export default function BusinessProfilePage() {
  const [, setLocation] = useLocation();
  const profile = trpc.businessProfile.get.useQuery();
  const workspace = trpc.workspace.current.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ProfileForm>({ businessName: "", ownerName: "", whatsappNumber: "", address: "", description: "" });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      businessName: profile.data.businessName,
      ownerName: profile.data.ownerName,
      whatsappNumber: profile.data.whatsappNumber,
      address: profile.data.address,
      description: profile.data.description,
    });
  }, [profile.data]);

  const update = trpc.businessProfile.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.businessProfile.get.invalidate(), utils.workspace.current.invalidate()]);
      toast.success("Profil usaha berhasil diperbarui.");
    },
    onError: error => toast.error(error.message),
  });

  const subscription = workspace.data?.subscription;
  const stateMeta = subscription?.state === "trial"
    ? { title: "Masa coba aktif", detail: `${subscription.daysRemaining ?? 3} hari tersisa`, endDate: profile.data?.trialEndsAt, icon: CalendarClock, tone: "border-[#b9eadf] bg-[#edfcf8] text-[#176b60]", badge: "bg-[#d7f6ef] text-[#0a7568]" }
    : subscription?.state === "active"
      ? { title: "Langganan aktif", detail: subscription.daysRemaining === null ? "Masa aktif tanpa tanggal berakhir" : `${subscription.daysRemaining} hari tersisa`, endDate: profile.data?.subscriptionEndsAt, icon: CheckCircle2, tone: "border-[#b9eadf] bg-[#edfcf8] text-[#176b60]", badge: "bg-[#d7f6ef] text-[#0a7568]" }
      : subscription?.state === "suspended"
        ? { title: "Akun dinonaktifkan", detail: subscription.message || "Hubungi admin Jajananku untuk mengaktifkan kembali.", endDate: null, icon: CircleAlert, tone: "border-[#f5c2be] bg-[#fff1f0] text-[#9d342d]", badge: "bg-[#fde2df] text-[#a23b34]" }
        : { title: "Masa aktif berakhir", detail: subscription?.message || "Pilih paket untuk melanjutkan penggunaan.", endDate: profile.data?.trialEndsAt || profile.data?.subscriptionEndsAt, icon: CircleAlert, tone: "border-[#f5c2be] bg-[#fff1f0] text-[#9d342d]", badge: "bg-[#fde2df] text-[#a23b34]" };

  const updateField = (key: keyof ProfileForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  if (profile.isLoading || workspace.isLoading) return <div className="grid min-h-[52vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!profile.data || !workspace.data) return <div className="mx-auto max-w-3xl"><PageHeading eyebrow="Profil usaha" title="Profil belum tersedia" description="Muat ulang halaman untuk mencoba mengambil data usaha Anda kembali." /></div>;
  const StateIcon = stateMeta.icon;

  return <div className="mx-auto max-w-5xl">
    <PageHeading eyebrow="Pengaturan" title="Profil usaha" description="Perbarui informasi toko agar data operasional Jajananku tetap akurat." />
    <section className={`mb-6 rounded-2xl border p-5 ${stateMeta.tone}`}>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/70"><StateIcon className="h-6 w-6" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-extrabold">{stateMeta.title}</h2><Badge className={`border-0 ${stateMeta.badge}`}>{subscription?.state === "trial" ? "Trial 3 hari" : subscription?.state === "active" ? "Berlangganan" : "Perlu tindakan"}</Badge></div><p className="mt-1 text-sm font-medium">{stateMeta.detail}</p>{stateMeta.endDate && <p className="mt-1 text-xs opacity-80">Berakhir pada {formatDate(stateMeta.endDate)}</p>}</div></div>
        {!subscription?.allowed && <Button variant="outline" className="border-current bg-white/70 hover:bg-white" onClick={() => setLocation("/")}>Pilih paket</Button>}
      </div>
    </section>
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-0 shadow-sm"><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Store className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Informasi toko</h2><p className="text-sm text-muted-foreground">Data ini digunakan sebagai identitas usaha Anda.</p></div></div>
        <form className="mt-7 space-y-5" onSubmit={event => { event.preventDefault(); update.mutate({ ...form, description: form.description || null }); }}>
          <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="businessName">Nama usaha</Label><div className="relative"><Store className="absolute left-3 top-3 h-4 w-4 text-primary" /><Input id="businessName" className="h-11 pl-10" value={form.businessName} onChange={event => updateField("businessName", event.target.value)} required /></div></div><div className="space-y-2"><Label htmlFor="ownerName">Nama pemilik</Label><div className="relative"><UserRound className="absolute left-3 top-3 h-4 w-4 text-primary" /><Input id="ownerName" className="h-11 pl-10" value={form.ownerName} onChange={event => updateField("ownerName", event.target.value)} required /></div></div></div>
          <div className="space-y-2"><Label htmlFor="whatsappNumber">Nomor WhatsApp</Label><div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-primary" /><Input id="whatsappNumber" inputMode="numeric" className="h-11 pl-10" value={form.whatsappNumber} onChange={event => updateField("whatsappNumber", event.target.value.replace(/\D/g, ""))} required /></div><p className="text-xs text-muted-foreground">Gunakan angka tanpa tanda tambah atau spasi.</p></div>
          <div className="space-y-2"><Label htmlFor="address">Alamat usaha</Label><div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-primary" /><Input id="address" className="h-11 pl-10" value={form.address} onChange={event => updateField("address", event.target.value)} required /></div></div>
          <div className="space-y-2"><Label htmlFor="description">Deskripsi usaha <span className="font-normal text-muted-foreground">(opsional)</span></Label><Textarea id="description" value={form.description} onChange={event => updateField("description", event.target.value)} placeholder="Contoh: Jajanan pasar, camilan, dan minuman dingin" rows={4} /></div>
          <Button type="submit" disabled={update.isPending} className="h-11"><Save className="mr-2 h-4 w-4" />{update.isPending ? "Menyimpan…" : "Simpan perubahan"}</Button>
        </form>
      </CardContent></Card>
      <Card className="h-fit border-0 shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff1d9] text-[#b76b00]"><Building2 className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Ringkasan akun</h2><p className="text-sm text-muted-foreground">Status akses usaha Anda saat ini.</p></div></div><dl className="mt-6 space-y-4 text-sm"><div className="border-b pb-4"><dt className="text-muted-foreground">Email admin</dt><dd className="mt-1 break-all font-semibold">{profile.data.email || "—"}</dd></div><div className="border-b pb-4"><dt className="text-muted-foreground">Status onboarding</dt><dd className="mt-1 font-semibold">{profile.data.completed ? "Profil usaha lengkap" : "Perlu dilengkapi"}</dd></div><div className="border-b pb-4"><dt className="text-muted-foreground">Cabang aktif</dt><dd className="mt-1 font-semibold">{workspace.data.branchName}</dd></div><div><dt className="text-muted-foreground">Status akses</dt><dd className="mt-1 font-semibold">{stateMeta.title}</dd></div></dl></CardContent></Card>
    </div>
  </div>;
}
