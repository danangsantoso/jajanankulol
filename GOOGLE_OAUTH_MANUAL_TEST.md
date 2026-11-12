# Uji Manual Login Google

1. Pastikan Google Cloud Console pada OAuth Client yang digunakan mencantumkan tepat satu redirect URI produksi: `https://jajananku.lol/api/auth/google/callback`.
2. Buka `https://jajananku.lol/login` dan pilih **Lanjutkan dengan Google**.
3. Pilih akun Google yang belum pernah masuk ke Jajananku, lalu setujui layar persetujuan Google.
4. Pastikan browser kembali ke Jajananku dan halaman dashboard tampil tanpa pesan galat.
5. Pastikan banner masa coba menampilkan **3 hari tersisa** serta tombol **Pilih paket** dan **Hubungi admin**.
6. Keluar, kemudian masuk kembali dengan Google yang sama. Pastikan ruang usaha yang sama terbuka; tenant baru tidak boleh dibuat lagi.
7. Bila alur gagal, catat URL akhir dan pesan yang tampil lalu kirimkan kepada pengelola aplikasi.
