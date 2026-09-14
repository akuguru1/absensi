# Fitur Baru di Versi Ini

Sebelum masuk ke panduan update, berikut fitur yang ditambahkan pada paket ini:

00000. **(Update terbaru)** Template import nilai (menu Nilai) — tombol baru **"Unduh template import"** di samping "Import dari file". Pilih dulu Jenis (Tugas/Ulangan Harian/UTS/UAS/Praktikum/dll.) & Nama penilaian (mis. "UH 1", "Tugas 3"), lalu klik tombol ini untuk mengunduh file Excel yang sudah otomatis terisi nama & NIS seluruh siswa kelas aktif (plus nilai yang sudah ada, kalau sudah pernah diisi) — tinggal isi/koreksi kolom Nilai di laptop, simpan, lalu unggah lagi lewat "Import dari file". Berlaku untuk SEMUA jenis penilaian (ulangan, tugas, dst.) — tinggal ganti pilihan Jenis & Nama penilaian sebelum unduh template untuk penilaian yang berbeda. Baris dengan kolom Nilai kosong saat import akan dilewati (tidak menghapus nilai yang sudah ada). Fitur ini murni di `index.html`/`app.js`, **tidak perlu redeploy Apps Script**.

0000. **(Update sebelumnya)** Dua perubahan berikut ditambahkan pada paket ini:
   - **Menu Refleksi Mengajar: tombol Edit + kolom Jam ke & Kelas** — sekarang ada tombol "Edit" di samping "Hapus" untuk mengubah tanggal, jam ke, kelas, dan isi refleksi yang sudah tersimpan. Form "Tulis refleksi" juga bertambah kolom "Jam ke", dan tabel riwayat + rekap Excel/Word/PDF menampilkan kolom "Jam ke" dan "Kelas" supaya lebih jelas saat ditinjau ulang.
   - **Rekap poin keaktifan per periode tanggal** (menu Keaktifan) — bagian baru "Rekap poin keaktifan per periode" dengan pilihan "Dari tanggal" – "Sampai tanggal" (misalnya dari awal sampai akhir 1 bab pembelajaran), lalu bisa diunduh sebagai Excel/Word/PDF. Rekapnya menampilkan poin tiap siswa per kategori (Menjawab, Bertanya, dst.) plus Total, diurutkan dari siswa paling aktif — jadi mudah melihat siswa mana saja yang aktif selama satu bab pembelajaran.

   ⚠️ **`google-apps-script.gs` berubah lagi (untuk kolom "Jam ke" di sheet Refleksi Guru).** Anda **WAJIB** redeploy Apps Script sekali lagi (Deploy → Manage deployments → ikon pensil → New version → Deploy) — lihat Langkah 5 di bawah. Rekap keaktifan per periode TIDAK butuh redeploy (murni perubahan di `index.html`/`app.js`, memakai data yang sudah ada).

000. **(Update sebelumnya)** Empat perubahan berikut ditambahkan pada paket ini:
   - **Dialog konfirmasi sebelum menghapus** — di SEMUA menu yang punya tombol "Hapus" (Kelas, Siswa, Nilai, Praktikum, Jurnal Mengajar, Refleksi, Jadwal, Modul Ajar, Jurnal Kegiatan Guru, palet warna kustom, pulihkan cadangan, hapus semua data), sekarang muncul kotak konfirmasi bergaya aplikasi ("Yakin ingin menghapus permanen?") sebelum data benar-benar terhapus — supaya salah klik tidak langsung menghilangkan data.
   - **Perbaikan unduh PDF yang terpotong** — tabel rekap otomatis memakai orientasi kertas lanskap kalau kolomnya banyak, dan tautan foto yang panjang (tanpa spasi) tidak lagi memaksa kolom melebar sampai memotong teks lain.
   - **Perbaikan unduh Word yang "rusak"/tidak bisa dibuka** — sebelumnya file Word sebenarnya adalah file HTML yang diberi nama `.doc` (trik lama), yang ditolak sebagai "file rusak" oleh Word di HP dan aplikasi seperti WPS Office. Sekarang file yang diunduh adalah `.docx` ASLI (format resmi Microsoft), dan seharusnya terbuka normal di Word (HP maupun laptop), Google Docs, dan WPS.
   - **Menu baru "Jurnal Kegiatan Guru"** — catatan kegiatan guru yang tidak terikat kelas tertentu (mis. rapat, piket, workshop, bimbingan siswa): tanggal, jam ke, rincian kegiatan, catatan (opsional), bisa diedit, dan bisa dilampiri foto bukti kegiatan (kamera/galeri, format apa pun termasuk HEIC) yang langsung diunggah ke folder Google Drive **"Buku Kelas - Bukti Kegiatan Guru"**. Riwayatnya bisa diunduh sebagai Excel/Word/PDF, sama seperti Jurnal Mengajar.

   ⚠️ **`google-apps-script.gs` berubah lagi untuk fitur Jurnal Kegiatan Guru di atas.** Anda **WAJIB** mengganti isi skrip di Apps Script dan membuat *deployment versi baru* (Deploy → Manage deployments → ikon pensil → New version → Deploy) — lihat Langkah 5 di bawah. Tanpa langkah ini, catatan Jurnal Kegiatan Guru tetap tersimpan di perangkat tapi tidak akan tersinkron ke Spreadsheet/Drive. Perbaikan PDF/Word dan dialog konfirmasi hapus TIDAK butuh redeploy (murni perubahan di `index.html`/`style.css`/`app.js`).

