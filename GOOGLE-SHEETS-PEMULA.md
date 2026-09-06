# Tutorial Lengkap untuk Pemula: Menghubungkan Aplikasi ke Google Spreadsheet

Panduan ini untuk menghubungkan aplikasi Buku Kelas ke **Google Spreadsheet di akun Gmail Anda sendiri**, supaya data (kelas, siswa, absensi, nilai) tersimpan di sana dan bisa disinkronkan antar perangkat (laptop ↔ HP). Ditulis dari nol, langkah demi langkah, untuk yang belum pernah memakai Google Apps Script sama sekali.

**Syarat sebelum mulai:**
- Punya akun Gmail (kalau belum, buat dulu di [accounts.google.com/signup](https://accounts.google.com/signup)).
- Aplikasi Buku Kelas sudah online (lihat `GITHUB-PEMULA.md` kalau belum).
- File `google-apps-script.gs` dari paket aplikasi ini — nanti isinya akan di-copy-paste, jadi siapkan cara membukanya (Notepad, TextEdit, atau buka langsung dari file di komputer).

Total waktu: sekitar 15 menit.

---

## Bagian 1 — Membuat Google Spreadsheet Baru

1. Buka [sheets.google.com](https://sheets.google.com) di peramban, pastikan sudah login dengan akun Gmail Anda.
2. Klik kotak besar bertanda **"+ Blank"** (spreadsheet kosong) — atau kalau muncul halaman lain, klik **"Buat spreadsheet baru"** / **"Start a new spreadsheet"** → **Blank**.
3. Spreadsheet kosong akan terbuka. Klik tulisan **"Untitled spreadsheet"** / **"Spreadsheet tanpa judul"** di pojok kiri atas, ganti namanya menjadi misalnya **"Data Buku Kelas IPA"**, tekan Enter.

Spreadsheet ini nanti akan otomatis terisi beberapa sheet (Kelas, Siswa, Absensi, dst) — Anda tidak perlu membuatnya manual.

---

## Bagian 2 — Membuka Editor Apps Script

1. Masih di spreadsheet yang sama, lihat menu di bagian atas: **File, Edit, View, Insert, Format, Data, Tools, Extensions, Help**.
2. Klik menu **"Extensions"** (Ekstensi) → klik **"Apps Script"**.
3. Tab baru akan terbuka menampilkan editor kode, dengan judul proyek default seperti "Untitled project" dan sudah ada kode contoh:
   ```
   function myFunction() {

   }
   ```

---

## Bagian 3 — Menempelkan Kode Backend

1. Klik di dalam area kode (kotak putih besar berisi `function myFunction() {...}`).
2. Pilih semua teks di dalamnya: tekan **Ctrl+A** (Windows) atau **Cmd+A** (Mac), lalu tekan **Delete** — pastikan area kode benar-benar kosong.
3. Buka file **`google-apps-script.gs`** dari paket aplikasi Anda (klik kanan → Open with → Notepad/TextEdit, atau seret ke jendela peramban).
4. **Pilih semua isi file itu** (Ctrl+A / Cmd+A) lalu **copy** (Ctrl+C / Cmd+C).
5. Kembali ke tab Apps Script, klik di area kode yang tadi sudah kosong, lalu **paste** (Ctrl+V / Cmd+V).
6. Pastikan kode sudah muncul semuanya, dimulai dengan komentar `/** BUKU KELAS — Backend Google Apps Script ... */` dan berisi beberapa `function doPost(e) {...}`, `function doGet(e) {...}`, dst.
7. Klik ikon **disket 💾 "Save project"** di kiri atas (di bawah tulisan "Untitled project"), atau tekan **Ctrl+S** / **Cmd+S**.
8. (Opsional) Klik tulisan **"Untitled project"** di pojok kiri atas, ganti nama proyek menjadi misalnya **"Backend Buku Kelas"**, tekan Enter.

---

## Bagian 4 — Mendeploy sebagai Web App

Ini bagian yang membuat spreadsheet Anda bisa "dipanggil" oleh aplikasi Buku Kelas lewat internet.

1. Klik tombol biru **"Deploy"** di pojok kanan atas editor Apps Script.
2. Dari menu yang muncul, klik **"New deployment"**.
3. Akan muncul jendela "New deployment". Di sebelah tulisan **"Select type"**, klik ikon **gerigi ⚙️**.
4. Dari daftar yang muncul, klik **"Web app"**.
5. Formulir akan berubah, isi seperti berikut:
   - **Description** (opsional): ketik `Buku Kelas backend v1`.
   - **Execute as**: pastikan terpilih **"Me (email Gmail Anda)"** — ini artinya skrip berjalan atas nama akun Anda.
   - **Who has access**: klik dropdown, pilih **"Anyone"**. 
     > Ini WAJIB diisi "Anyone", bukan "Only myself" — kalau tidak, aplikasi tidak akan bisa mengirim/mengambil data karena dianggap "orang lain" oleh Google (meskipun sebenarnya cuma aplikasi Anda sendiri yang mengaksesnya).
6. Klik tombol biru **"Deploy"**.

---

## Bagian 5 — Mengizinkan Akses (Authorize)

Google akan meminta izin karena skrip ini baru pertama kali dijalankan. Ini normal dan aman — skrip ini sepenuhnya milik Anda sendiri.

1. Akan muncul jendela **"Authorization required"** → klik **"Authorize access"**.
2. Jendela pop-up pilih akun Google akan muncul → klik akun Gmail Anda (yang sama dengan pemilik spreadsheet).
3. Akan muncul peringatan bertuliskan **"Google hasn't verified this app"** (Google belum memverifikasi aplikasi ini). Ini **normal** — terjadi karena skrip ini Anda buat sendiri, bukan aplikasi resmi dari Play Store, jadi Google selalu menampilkan peringatan ini untuk skrip pribadi.
4. Klik tulisan kecil **"Advanced"** (Lanjutan) di pojok kiri bawah peringatan tersebut.
5. Akan muncul tulisan tambahan seperti "Go to Backend Buku Kelas (unsafe)" → klik tulisan itu.
6. Halaman berikutnya menampilkan daftar izin yang diminta (mengakses Google Spreadsheet Anda) → klik tombol biru **"Allow"** (Izinkan) di bagian bawah.
7. Anda akan kembali ke jendela "New deployment" yang sekarang menampilkan tulisan **"Deployment successfully updated"** beserta sebuah **Web app URL**, formatnya seperti:
   ```
   https://script.google.com/macros/s/AKfycb........................../exec
   ```
8. Klik ikon **copy 📋** di sebelah URL tersebut untuk menyalinnya (atau blok manual lalu Ctrl+C).
9. Klik **"Done"** untuk menutup jendela ini.

> **Simpan URL ini baik-baik** (tempel sementara di Notepad) — Anda akan membutuhkannya di langkah berikutnya, dan URL ini **tidak akan berubah** meskipun nanti Anda memperbarui kodenya.

---

## Bagian 6 — Menempelkan URL ke Aplikasi Buku Kelas

1. Buka aplikasi Buku Kelas Anda di peramban (link GitHub Pages Anda).
2. Klik menu **"Pengaturan"** di sidebar kiri.
3. Scroll ke bagian **"Hubungkan ke akun Google (Gmail) — sinkron dua arah"**.
4. Klik kolom **"URL Web App (dari akun Gmail Anda)"**, tempelkan (Ctrl+V / Cmd+V) URL yang tadi disalin.
5. Klik tombol **"Simpan & tes koneksi"**.
6. Tunggu beberapa detik. Kalau berhasil, akan muncul tulisan hijau/centang seperti:
   > ✓ Terhubung. Data dari Spreadsheet berhasil dimuat ke perangkat ini...

   Mulai saat ini, setiap kali Anda mengisi nilai/absensi, datanya **otomatis tersimpan dan otomatis terkirim** ke Spreadsheet ini beberapa saat kemudian — tidak perlu centang apa pun atau klik kirim manual lagi. Kalau sedang tidak ada internet, isian Anda tetap aman tersimpan di perangkat dan akan otomatis terkirim begitu online lagi.

Kalau muncul tanda ✗ gagal, lihat bagian **Troubleshooting** di bawah.

---

## Bagian 7 — Mengirim Data yang Sudah Ada (Sekali Saja)

Kalau sebelum ini Anda sudah sempat input data kelas/siswa/nilai di aplikasi (sebelum terhubung ke Spreadsheet), data itu masih tersimpan hanya di perangkat ini — belum ada di Spreadsheet. Kirim sekali:

1. Di pojok kanan atas aplikasi, klik tombol **"⬆ Kirim ke Spreadsheet"**.
2. Tunggu notifikasi "Data terkirim ke Spreadsheet" muncul di bagian bawah layar.
3. Buka kembali tab Google Spreadsheet Anda, refresh halamannya (F5) — sekarang akan muncul beberapa sheet baru di bagian bawah: **Kelas, Siswa, Absensi, Keaktifan, Nilai, Praktikum, Jurnal Mengajar, Pengaturan, Info Sinkron** — semua terisi data Anda.

---

## Bagian 8 — Menghubungkan Perangkat Kedua (mis. HP)

1. Buka link aplikasi yang sama di HP.
2. Masuk ke menu **Pengaturan**.
3. Tempelkan **URL Web App yang sama persis** seperti yang dipakai di laptop (kirim URL-nya ke diri sendiri lewat WhatsApp/email kalau perlu mengetik ulang di HP).
4. Klik **"Simpan & tes koneksi"**.
5. Karena HP ini belum punya data lokal, data dari Spreadsheet (yang tadi dikirim dari laptop) akan otomatis termuat — kelas dan nilai Anda akan langsung terlihat.

Sekarang laptop dan HP Anda sudah memakai Spreadsheet yang sama sebagai data bersama.

---

## Troubleshooting

**Klik "Simpan & tes koneksi" tapi muncul tanda ✗ gagal**
- Buka lagi tab Apps Script → **Deploy → Manage deployments** → pastikan **"Who has access"** benar-benar **"Anyone"**, bukan "Only myself" atau "Anyone with Google account". Kalau salah, klik ikon pensil ✏️ untuk edit, ubah ke "Anyone", lalu **Deploy** ulang (pilih "New version").
- Pastikan URL yang ditempel di aplikasi diakhiri `/exec`, bukan `/dev` (kalau Anda menyalin dari tempat yang salah).
- Coba buka langsung `URL-Anda?action=pull` di tab baru peramban — seharusnya muncul teks JSON. Kalau muncul halaman login Google atau error, berarti proses Authorize di Bagian 5 belum berhasil sepenuhnya — ulangi Bagian 5.

**Peringatan "Google hasn't verified this app" membuat takut, apakah aman?**
- Aman. Peringatan ini muncul untuk **semua** skrip Apps Script pribadi yang belum didaftarkan resmi ke Google (proses itu hanya perlu untuk aplikasi publik skala besar). Karena kode ini Anda tulis/tempel sendiri dan hanya mengakses spreadsheet milik Anda sendiri, tidak ada risiko keamanan.

**Sudah terhubung, tapi sheet di Spreadsheet masih kosong**
- Klik tombol **"⬆ Kirim ke Spreadsheet"** secara manual sekali (lihat Bagian 7) — "tes koneksi" di Bagian 6 hanya membaca, tidak otomatis mengirim data yang sudah ada.

**Lupa menyimpan URL Web App-nya**
- Buka lagi tab Apps Script dari spreadsheet Anda (Extensions → Apps Script) → **Deploy → Manage deployments** → URL akan ditampilkan lagi di sana.

**Ingin memperbarui kode `.gs` di kemudian hari**
- Lihat `UPDATE.md` di paket aplikasi, bagian "Update backend Google Apps Script" — intinya: ganti kode, Save, lalu **wajib** buat **"New version"** lewat Manage deployments (menyimpan kode saja tidak cukup).
