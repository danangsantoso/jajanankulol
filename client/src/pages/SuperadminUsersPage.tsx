import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

const roleLabel = (user: { role: string; membershipRole: string | null }) => user.role === "superadmin" ? "Superadmin" : user.membershipRole === "tenant_admin" ? "Admin Utama" : user.membershipRole === "branch_admin" ? "Admin Cabang" : "Kasir";

export default function SuperadminUsersPage() {
  const users = trpc.superadmin.users.list.useQuery();
  const options = trpc.superadmin.users.options.useQuery();
  const [form, setForm] = useState({ name: "", email: "", password: "", membershipRole: "branch_admin" as "tenant_admin" | "branch_admin" | "cashier", tenantId: 0, branchId: 0 });
  const utils = trpc.useUtils();
  const refresh = () => utils.superadmin.users.list.invalidate();
  const create = trpc.superadmin.users.create.useMutation({ onSuccess: async () => { toast.success("Pengguna dibuat. Kata sandi wajib diganti saat login pertama."); setForm({ name: "", email: "", password: "", membershipRole: "branch_admin", tenantId: 0, branchId: 0 }); await refresh(); }, onError: error => toast.error(error.message) });
  const update = trpc.superadmin.users.update.useMutation({ onSuccess: async () => { toast.success("Data pengguna diperbarui."); await refresh(); }, onError: error => toast.error(error.message) });
  const remove = trpc.superadmin.users.deleteAccess.useMutation({ onSuccess: async () => { toast.success("Akses pengguna dinonaktifkan."); await refresh(); }, onError: error => toast.error(error.message) });
  const reset = trpc.superadmin.accounts.resetPassword.useMutation({ onSuccess: () => toast.success("Kata sandi awal diperbarui dan wajib diganti saat login."), onError: error => toast.error(error.message) });

  const editUser = (user: NonNullable<typeof users.data>[number]) => {
    if (user.role === "superadmin") return toast.error("Akun Superadmin tunggal tidak dapat diubah.");
    const name = window.prompt("Nama pengguna:", user.name || "");
    if (!name) return;
    const email = window.prompt("Email pengguna:", user.email || "");
    if (email) update.mutate({ userId: user.id, name, email, status: user.status });
  };
  const resetPassword = (userId: number) => {
    const password = window.prompt("Kata sandi awal baru (minimal 8 karakter):");
    if (password && password.length >= 8) reset.mutate({ userId, newPassword: password });
    else if (password) toast.error("Kata sandi minimal 8 karakter.");
  };

  const selectedTenant = options.data?.find(tenant => tenant.id === form.tenantId);
  const submitCreate = () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8 || !form.tenantId || !form.branchId) return toast.error("Lengkapi nama, email, password minimal 8 karakter, usaha, dan cabang.");
    create.mutate(form);
  };

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Akses platform" title="Manajemen seluruh pengguna" description="Pantau semua role, usaha, cabang, status akun, dan kelola akses tanpa membuka modul operasional toko." />
    <Card className="mb-5 border-0 shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /><div><p className="font-extrabold">Tambah pengguna</p><p className="text-xs text-muted-foreground">Admin Utama, Admin Cabang, atau Kasir akan memakai kata sandi awal dan wajib menggantinya saat login pertama.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Input aria-label="Nama pengguna baru" placeholder="Nama lengkap" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /><Input aria-label="Email pengguna baru" type="email" placeholder="email@usaha.com" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /><Input aria-label="Kata sandi awal" type="password" placeholder="Kata sandi awal" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /><select aria-label="Role pengguna baru" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.membershipRole} onChange={event => setForm(current => ({ ...current, membershipRole: event.target.value as typeof current.membershipRole }))}><option value="tenant_admin">Admin Utama</option><option value="branch_admin">Admin Cabang</option><option value="cashier">Kasir</option></select><select aria-label="Usaha pengguna baru" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.tenantId || ""} onChange={event => { const tenantId = Number(event.target.value); const branchId = options.data?.find(tenant => tenant.id === tenantId)?.branches[0]?.id || 0; setForm(current => ({ ...current, tenantId, branchId })); }}><option value="">Pilih usaha</option>{options.data?.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select><select aria-label="Cabang pengguna baru" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.branchId || ""} onChange={event => setForm(current => ({ ...current, branchId: Number(event.target.value) }))} disabled={!selectedTenant}><option value="">Pilih cabang</option>{selectedTenant?.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><Button className="mt-4" onClick={submitCreate} disabled={create.isPending}><Plus className="mr-2 h-4 w-4" />{create.isPending ? "Membuat…" : "Buat pengguna"}</Button></CardContent></Card>
    <div className="mb-5 grid gap-3 sm:grid-cols-4"><Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total akun</p><p className="mt-1 text-2xl font-extrabold">{users.data?.length || 0}</p></CardContent></Card>{["Superadmin", "Admin Utama", "Admin Cabang"].map(role => <Card className="border-0 shadow-sm" key={role}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{role}</p><p className="mt-1 text-2xl font-extrabold">{users.data?.filter(user => roleLabel(user) === role).length || 0}</p></CardContent></Card>)}</div>
    <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Pengguna</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Usaha / cabang</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody>{users.isLoading ? <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Memuat pengguna…</td></tr> : users.data?.length ? users.data.map(user => <tr key={`${user.id}-${user.membershipId || 0}`} className="border-b last:border-0"><td className="px-5 py-4"><p className="font-bold">{user.name || "Tanpa nama"}</p><p className="text-xs text-muted-foreground">{user.email || "Tanpa email"}</p></td><td className="px-5 py-4"><Badge variant={user.role === "superadmin" ? "default" : "secondary"}>{roleLabel(user)}</Badge></td><td className="px-5 py-4"><p className="font-medium">{user.tenantName || "Platform"}</p><p className="text-xs text-muted-foreground">{user.branchName || "Semua tenant"}</p></td><td className="px-5 py-4"><Badge variant={user.status === "active" && user.membershipStatus !== "inactive" ? "secondary" : "destructive"}>{user.status === "active" && user.membershipStatus !== "inactive" ? "Aktif" : "Nonaktif"}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-1">{user.role === "superadmin" ? <span title="Akun Superadmin dilindungi"><ShieldCheck className="h-5 w-5 text-primary" /></span> : <><Button size="icon" variant="ghost" title="Edit pengguna" onClick={() => editUser(user)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Reset password" onClick={() => resetPassword(user.id)}><KeyRound className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Hapus akses" className="text-destructive" onClick={() => { if (window.confirm(`Nonaktifkan seluruh akses ${user.email}?`)) remove.mutate({ userId: user.id }); }}><Trash2 className="h-4 w-4" /></Button></>}</div></td></tr>) : <tr><td colSpan={5} className="p-12 text-center"><UsersRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">Belum ada pengguna</p></td></tr>}</tbody></table></div></CardContent></Card>
  </div>;
}