00. **(Update sebelumnya)** Empat perubahan berikut ditambahkan pada paket ini:
   - **Perbaikan tampilan "Jam ke" (Riwayat Mengajar & Jadwal Pelajaran)** — akar masalahnya sama seperti bug "1899-12-30" yang pernah diperbaiki untuk jam mulai/selesai: Google Sheets otomatis mengira teks "jam ke" seperti "1-2" atau "5-6" sebagai TANGGAL (mis. "1-2" dibaca 1 Februari, "5-6" dibaca 5 Juni), sehingga kolom Jam ke menampilkan tanggal seperti "2026-02-01" atau "2026-06-05", bukan "1-2"/"5-6" yang sesungguhnya diketik. Sudah diperbaiki di `google-apps-script.gs`: kolom "jamKe" sekarang dipaksa berformat teks saat ditulis ke Spreadsheet, dan kalau ada data lama yang sudah terlanjur tersimpan sebagai tanggal, otomatis dipulihkan kembali ke format "hari-bulan" aslinya saat dibaca.
   - **Tombol Edit di Riwayat Mengajar (Jurnal Mengajar)** — setiap baris catatan mengajar kini punya tombol **"Edit"** (di samping "Hapus") untuk mengubah jam ke/materi/catatan khusus, termasuk **mengganti atau menghapus foto bukti mengajar** (unggah ulang ke Google Drive) tanpa perlu hapus & buat catatan baru.
   - **Palet warna baru: Pink Neon** — satu pilihan palet warna pink neon yang cerah & berani ditambahkan di menu Pengaturan → Tampilan & tema warna, di grup "Palet warna" bagian atas.
   - Sudah dicek juga bagian lain aplikasi untuk bug serupa; tidak ditemukan masalah lain yang berkaitan.

   ⚠️ **`google-apps-script.gs` berubah lagi khusus untuk perbaikan Jam ke di atas.** Anda **WAJIB** mengganti isi skrip di Apps Script dan membuat *deployment versi baru* (Deploy → Manage deployments → ikon pensil → New version → Deploy) — lihat Langkah 5 di bawah. Tanpa langkah ini, kolom Jam ke yang sudah pernah tersinkron ke Spreadsheet lama kemungkinan masih akan tampil sebagai tanggal sampai Anda menekan **"⬆ Kirim ke Spreadsheet"** sekali lagi setelah redeploy (supaya nilai jam ke lama itu tertulis ulang dengan format teks yang benar).

