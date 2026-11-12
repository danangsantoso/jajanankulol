import { Button } from "@/components/ui/button";
import { COOKIE_NAME } from "@shared/const";
import { Camera, CheckCircle2, ImagePlus, Loader2, Trash2 } from "lucide-react";
import React, { ChangeEvent, useState } from "react";
import { toast } from "sonner";

export type PaymentProof = {
  key: string;
  url: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

async function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto tidak dapat dibaca."));
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}

export default function PaymentProofUploader({ value, onChange }: { value: PaymentProof | null; onChange: (proof: PaymentProof | null) => void }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Gunakan foto berformat JPG, PNG, atau WebP.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran foto bukti maksimal 5 MB.");
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const raw = sessionStorage.getItem("manus-cookie");
        const prefix = `${COOKIE_NAME}=`;
        const token = raw?.split(";").find(part => part.trim().startsWith(prefix))?.trim().slice(prefix.length);
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch {
        // Cookie sesi reguler akan tetap digunakan jika sessionStorage tidak tersedia.
      }
      const response = await fetch("/api/payment-proofs", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ dataUrl }),
      });
      const data = await response.json() as PaymentProof & { message?: string };
      if (!response.ok) throw new Error(data.message || "Foto bukti tidak dapat diunggah.");
      onChange({ key: data.key, url: data.url, mimeType: data.mimeType });
      toast.success("Foto bukti transfer siap digunakan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Foto bukti tidak dapat diunggah.");
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return <div className="mt-4 overflow-hidden rounded-xl border bg-card"><img src={value.url} alt="Bukti transfer QRIS" className="h-32 w-full object-cover" /><div className="flex items-center justify-between gap-3 p-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-primary"><CheckCircle2 className="h-4 w-4" />Bukti transfer terunggah</span><Button onClick={() => onChange(null)} size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-4 w-4" />Ganti</Button></div></div>;
  }

  return <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-card text-primary"><ImagePlus className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Bukti transfer QRIS</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">Ambil foto langsung atau pilih dari galeri/berkas. JPG, PNG, atau WebP maksimal 5 MB.</span></span>{uploading && <Loader2 className="mt-2 h-5 w-5 shrink-0 animate-spin text-primary" />}</div>
    <div className="mt-3 grid grid-cols-2 gap-2"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"><Camera className="h-4 w-4" />Foto langsung<input className="sr-only" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={uploading} onChange={upload} type="file" /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm font-bold transition hover:bg-muted"><ImagePlus className="h-4 w-4" />Galeri / berkas<input className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload} type="file" /></label></div>
  </div>;
}
