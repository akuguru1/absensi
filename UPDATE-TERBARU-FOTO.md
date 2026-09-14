# Update Terbaru: Perbaikan Bug Foto (Profil Guru & Bukti Mengajar)

Update kali ini **hanya berisi perbaikan bug**, tidak ada fitur baru. Kabar baiknya: **hanya 1 file yang berubah** — `app.js`. Tidak perlu menyentuh Google Apps Script sama sekali.

---

## Apa yang diperbaiki?

1. **Foto profil guru (menu Pengaturan) gagal tersimpan kalau foto dari galeri besar.**
   Sebelumnya foto langsung disimpan mentah-mentah ke penyimpanan HP/laptop (localStorage) tanpa dipadatkan dulu. Foto besar dari galeri bisa melebihi batas kapasitas penyimpanan tersebut, sehingga gagal tersimpan tanpa pesan yang jelas. Sekarang foto dipadatkan otomatis dulu (seperti foto bukti mengajar), dan kalau tetap gagal akan muncul pesan yang jelas.

2. **Pesan error "Gagal mengunggah foto ke Drive" di Jurnal Mengajar tidak menjelaskan apa-apa.**
   Sebelumnya pesan ini selalu sama persis, apa pun penyebab aslinya, sehingga tidak mungkin didiagnosis. Sekarang pesan errornya menampilkan **alasan asli** yang dikirim balik oleh Google Apps Script (misalnya soal izin Drive, atau deployment yang perlu di-update), jadi kalau masih gagal, Anda (atau saya) bisa langsung tahu penyebabnya dari teks errornya.

---

## Apa saja yang harus diganti?

| File | Perlu diganti? |
|---|---|
| `app.js` | ✅ **Wajib** — satu-satunya file yang berubah |
| `index.html` | ❌ Tidak berubah, tidak perlu diganti |
| `style.css` | ❌ Tidak berubah, tidak perlu diganti |
| `google-apps-script.gs` | ❌ Tidak berubah, **tidak perlu** deploy ulang Apps Script |

---

## Langkah-langkah

### 0. Amankan data dulu (kebiasaan aman, walau file ini tidak akan menghapus data Anda)

1. Buka aplikasi Buku Kelas versi lama Anda.
2. Menu **Pengaturan** → kalau sudah terhubung ke Spreadsheet, klik **"⬆ Kirim ke Spreadsheet"** dan tunggu berhasil.
3. Scroll ke **"Data lokal"** → klik **"Unduh cadangan JSON"**, simpan file cadangannya.

### 1. Ganti `app.js` di GitHub

1. Buka [github.com](https://github.com), login, masuk ke repository aplikasi Anda (mis. `buku-kelas-ipa`).
2. Klik file **`app.js`** dari daftar file.
3. Klik ikon **pensil ✏️** (Edit) di pojok kanan atas.
4. Klik di dalam area kode, tekan **Ctrl+A** (Windows) / **Cmd+A** (Mac), lalu **Delete** — kosongkan semua isi lama.
5. Buka file `app.js` **yang baru** (dari paket yang saya berikan) dengan Notepad (Windows) atau TextEdit (Mac), pilih semua (**Ctrl+A**/**Cmd+A**) lalu salin (**Ctrl+C**/**Cmd+C**).
6. Kembali ke tab GitHub, klik di area kode yang sudah kosong, tempel (**Ctrl+V**/**Cmd+V**).
7. Scroll ke paling bawah kode yang ditempel — pastikan diakhiri dengan baris kurung kurawal penutup, bukan terpotong di tengah.
8. Scroll ke bawah halaman, di kotak **"Commit changes"**, boleh tulis pesan seperti **"Perbaikan bug foto"**.
9. Pastikan **"Commit directly to the main branch"** terpilih, lalu klik tombol hijau **"Commit changes"**.

### 2. Selesai — tidak ada langkah tambahan

Karena `google-apps-script.gs` tidak berubah, **tidak perlu** membuka Apps Script atau membuat deployment baru. GitHub Pages Anda akan otomatis memuat `app.js` yang baru dalam waktu singkat (biasanya kurang dari 1 menit, kadang perlu refresh browser dengan **Ctrl+Shift+R** / **Cmd+Shift+R** kalau versi lama masih ter-cache).

---

## Cara mengecek update sudah aktif

1. Buka aplikasi Anda, refresh paksa (**Ctrl+Shift+R** / **Cmd+Shift+R**).
2. Coba unggah foto di Jurnal Mengajar (dari galeri, file agak besar) — kalau berhasil, tandanya sudah update.
3. Kalau masih gagal, perhatikan **teks pesan errornya** — sekarang seharusnya lebih rinci (bukan cuma "Gagal mengunggah foto ke Drive" polos). Salin teks itu dan kirim ke saya supaya saya bisa cari penyebab spesifiknya.