0. **(Update sebelumnya)** Enam perubahan berikut ditambahkan pada paket ini:
   - **Tabel lengkap nilai + unduh Excel per kelas** (menu Nilai) — panel baru "Tabel lengkap nilai (semua tugas & ulangan)" menampilkan SETIAP nilai yang pernah diinput (Tugas 1, Tugas 2, dst, Ulangan Bab 1, Bab 2, dst) untuk seluruh siswa kelas aktif dalam satu tabel, lengkap dengan rata-rata per jenis dan nilai akhir hasil rumus persentase bobot. Tombol **"⬇ Unduh nilai kelas ini (Excel)"** mengunduh seluruh tabel ini sebagai file Excel (sheet kedua berisi rincian bobot yang dipakai).
   - **Upload foto galeri di Jurnal Mengajar** — sebelumnya hanya bisa lewat kamera langsung, sekarang tersedia dua tombol terpisah: **"📷 Ambil foto (kamera)"** dan **"🖼️ Pilih dari galeri"**, lengkap pratinjau foto sebelum disimpan.
   - **Menu baru "Refleksi Mengajar"** — tulis refleksi per kelas setelah mengajar (apa yang berjalan baik, kendala, rencana perbaikan). Riwayatnya tersimpan di perangkat dan otomatis terkirim ke Spreadsheet (sheet baru `Refleksi Guru`).
   - **Perbaikan autosave & sinkron** — ditemukan bug nyata: pengiriman ke Spreadsheet sebelumnya memakai mode koneksi yang membuat aplikasi **tidak bisa mendeteksi kegagalan sungguhan** dari Apps Script (selalu dianggap "berhasil" walau sebenarnya gagal tersimpan) — ini penyebab utama jurnal mengajar kadang "kelewat" tersinkron. Sekarang aplikasi membaca respons asli dari Apps Script dan hanya menandai tersinkron kalau benar-benar berhasil; kalau gagal, akan otomatis dicoba lagi. Jurnal Mengajar & Refleksi Guru juga langsung mencoba mengirim seketika setelah disimpan (tanpa menunggu jeda beberapa detik seperti menu lain).
   - **Perbaikan tampilan Jadwal Pelajaran ("1899-12-30")** — akar masalahnya ada di `google-apps-script.gs`: Google Sheets otomatis mengubah jam yang diketik (mis. "08:30") menjadi nilai tanggal-waktu berepoch 30 Desember 1899, dan skrip lama memformatnya sebagai tanggal, bukan jam — itulah yang membuat kolom Waktu menampilkan "1899-12-30 - 1899-12-30". Sudah diperbaiki di dua sisi: kolom jam dipaksa berformat teks saat ditulis, dan dibaca kembali sebagai jam (`HH:mm`), bukan tanggal.
   - **Tombol Edit di Jadwal Pelajaran** — setiap baris jadwal kini punya tombol **"Edit"** (di samping "Hapus") untuk mengubah kelas/hari/jam ke/jam mulai/jam selesai tanpa perlu hapus & buat ulang.
