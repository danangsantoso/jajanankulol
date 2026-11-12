import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, FileImage, Loader2, Settings2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCameraPermissionState, PHOTO_ACCESS_EXPLANATION, requestCameraPermission, type CameraPermissionState } from "@/lib/devicePermissions";

const cameraCopy: Record<CameraPermissionState, { label: string; detail: string }> = {
  granted: { label: "Diizinkan", detail: "Kamera siap dipakai untuk pemindaian QR." },
  prompt: { label: "Belum diminta", detail: "Ketuk tombol di bawah untuk meminta izin kamera." },
  denied: { label: "Ditolak", detail: "Buka Pengaturan situs di Chrome, lalu izinkan Kamera untuk jajananku.lol." },
  unsupported: { label: "Perlu diperiksa", detail: "Perangkat atau browser tidak melaporkan status izin. Anda tetap dapat mencoba tombol izin kamera." },
};

export default function DevicePermissionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cameraState, setCameraState] = useState<CameraPermissionState>("prompt");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void getCameraPermissionState().then(state => { if (active) setCameraState(state); });
    return () => { active = false; };
  }, [open]);

  if (!open) return null;
  const current = cameraCopy[cameraState];
  const requestAccess = async () => {
    setRequesting(true);
    const state = await requestCameraPermission();
    setCameraState(state);
    setRequesting(false);
    if (state === "granted") toast.success("Izin kamera berhasil diberikan. Anda dapat mulai memindai QR.");
    else if (state === "denied") toast.error("Izin kamera ditolak. Aktifkan melalui Pengaturan situs di Chrome.");
    else toast.error("Kamera belum dapat diakses dari perangkat ini.");
  };

  return <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/50 p-4" role="dialog" aria-modal="true" aria-labelledby="device-permissions-title"><div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Pengaturan awal</p><h2 id="device-permissions-title" className="mt-1 font-display text-2xl font-bold">Izin perangkat</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Jajananku hanya meminta akses saat fitur yang memerlukannya digunakan.</p></div><button type="button" onClick={onClose} aria-label="Tutup pengaturan izin" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-3"><section className="rounded-2xl border bg-primary/5 p-4"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary"><Camera className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Kamera untuk scan QR</h3><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cameraState === "granted" ? "bg-emerald-100 text-emerald-800" : cameraState === "denied" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{cameraState === "granted" && <CheckCircle2 className="mr-1 inline h-3 w-3" />}{current.label}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{current.detail}</p>{cameraState !== "granted" && <Button type="button" size="sm" className="mt-3" disabled={requesting} onClick={requestAccess}>{requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}Izinkan kamera</Button>}</div></div></section><section className="rounded-2xl border p-4"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><FileImage className="h-5 w-5" /></span><div><h3 className="font-bold">Galeri dan berkas foto</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{PHOTO_ACCESS_EXPLANATION}</p></div></div></section><section className="rounded-2xl border border-dashed p-3 text-xs leading-5 text-muted-foreground"><Settings2 className="mr-1 inline h-4 w-4 text-primary" />Jika izin pernah ditolak, buka Chrome → ikon pengaturan di alamat situs → Izin → Kamera → Izinkan, lalu kembali ke Jajananku.</section></div><Button type="button" className="mt-5 w-full" onClick={onClose}>{cameraState === "granted" ? "Selesai" : "Nanti saja"}</Button></div></div>;
}
