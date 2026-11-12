export function getQrScannerStartIssue(isSecureContext: boolean, hasMediaDevices: boolean) {
  if (!isSecureContext) return "Pemindaian kamera memerlukan HTTPS. Gunakan alamat situs yang aman atau masukkan kode QR secara manual.";
  if (!hasMediaDevices) return "Browser ini belum mendukung akses kamera. Masukkan kode QR secara manual.";
  return null;
}

export function getQrCameraAttempts(): MediaTrackConstraints[] {
  return [{ facingMode: { ideal: "environment" } }, { facingMode: "environment" }, { facingMode: "user" }];
}

export function shouldRetryQrCamera(error: unknown) {
  const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
  return name === "OverconstrainedError" || name === "NotFoundError" || name === "NotSupportedError" || name === "TypeError";
}

export function getCameraErrorMessage(error: unknown) {
  const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Akses kamera ditolak. Izinkan kamera pada pengaturan browser lalu coba lagi.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Kamera tidak ditemukan. Gunakan kamera belakang atau masukkan kode QR secara manual.";
  if (name === "NotReadableError" || name === "AbortError" || name === "TrackStartError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera, lalu coba Scan lagi.";
  if (name === "NotSupportedError" || name === "TypeError") return "Pengaturan kamera tidak didukung perangkat ini. Coba buka Jajananku di Chrome terbaru atau gunakan kode manual.";
  return "Kamera tidak dapat dibuka. Periksa izin kamera untuk jajananku.lol, lalu coba lagi.";
}