1. **Catatan opsional di Keaktifan** — kolom "Catatan (opsional)" per siswa di menu Keaktifan, terpisah dari poin.
2. **Jadwal Pelajaran** (menu baru) — atur hari & jam mengajar tiap kelas. Muncul sebagai pengingat di Ringkasan, dan aplikasi akan menampilkan notifikasi (jika izin notifikasi browser diberikan) sekitar 10 menit sebelum jam mulai, selama aplikasi terbuka.
3. **Modul Ajar** (menu baru) — unggah file modul ajar (.doc/.docx/.pdf) per kelas, atau **generate modul ajar otomatis dengan AI** (pilih Google Gemini, Anthropic Claude, atau OpenAI ChatGPT — perlu API key masing-masing, disimpan lokal di perangkat). Hasil AI bisa diedit, disimpan ke daftar Modul Ajar, atau diunduh sebagai Word (.doc) / PDF.
4. **Profil Guru** (di Pengaturan) — ganti nama dan foto profil, tampil di sidebar. Foto disimpan lokal di perangkat (tidak disinkron ke Spreadsheet karena ukurannya).
5. **Sinkron Spreadsheet diperluas** — sheet baru otomatis dibuat: `Keaktifan Catatan`, `Jadwal Pelajaran`, `Modul Ajar`. File modul ajar yang diunggah otomatis tersimpan ke folder Google Drive **"Buku Kelas - Modul Ajar"** di akun Gmail Anda dan tautannya dicatat di sheet `Modul Ajar`.
6. **Tahun ajaran & arsip kelas** (menu Kelas & Siswa) — panel baru "Tahun ajaran" dengan tombol **"+ Tahun ajaran baru"**. Kelas dari tahun ajaran sebelumnya **tidak terhapus**, tetap tersimpan sebagai arsip dan bisa dilihat lewat filter tahun ajaran di halaman yang sama (ditandai lencana "Arsip"). Pilihan **"Kelas aktif"** di bagian atas halaman, serta menu Absensi/Nilai/Keaktifan/Praktikum/Jadwal/Modul Ajar, hanya menampilkan kelas dari tahun ajaran yang sedang berjalan supaya tidak tercampur dengan kelas lama. Kalau Anda sudah punya kelas dari versi sebelumnya, semuanya tetap tampil seperti biasa sampai Anda pertama kali membuka tahun ajaran baru — tidak ada data yang tiba-tiba hilang/tersembunyi.
7. **Tema warna Pink, Gold & Violet** — tampilan aplikasi (sidebar, tombol, aksen warna) memakai perpaduan ungu tua, pink cerah, dan aksen emas yang hangat & mewah.
8. **Ikon aplikasi baru** — ikon (favicon / ikon saat ditambahkan ke layar utama HP) diganti dengan logo "Absensi IPA" (lencana ungu dengan tanda centang + aksen atom).
9. **Perbaikan tampilan HP** — semua tabel kini bisa digeser (scroll) secara horizontal di dalam kotaknya sendiri kalau kolomnya banyak, jadi tidak ada lagi konten yang terpotong atau melebar sampai keluar layar HP.
10. **Simpan & kirim otomatis, tanpa perlu klik** — nilai yang Anda ketik di menu Nilai otomatis tersimpan begitu berpindah kotak (tombol lama "Simpan nilai" kini jadi "Simpan sekarang", hanya untuk memaksa simpan semua sekaligus). Semua perubahan (nilai, absensi, keaktifan, dll.) juga otomatis terkirim ke Google Spreadsheet beberapa saat setelah disimpan — tidak perlu klik "Kirim ke Spreadsheet" lagi (tombolnya tetap ada untuk memaksa kirim sekarang kalau perlu).
11. **Bisa dipakai offline** — kalau internet sedang tidak ada, Anda tetap bisa mengisi nilai/absensi seperti biasa; datanya aman tersimpan di perangkat. Begitu koneksi kembali, aplikasi otomatis mengirim seluruh perubahan yang tertunda ke Spreadsheet tanpa perlu diulang manual. Setiap aplikasi dibuka, data terbaru dari Spreadsheet juga otomatis diambil (kalau tidak ada perubahan lokal yang masih tertunda).
12. **Rekap total keaktifan** (menu Keaktifan) — kolom baru "Total keseluruhan" di samping "Total hari ini", menampilkan jumlah poin keaktifan siswa dari awal sampai sekarang (bukan cuma hari ini), ikut ter-update langsung saat Anda mengetik poin.
13. **Tema warna Pink, Violet, Electric Purple & Gold** — palet warna diperbarui memadukan keempat warna ini (menggantikan tema sebelumnya), lengkap dengan ikon aplikasi yang menyesuaikan.
14. **Foto bukti mengajar** (menu Jurnal Mengajar) — tambahkan foto (mis. dari kamera HP) sebagai bukti mengajar saat menyimpan catatan. Foto langsung diunggah ke folder Google Drive **"Buku Kelas - Bukti Mengajar"** di akun Gmail Anda, dan tautannya otomatis tercatat di sheet `Jurnal Mengajar` (kolom "Bukti foto" → tombol "Lihat foto").
15. **130+ kombinasi palet warna baru** (menu Pengaturan → Tampilan & tema warna) — tambahan 132 palet elegan (dikelompokkan per nuansa: rose gold, ungu & lavender, biru & navy, tosca, hijau, kuning keemasan, jingga, merah & marun, netral/monokrom, pastel, hingga jewel tone mewah), lengkap dengan kotak pencarian nama palet.
16. **Buat palet warna sendiri** (menu Pengaturan) — pilih 4 warna dasar aplikasi sendiri dengan **klik kotak warna** (pilih warna persis) atau **geser penggeser rona (hue)**; warna turunannya (versi gelap, pucat, tinta teks, latar, dll.) otomatis disesuaikan supaya tetap serasi & mudah dibaca. Hasilnya langsung terlihat di seluruh aplikasi, dan bisa disimpan dengan nama sendiri ke daftar "Tema saya" (bisa dipakai lagi atau dihapus kapan saja).

