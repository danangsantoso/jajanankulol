export type CameraPermissionState = "granted" | "prompt" | "denied" | "unsupported";

type PermissionApi = { query: (descriptor: PermissionDescriptor) => Promise<PermissionStatus> };
type MediaDevicesApi = { getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream> };

export async function getCameraPermissionState(permissionApi: PermissionApi | undefined = typeof navigator === "undefined" ? undefined : navigator.permissions) : Promise<CameraPermissionState> {
  if (!permissionApi) return "unsupported";
  try {
    const result = await permissionApi.query({ name: "camera" as PermissionName });
    if (result.state === "granted" || result.state === "prompt" || result.state === "denied") return result.state;
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

export async function requestCameraPermission(mediaDevicesApi: MediaDevicesApi | undefined = typeof navigator === "undefined" ? undefined : navigator.mediaDevices) : Promise<CameraPermissionState> {
  if (!mediaDevicesApi?.getUserMedia) return "unsupported";
  let stream: MediaStream | null = null;
  try {
    stream = await mediaDevicesApi.getUserMedia({ video: true, audio: false });
    return "granted";
  } catch (error) {
    const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
    return name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unsupported";
  } finally {
    stream?.getTracks().forEach(track => track.stop());
  }
}

export const PHOTO_ACCESS_EXPLANATION = "Pilih foto saat unggah bukti QRIS untuk membuka pemilih galeri atau berkas bawaan perangkat. Browser tidak mengizinkan aplikasi web meminta akses galeri permanen saat pemasangan.";
