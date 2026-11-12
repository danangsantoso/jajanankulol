import PageHeading from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { MessageCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SuperadminSettingsPage() {
  const settings = trpc.superadmin.settings.get.useQuery(); const utils = trpc.useUtils(); const [number, setNumber] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { if (settings.data) { setNumber(settings.data.whatsappNumber || ""); setMessage(settings.data.whatsappMessage || ""); } }, [settings.data]);
  const update = trpc.superadmin.settings.update.useMutation({ onSuccess: async () => { toast.success("Pengaturan WhatsApp diperbarui."); await utils.platform.publicSettings.invalidate(); await utils.superadmin.settings.get.invalidate(); }, onError: e => toast.error(e.message) });
  return <div className="mx-auto max-w-3xl"><PageHeading eyebrow="Konfigurasi platform" title="Pengaturan superadmin" description="Atur nomor WhatsApp dan pesan CTA yang digunakan oleh landing page publik Jajananku." /><Card className="mt-6 border-0 shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7fbf7] text-primary"><MessageCircle className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">WhatsApp landing page</h2><p className="text-sm text-muted-foreground">Gunakan format internasional tanpa tanda tambah atau spasi.</p></div></div><form className="mt-7 space-y-5" onSubmit={e => { e.preventDefault(); update.mutate({ whatsappNumber: number || null, whatsappMessage: message || null }); }}><div><Label>Nomor WhatsApp tujuan</Label><Input value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, ""))} placeholder="6281234567890" /></div><div><Label>Pesan awal</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Halo Jajananku…" className="min-h-28" /></div><Button disabled={update.isPending}>{update.isPending ? "Menyimpan…" : "Simpan pengaturan"}</Button></form></CardContent></Card></div>;
}