⚠️ **`google-apps-script.gs` berubah lagi di paket ini** (untuk perbaikan bug jadwal "1899-12-30" dan penambahan sheet `Refleksi Guru`). Anda **WAJIB** mengganti isi skrip di Apps Script dan membuat *deployment versi baru* (Deploy → Manage deployments → ikon pensil → New version → Deploy) — lihat Langkah 5 di bawah. Tanpa langkah ini: sheet `Refleksi Guru` tidak akan pernah terbentuk, dan jadwal yang sudah pernah tersinkron ke Spreadsheet lama kemungkinan masih akan tampil "1899-12-30" sampai Anda menekan **"⬆ Kirim ke Spreadsheet"** sekali lagi setelah redeploy (supaya jam-jam lama itu tertulis ulang dengan format teks yang benar).

---

# Tutorial Lengkap: Memperbarui Aplikasi Buku Kelas Lewat GitHub

Panduan ini untuk Anda yang **repository GitHub-nya sudah online** (sudah bisa dibuka lewat `https://username-anda.github.io/nama-repo/`), dan sekarang ingin memperbarui ke isi paket terbaru ini. Ditulis detail langkah demi langkah, klik per klik.

Total waktu: sekitar 10–15 menit.

---

## Yang Perlu Diketahui Dulu

Paket aplikasi terbaru ini berisi 8 file:

| File | Tipe perubahan | Wajib diupdate? |
|---|---|---|
| `index.html` | Tampilan & struktur halaman | ✅ **Wajib**, selalu |
| `style.css` | Warna, tema, tampilan mobile | ✅ **Wajib**, selalu |
| `app.js` | Semua logika/fitur aplikasi | ✅ **Wajib**, selalu |
| `google-apps-script.gs` | Backend Google Spreadsheet | ⚠️ Hanya kalau Anda memakai fitur sinkron Spreadsheet |
| `TUTORIAL.md` | Panduan sinkron & pemakaian | 💡 Opsional (dokumentasi saja, tidak memengaruhi aplikasi) |
| `UPDATE.md` | Panduan ini sendiri | 💡 Opsional |
| `GITHUB-PEMULA.md` | Panduan setup GitHub dari nol | 💡 Opsional, **file baru** (belum ada di repo lama Anda) |
| `GOOGLE-SHEETS-PEMULA.md` | Panduan setup Spreadsheet dari nol | 💡 Opsional, **file baru** (belum ada di repo lama Anda) |

File yang ditandai 💡 **hanya dokumentasi** untuk dibaca-baca — tidak wajib diunggah kalau Anda buru-buru, aplikasi tetap berjalan normal tanpanya. Tapi disarankan diikutkan sekalian supaya panduan yang Anda pegang selalu versi terbaru.

---

## Langkah 0 — Amankan Data Dulu (WAJIB, jangan dilewati)

1. Buka aplikasi Buku Kelas versi lama Anda seperti biasa (link GitHub Pages Anda).
2. Klik menu **"Pengaturan"** di sidebar (atau lewat ☰ hamburger kalau di HP).
3. **Kalau sudah terhubung ke Google Spreadsheet:** klik tombol **"⬆ Kirim ke Spreadsheet"**, tunggu sampai muncul notifikasi berhasil di bagian bawah layar.
4. Scroll ke bagian **"Data lokal"**, klik **"Unduh cadangan JSON"** — ini akan mengunduh sebuah file seperti `cadangan-bukukelas-2026-09-05.json`. Simpan file ini di tempat yang aman (folder Downloads, atau kirim ke email/WhatsApp diri sendiri).

> Kenapa perlu langkah ini? Mengganti file `index.html`/`style.css`/`app.js` **tidak akan menghapus** data Anda (data tersimpan terpisah di penyimpanan peramban/localStorage). Tapi mencadangkan dulu adalah kebiasaan aman sebelum mengubah apa pun, untuk jaga-jaga.

---

## Langkah 1 — Siapkan File Baru di Komputer

