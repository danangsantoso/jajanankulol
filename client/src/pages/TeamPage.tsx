import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { KeyRound, ShieldCheck, UserPlus, UserRoundX, UsersRound } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type CreatedCredentials = { name: string; email: string; password: string; role: "cashier" | "branch_admin" };

export default function TeamPage() {
  const team = trpc.team.list.useQuery();
  const workspace = trpc.workspace.current.useQuery();
  const utils = trpc.useUtils();
  const [role, setRole] = useState<"cashier" | "branch_admin">("cashier");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const branchChoices = workspace.data?.branches || [];
  const subscription = workspace.data?.subscription;
  const activeCashiers = team.data?.members.filter(member => member.role === "cashier" && member.status === "active").length || 0;
  const cashierLimitReached = role === "cashier" && activeCashiers >= (subscription?.cashierLimit || 2);

  const afterCreate = async (data: { name: string; email: string; role: "cashier" | "branch_admin" }) => {
    setCreatedCredentials({ ...data, password });
    toast.success(data.role === "cashier" ? "Akun kasir berhasil dibuat." : "Akun admin cabang berhasil dibuat.");
    setName(""); setEmail(""); setPassword("");
    await Promise.all([utils.team.list.invalidate(), utils.workspace.current.invalidate()]);
  };
  const createCashier = trpc.team.createCashier.useMutation({ onSuccess: afterCreate, onError: error => toast.error(error.message) });
  const createBranchAdmin = trpc.team.createBranchAdmin.useMutation({ onSuccess: afterCreate, onError: error => toast.error(error.message) });
  const deactivate = trpc.team.deactivate.useMutation({ onSuccess: async () => { toast.success("Akses pengguna dinonaktifkan."); await Promise.all([utils.team.list.invalidate(), utils.workspace.current.invalidate()]); }, onError: error => toast.error(error.message) });
  const resetPassword = trpc.team.resetMemberPassword.useMutation({ onSuccess: () => toast.success("Kata sandi pengguna berhasil diperbarui."), onError: error => toast.error(error.message) });
  const reassignCashier = trpc.team.reassignCashierBranch.useMutation({ onSuccess: async () => { toast.success("Kasir dipasangkan ke cabang baru."); await Promise.all([utils.team.list.invalidate(), utils.workspace.current.invalidate()]); }, onError: error => toast.error(error.message) });
  const submit = () => {
    const input = { name, email, password, branchId: Number(branchId) };
    if (role === "cashier") createCashier.mutate(input); else createBranchAdmin.mutate(input);
  };
  const changePassword = (memberId: number, memberName: string) => {
    const next = window.prompt(`Kata sandi baru untuk ${memberName} (minimal 8 karakter):`);
    if (next && next.length >= 8) resetPassword.mutate({ memberId, newPassword: next });
    else if (next) toast.error("Kata sandi minimal 8 karakter.");
  };

  return <div className="mx-auto max-w-6xl">
    <PageHeading eyebrow="Administrasi usaha" title="Admin cabang & kasir" description="Admin utama dapat membuat pengguna, menetapkan cabang, dan mengubah kata sandi mereka." />
    <div className="mb-6 grid gap-3 sm:grid-cols-3"><Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Paket aktif</p><p className="mt-1 font-display text-xl font-extrabold capitalize">{subscription?.planName || "Trial Bronze"}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kuota outlet</p><p className="mt-1 font-display text-xl font-extrabold">{subscription?.activeBranches || 0}/{subscription?.branchLimit || 2}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kuota kasir aktif</p><p className="mt-1 font-display text-xl font-extrabold">{activeCashiers}/{subscription?.cashierLimit || 2}</p></CardContent></Card></div>
    <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <Card className="h-fit border-0 shadow-sm"><CardContent className="p-6">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><UserPlus className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Buat akun pengguna</h2><p className="text-sm text-muted-foreground">Kredensial dapat langsung digunakan pada halaman login.</p></div></div>
        <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); submit(); }}>
          <div><Label>Role pengguna</Label><Select value={role} onValueChange={(value: "cashier" | "branch_admin") => setRole(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cashier">Kasir</SelectItem><SelectItem value="branch_admin">Admin Cabang</SelectItem></SelectContent></Select></div>
          <div><Label>Nama lengkap</Label><Input required value={name} onChange={event => setName(event.target.value)} placeholder="Contoh: Sinta Putri" /></div>
          <div><Label>Email login</Label><Input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="pengguna@usaha.com" /></div>
          <div><Label>Kata sandi</Label><Input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Minimal 8 karakter" /></div>
          <div><Label>Cabang penugasan</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent>{branchChoices.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div>
          {cashierLimitReached && <div className="rounded-xl bg-[#fff4df] p-3 text-sm font-medium text-[#985f08]">Kuota kasir paket {subscription?.planName} sudah tercapai. Nonaktifkan kasir lama atau tingkatkan paket.</div>}
          <Button className="w-full" disabled={createCashier.isPending || createBranchAdmin.isPending || !branchId || cashierLimitReached}>{createCashier.isPending || createBranchAdmin.isPending ? "Membuat akun…" : role === "cashier" ? "Buat akun kasir" : "Buat admin cabang"}</Button>
        </form>
        {createdCredentials && <div className="mt-5 rounded-xl border border-[#b9eadf] bg-[#edfcf8] p-4 text-sm text-[#176b60]"><p className="font-extrabold">Simpan kredensial ini sekarang</p><p className="mt-2">{createdCredentials.role === "cashier" ? "Kasir" : "Admin Cabang"} · {createdCredentials.name}</p><p>{createdCredentials.email}</p><p className="mt-1 font-mono font-bold">Kata sandi: {createdCredentials.password}</p><p className="mt-2 text-xs">Kata sandi hanya ditampilkan pada perangkat ini dan tersimpan di server dalam bentuk hash.</p></div>}
      </CardContent></Card>
      <Card className="border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-primary" /><div><h2 className="font-display text-xl font-extrabold">Pengguna usaha</h2><p className="text-sm text-muted-foreground">Admin Utama dapat memasangkan Kasir ke cabang aktif sesuai paket.</p></div></div><div className="mt-4 space-y-6">{team.data?.members.length ? <><section><h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Admin Cabang</h3><div className="mt-2 divide-y">{team.data.members.filter(member => member.role === "branch_admin").map(member => <div className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center" key={member.id}><div className="min-w-0"><p className="truncate font-extrabold">{member.name || "Pengguna"}</p><p className="truncate text-sm text-muted-foreground">{member.email || "Email belum tersedia"} · {member.branchName || "Cabang belum ditentukan"}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Admin Cabang</Badge>{member.status === "active" && <><Button size="sm" variant="outline" onClick={() => changePassword(member.id, member.name || "pengguna")}><KeyRound className="mr-1.5 h-3.5 w-3.5" />Ubah password</Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => deactivate.mutate({ memberId: member.id })}><UserRoundX className="h-4 w-4" /></Button></>}</div></div>) || <p className="py-4 text-sm text-muted-foreground">Belum ada Admin Cabang.</p>}</div></section><section><h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Kasir</h3><div className="mt-2 divide-y">{team.data.members.filter(member => member.role === "cashier").map(member => <div className="flex flex-col justify-between gap-3 py-4" key={member.id}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="min-w-0"><p className="truncate font-extrabold">{member.name || "Pengguna"}</p><p className="truncate text-sm text-muted-foreground">{member.email || "Email belum tersedia"} · {member.branchName || "Cabang belum ditentukan"}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Kasir</Badge>{member.status === "active" && <><Button size="sm" variant="outline" onClick={() => changePassword(member.id, member.name || "pengguna")}><KeyRound className="mr-1.5 h-3.5 w-3.5" />Ubah password</Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => deactivate.mutate({ memberId: member.id })}><UserRoundX className="h-4 w-4" /></Button></>}</div></div>{member.status === "active" && <div className="max-w-xs"><Label>Pasangkan ke cabang</Label><Select value={String(member.branchId || "")} onValueChange={branchId => reassignCashier.mutate({ memberId: member.id, branchId: Number(branchId) })}><SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent>{branchChoices.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div>}</div>) || <p className="py-4 text-sm text-muted-foreground">Belum ada Kasir.</p>}</div></section></> : <div className="py-10 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Belum ada pengguna aktif.</p></div>}</div></CardContent></Card>
    </div>
  </div>;
}