1. Cari file zip paket aplikasi terbaru ini yang sudah Anda unduh (biasanya di folder **Downloads**).
2. **Ekstrak/unzip** file tersebut — klik kanan pada file zip → **"Extract All..."** (Windows) atau klik dua kali (Mac, biasanya otomatis mengekstrak).
3. Hasil ekstrak akan berupa folder bernama `absensi-ipa`, buka folder itu — pastikan Anda melihat 8 file di dalamnya: `index.html`, `style.css`, `app.js`, `google-apps-script.gs`, `TUTORIAL.md`, `UPDATE.md`, `GITHUB-PEMULA.md`, `GOOGLE-SHEETS-PEMULA.md`.
4. **Biarkan folder File Explorer/Finder ini tetap terbuka** — Anda akan bolak-balik ke sini di langkah berikutnya.

---

## Langkah 2 — Masuk ke Repository GitHub Anda

1. Buka [github.com](https://github.com) di peramban, pastikan sudah **login** dengan akun yang Anda pakai untuk membuat repository aplikasi ini.
2. Di halaman utama (dashboard), cari dan klik nama repository Anda (contoh: `buku-kelas-ipa`) — biasanya terlihat di daftar "Recent repositories" di sisi kiri, atau klik foto profil Anda (kanan atas) → **"Your repositories"** untuk mencarinya.
3. Anda akan masuk ke halaman utama repository, terlihat daftar file: `index.html`, `style.css`, `app.js`, `google-apps-script.gs`, `TUTORIAL.md`, dst (versi lama).

---

## Langkah 3 — Memperbarui 3 File Inti (`index.html`, `style.css`, `app.js`)

Ulangi urutan berikut **tiga kali**, satu kali untuk setiap file:

### 3a. Update `index.html`

1. Di halaman repository, klik nama file **`index.html`** dari daftar file.
2. Anda akan masuk ke tampilan isi file itu. Klik ikon **pensil ✏️** di pojok kanan atas (dekat tombol "Raw", "Blame", dll) — kadang muncul sebagai tombol bertuliskan **"Edit"**.
3. Anda sekarang berada di mode edit teks, kursor bisa diklik di dalam area kode.
4. Klik satu kali di dalam area kode tersebut, lalu tekan **Ctrl+A** (Windows) atau **Cmd+A** (Mac) untuk memilih semua teks.
5. Tekan tombol **Delete** atau **Backspace** — pastikan area kode benar-benar kosong (kosong total, tanpa sisa teks apa pun).
6. Beralih ke jendela File Explorer/Finder yang tadi dibiarkan terbuka (Langkah 1) → buka file **`index.html`** yang baru dengan **Notepad** (Windows: klik kanan → Open with → Notepad) atau **TextEdit** (Mac: klik kanan → Open With → TextEdit).
7. Di Notepad/TextEdit, tekan **Ctrl+A** / **Cmd+A** untuk pilih semua isi, lalu **Ctrl+C** / **Cmd+C** untuk menyalin.
8. Kembali ke tab GitHub yang masih dalam mode edit tadi, klik di dalam area kode yang kosong, tekan **Ctrl+V** / **Cmd+V** untuk menempelkan.
9. Pastikan kode baru sudah muncul semuanya (scroll ke bawah untuk cek sampai akhir, harus diakhiri tag `</html>`).
10. Scroll ke bagian **paling bawah** halaman GitHub, cari kotak **"Commit changes"**.
11. Biarkan judul commit yang otomatis terisi (mis. "Update index.html"), atau ganti dengan tulisan seperti **"Update ke versi terbaru"**.
12. Pastikan pilihan **"Commit directly to the main branch"** terpilih (biasanya sudah default).
13. Klik tombol hijau **"Commit changes"**.
14. Anda akan otomatis kembali ke tampilan file `index.html` yang sudah diperbarui.

### 3b. Update `style.css`

1. Klik tulisan **nama repository Anda** di bagian atas (breadcrumb) untuk kembali ke halaman utama daftar file.
2. Klik file **`style.css`**.
3. Ulangi persis langkah 2–14 di atas (3a), tapi gunakan isi file `style.css` yang baru dari folder hasil ekstrak.

### 3c. Update `app.js`

1. Kembali ke halaman utama repository (klik nama repository di breadcrumb).
2. Klik file **`app.js`**.
3. Ulangi persis langkah 2–14 di atas (3a), tapi gunakan isi file `app.js` yang baru.

> ⚠️ File `app.js` ini paling panjang isinya. Pastikan proses copy-paste selesai sepenuhnya (kadang perlu menunggu 1–2 detik di komputer yang lebih lambat) sebelum klik Commit. Kalau ragu, scroll ke paling bawah kode yang ditempel — harus diakhiri dengan baris kurung kurawal penutup, bukan terpotong di tengah.

---

## Langkah 4 — (Opsional) Update atau Tambahkan File Dokumentasi

Bagian ini opsional — lewati kalau Anda hanya ingin fitur aplikasinya saja yang update.

### Untuk file yang SUDAH ADA di repository (`TUTORIAL.md`)

1. Klik file `TUTORIAL.md` di repository.
2. Ikuti langkah yang sama seperti 3a (klik pensil ✏️ → hapus isi lama → paste isi baru → Commit changes).

### Untuk file yang BELUM ADA di repository (`UPDATE.md`, `GITHUB-PEMULA.md`, `GOOGLE-SHEETS-PEMULA.md`)

Karena file-file ini baru (tidak ada di repository lama Anda), caranya sedikit berbeda — pakai **Upload files**, bukan Edit:

1. Di halaman utama repository, klik tombol **"Add file"** (dekat kanan atas daftar file) → pilih **"Upload files"**.
2. Buka jendela File Explorer/Finder ke folder hasil ekstrak (`absensi-ipa`).
3. **Select/blok** file `UPDATE.md`, `GITHUB-PEMULA.md`, dan `GOOGLE-SHEETS-PEMULA.md` sekaligus (klik yang pertama, tahan **Shift**, klik yang terakhir).
4. **Drag (seret)** ketiga file yang terpilih itu ke kotak putus-putus di halaman GitHub bertuliskan "Drag files here to add them to your repository".
5. Tunggu sampai muncul tanda centang hijau di setiap file.
6. Scroll ke bawah, klik **"Commit changes"**.

---

## Langkah 5 — Update Backend Google Apps Script (khusus jika memakai sinkron Spreadsheet)

Lewati langkah ini kalau Anda **tidak** memakai fitur sinkron ke Google Spreadsheet.

1. Buka Google Spreadsheet yang selama ini Anda pakai untuk sinkron.
2. Klik menu **Extensions → Apps Script**.
3. Di editor Apps Script, klik di dalam area kode, tekan **Ctrl+A**/**Cmd+A** lalu **Delete** untuk mengosongkan.
4. Buka file `google-apps-script.gs` yang baru (dari folder hasil ekstrak) dengan Notepad/TextEdit, **Select All** lalu **Copy**.
5. Kembali ke editor Apps Script, **Paste** kode baru tersebut.
6. Klik ikon 💾 **Save project**.
7. Klik tombol biru **"Deploy"** (kanan atas) → **"Manage deployments"**.
8. Pada deployment yang berstatus **Active**, klik ikon **pensil ✏️** di sisi kanannya.
9. Pada bagian **"Version"**, klik dropdown, pilih **"New version"**.
10. Klik tombol **"Deploy"**.

> ⚠️ **Bagian paling sering terlewat:** menyimpan kode (langkah 6) saja **tidak cukup**. Web App yang sudah dideploy tetap memakai kode versi lama sampai Anda benar-benar membuat **New version** lewat Manage deployments (langkah 7–10). URL Web App Anda tidak berubah, jadi tidak perlu mengubah apa pun di aplikasi.

### Verifikasi backend sudah versi baru

Buka tab baru, kunjungi URL Web App Anda ditambah `?action=pull` di akhirnya, contoh:
```
https://script.google.com/macros/s/AKfycb..................../exec?action=pull
```
Kalau berhasil, akan muncul teks JSON berisi data kelas/siswa Anda. Kalau muncul error atau halaman kosong, ulangi langkah 7–10.

---

## Langkah 6 — Buka Aplikasi & Pastikan Sudah Versi Terbaru

1. Tunggu **1–2 menit** setelah commit terakhir (GitHub Pages butuh waktu mempublikasikan ulang).
2. Buka link aplikasi Anda (`https://username-anda.github.io/nama-repo/`).
3. **Lakukan hard refresh** supaya peramban tidak menampilkan file lama dari cache:
   - **Windows/Linux**: tekan **Ctrl+Shift+R**
   - **Mac**: tekan **Cmd+Shift+R**
   - **HP**: buka pengaturan peramban → cari "Hapus cache/Clear cache", atau paling gampang buka link di **jendela penyamaran/incognito** untuk memastikan.
4. Cek tanda-tanda versi baru sudah aktif:
   - Tampilan berwarna **pink, violet, electric purple & gold** — sidebar gradasi ungu tua → ungu → ungu elektrik → pink cerah, dengan aksen emas (bukan hijau versi lama).
   - Di HP, muncul **bar ungu dengan tombol ☰** di bagian atas (bukan baris menu yang kepotong).
   - Menu **Nilai** punya tombol chip **"+ Tambah baru"** untuk membuat Tugas 1, Tugas 2, dst.
   - Menu **Pengaturan** punya toggle **"Aktifkan Ulangan Lisan"**.
5. Pastikan data lama Anda (kelas, siswa, nilai) **masih muncul seperti biasa** — kalau iya, update berhasil dan aman.
6. Kalau memakai sinkron Spreadsheet: coba klik **"⬆ Kirim ke Spreadsheet"** lalu **"⬇ Ambil data terbaru"** — keduanya harus berhasil (notifikasi hijau di bawah layar, bukan pesan gagal).

Selesai — aplikasi Anda sudah memakai versi terbaru. ✅

---

## Troubleshooting

**Tampilan masih hijau/lama setelah semua langkah selesai**
- Hampir pasti masalah **cache peramban**. Lakukan hard refresh (Ctrl+Shift+R / Cmd+Shift+R), atau buka di jendela penyamaran/incognito untuk memastikan.
- Cek juga apakah commit di GitHub benar-benar berhasil: buka file `style.css` di repository, lihat isinya — apakah sudah berisi kata `--purple` dan warna ungu? Kalau masih isi lama, ulangi Langkah 3b.
- Tunggu 1–3 menit lagi — kadang GitHub Pages butuh waktu sedikit lebih lama untuk mempublikasikan ulang.

**Muncul pesan error/halaman putih kosong setelah update**
- Kemungkinan proses copy-paste di salah satu file terpotong (tidak lengkap). Buka file itu di repository GitHub, scroll ke paling bawah — periksa apakah kodenya lengkap sampai akhir (untuk `app.js`/`index.html` harus diakhiri dengan baris penutup yang wajar, bukan terputus di tengah kalimat/fungsi).
- Ulangi proses copy-paste untuk file yang bermasalah tersebut (Langkah 3), pastikan menunggu sampai proses paste selesai sebelum klik Commit.

**Setelah update, data kelas/siswa saya hilang**
- Data tersimpan terpisah dari file aplikasi (di localStorage peramban), jadi update file **seharusnya tidak** menghapusnya. Kalau tetap hilang, kemungkinan Anda membuka **link/domain yang berbeda** dari biasanya.
- Solusi: menu Pengaturan → **"Pulihkan dari cadangan"**, pilih file JSON dari Langkah 0. Atau kalau sudah terhubung ke Spreadsheet, tempel kembali URL Web App yang sama lalu klik **"⬇ Ambil data terbaru"**.

**Fitur sinkron (Kirim/Ambil) tiba-tiba gagal setelah update**
- Pastikan sudah menyelesaikan Langkah 5 (redeploy **New version**) — ini wajib kalau file `.gs` ikut berubah di versi ini.
- Buka `URL-Anda?action=pull` langsung di tab browser — kalau muncul error, berarti deploy backend belum berhasil diperbarui, ulangi Langkah 5.

**Saya tidak yakin file `.gs` di versi ini berubah atau tidak**
- Aman-aman saja untuk selalu mengulang Langkah 5 setiap kali update, meskipun ternyata isinya sama — tidak akan merusak data yang sudah ada di Spreadsheet.

**Lupa nama repository / link aplikasi saya**
- Buka [github.com](https://github.com), login, klik foto profil (kanan atas) → **"Your repositories"** — semua repository Anda akan terdaftar di sana.
