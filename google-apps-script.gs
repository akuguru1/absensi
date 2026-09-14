/**
 * BUKU KELAS — Backend Google Apps Script
 * ----------------------------------------
 * Skrip ini menjadikan sebuah Google Spreadsheet (di akun Gmail Anda sendiri)
 * sebagai "sumber data bersama" untuk aplikasi Buku Kelas, sehingga data yang
 * diisi dari satu perangkat (mis. laptop) bisa dimuat kembali di perangkat
 * lain (mis. HP), dan sebaliknya.
 *
 *   - doPost  → menerima data dari aplikasi (dipanggil saat "Kirim ke Spreadsheet")
 *               dan menuliskannya ke beberapa sheet.
 *   - doGet   → dipanggil dengan ?action=pull untuk MEMBACA kembali seluruh
 *               data dari sheet dan mengirimkannya sebagai JSON ke aplikasi
 *               (dipakai saat aplikasi dibuka, atau saat "Ambil data terbaru").
 *
 * CARA PAKAI: lihat TUTORIAL.md di paket aplikasi ini.
 *
 * PENTING: setiap kali file ini diperbarui, Anda harus membuat DEPLOYMENT
 * VERSI BARU (Deploy → Manage deployments → ikon pensil → New version →
 * Deploy) agar perubahan benar-benar aktif. Menyimpan kode saja tidak cukup.
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Permintaan khusus: unggah satu file modul ajar (Word/PDF) ke Google Drive.
    // Dikirim terpisah dari sinkron data utama supaya payload tetap ringan.
    if (data.type === 'uploadModuleFile') {
      return jsonOutput(uploadModuleFile(data));
    }

    // Permintaan khusus: unggah satu foto bukti mengajar ke Google Drive.
    if (data.type === 'uploadTeachingProofPhoto') {
      return jsonOutput(uploadTeachingProofPhoto(data));
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    writeSheet(ss, 'Kelas', data.classes, ['id', 'name', 'subject', 'year']);
    writeSheet(ss, 'Siswa', data.students, ['id', 'name', 'nis', 'gender', 'kelas', 'classId']);
    writeSheet(ss, 'Absensi', data.attendance, ['date', 'kelas', 'siswa', 'status', 'note', 'id', 'classId', 'studentId']);
    writeSheet(ss, 'Keaktifan', data.activityPoints, ['date', 'kelas', 'siswa', 'category', 'points', 'id', 'classId', 'studentId']);
    writeSheet(ss, 'Keaktifan Catatan', data.activityNotes, ['date', 'kelas', 'siswa', 'note', 'id', 'classId', 'studentId']);
    writeSheet(ss, 'Nilai', data.grades, ['date', 'kelas', 'siswa', 'type', 'name', 'score', 'id', 'classId', 'studentId']);
    writeSheet(ss, 'Praktikum', data.praktikum, ['date', 'kelas', 'judul', 'alat', 'k3', 'id', 'classId']);
    writeSheet(ss, 'Jurnal Mengajar', data.jurnalMengajar, ['date', 'kelas', 'jamKe', 'materi', 'catatan', 'fotoUrl', 'fotoFileName', 'id', 'classId']);
    writeSheet(ss, 'Jurnal Kegiatan Guru', data.jurnalKegiatan, ['date', 'jamKe', 'kegiatan', 'catatan', 'fotoUrl', 'fotoFileName', 'id']);
    writeSheet(ss, 'Refleksi Guru', data.reflections, ['date', 'kelas', 'jamKe', 'content', 'id', 'classId']);
    writeSheet(ss, 'Jadwal Pelajaran', data.schedule, ['hari', 'kelas', 'jamKe', 'jamMulai', 'jamSelesai', 'id', 'classId']);
    writeSheet(ss, 'Modul Ajar', data.modules, ['tanggal', 'kelas', 'judul', 'mapel', 'sumber', 'fileName', 'driveUrl', 'content', 'id', 'classId']);
    writePengaturan(ss, data.pengaturan);

    const metaSheet = getOrCreateSheet(ss, 'Info Sinkron');
    metaSheet.clear();
    metaSheet.getRange(1, 1, 2, 2).setValues([
      ['Terakhir sinkron (kirim)', 'Jumlah siswa'],
      [data.syncedAt || new Date().toISOString(), (data.students || []).length]
    ]);

    return jsonOutput({ ok: true });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

/* Menyimpan file modul ajar (dikirim sebagai base64) ke folder Google Drive
   "Buku Kelas - Modul Ajar" di akun Gmail pemilik Spreadsheet, lalu
   mengembalikan URL file tersebut agar bisa dibuka dari perangkat mana pun. */
function uploadModuleFile(data) {
  try {
    const folderName = 'Buku Kelas - Modul Ajar';
    const folders = DriveApp.getFoldersByName(folderName);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    const bytes = Utilities.base64Decode(data.base64);
    const blob = Utilities.newBlob(bytes, data.mimeType || 'application/octet-stream', data.fileName || 'modul-ajar');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { ok: true, url: file.getUrl() };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/* Menyimpan foto bukti (mengajar ATAU kegiatan guru, tergantung `data.folder`)
   yang dikirim sebagai base64, ke folder Google Drive di akun Gmail pemilik
   Spreadsheet, lalu mengembalikan URL foto tersebut. `data.folder` opsional —
   kalau tidak diisi, dipakai folder default "Buku Kelas - Bukti Mengajar"
   (supaya panggilan lama dari Jurnal Mengajar tetap berjalan tanpa perubahan).
   Nama file diberi awalan tanggal & nama kelas (kalau ada) supaya mudah
   ditelusuri langsung dari Drive. */
function uploadTeachingProofPhoto(data) {
  try {
    const folderName = data.folder || 'Buku Kelas - Bukti Mengajar';
    const folders = DriveApp.getFoldersByName(folderName);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    const bytes = Utilities.base64Decode(data.base64);
    const safeKelas = data.kelas ? String(data.kelas).replace(/[\\/:*?"<>|]/g, '-') : '';
    const safeTanggal = String(data.tanggal || '');
    const namaFile = [safeTanggal, safeKelas, data.fileName || 'bukti.jpg'].filter(Boolean).join(' - ');
    const blob = Utilities.newBlob(bytes, data.mimeType || 'image/jpeg', namaFile);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { ok: true, url: file.getUrl() };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';
    if (action === 'pull') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const data = {
        ok: true,
        classes: readSheet(ss, 'Kelas', ['id', 'name', 'subject', 'year']),
        students: readSheet(ss, 'Siswa', ['id', 'name', 'nis', 'gender', 'classId']),
        attendance: readSheet(ss, 'Absensi', ['id', 'classId', 'studentId', 'date', 'status', 'note']),
        activityPoints: readSheet(ss, 'Keaktifan', ['id', 'classId', 'studentId', 'date', 'category', 'points']),
        activityNotes: readSheet(ss, 'Keaktifan Catatan', ['id', 'classId', 'studentId', 'date', 'note']),
        grades: readSheet(ss, 'Nilai', ['id', 'classId', 'studentId', 'type', 'name', 'score', 'date']),
        praktikum: readSheet(ss, 'Praktikum', ['id', 'classId', 'date', 'judul', 'alat', 'k3']),
        jurnalMengajar: readSheet(ss, 'Jurnal Mengajar', ['id', 'classId', 'date', 'jamKe', 'materi', 'catatan', 'fotoUrl', 'fotoFileName']),
        jurnalKegiatan: readSheet(ss, 'Jurnal Kegiatan Guru', ['id', 'date', 'jamKe', 'kegiatan', 'catatan', 'fotoUrl', 'fotoFileName']),
        reflections: readSheet(ss, 'Refleksi Guru', ['id', 'classId', 'date', 'jamKe', 'content']),
        schedule: readSheet(ss, 'Jadwal Pelajaran', ['id', 'classId', 'hari', 'jamKe', 'jamMulai', 'jamSelesai']),
        modules: readSheet(ss, 'Modul Ajar', ['id', 'classId', 'judul', 'mapel', 'sumber', 'fileName', 'driveUrl', 'content', 'tanggal']),
        pengaturan: readPengaturan(ss)
      };
      return jsonOutput(data);
    }
    return jsonOutput({ ok: true, message: 'Buku Kelas backend aktif.' });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

/* Kolom-kolom yang berisi JAM (bukan tanggal), mis. "08:30". Dipakai di dua
   tempat: writeSheet() (memaksa kolom ini berformat TEKS supaya Google Sheets
   tidak otomatis mengubahnya jadi nilai Date/waktu dengan tanggal epoch
   "1899-12-30"), dan readSheet() (memformat balik nilai Date lama, kalau ada,
   sebagai jam 'HH:mm', bukan tanggal). Lihat catatan lengkap di readSheet(). */
var TIME_ONLY_COLUMNS = ['jamMulai', 'jamSelesai'];

/* Kolom "jam ke" (mis. "1-2", "3-4", "5-6") — BUKAN jam dan BUKAN tanggal,
   tapi teksnya berbentuk "angka-angka" sehingga Google Sheets salah
   mengiranya sebagai tanggal (mis. "1-2" dianggap 1 Februari, lalu tampil
   sebagai "2026-02-01"; "5-6" dianggap 5 Juni, tampil sebagai "2026-06-05").
   Itulah sebab tampilan Jam ke di Riwayat Mengajar & Jadwal Pelajaran
   menunjukkan tanggal, bukan "jam ke 1-2"/"3-4". Sama seperti
   TIME_ONLY_COLUMNS, kolom ini dipaksa TEKS saat ditulis, dan kalau sudah
   terlanjur tersimpan sebagai Date, dibaca balik sebagai 'd-M' supaya nilai
   aslinya ("1-2", "5-6", dst.) pulih otomatis. */
var DAY_MONTH_TEXT_COLUMNS = ['jamKe'];

function writeSheet(ss, name, rows, columns) {
  const sheet = getOrCreateSheet(ss, name);
  sheet.clear();
  sheet.clearFormats();
  if (!rows || !rows.length) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    return;
  }
  const header = columns;
  const body = rows.map(r => columns.map(c => (r[c] !== undefined && r[c] !== null) ? r[c] : ''));
  // PENTING (perbaikan bug "1899-12-30"): set format kolom jam ke TEKS ("@")
  // SEBELUM nilai ditulis. Kalau tidak, Google Sheets akan otomatis mendeteksi
  // string seperti "08:30" sebagai nilai waktu dan menyimpannya sebagai objek
  // Date bertanggal epoch 1899-12-30 — itulah yang membuat tampilan Jadwal
  // Pelajaran sebelumnya menunjukkan "1899-12-30 - 1899-12-30" alih-alih jam
  // yang sesungguhnya diinput.
  TIME_ONLY_COLUMNS.concat(DAY_MONTH_TEXT_COLUMNS).forEach(colName => {
    const colIdx = columns.indexOf(colName);
    if (colIdx !== -1) sheet.getRange(2, colIdx + 1, body.length, 1).setNumberFormat('@');
  });
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(2, 1, body.length, header.length).setValues(body);
  sheet.setFrozenRows(1);
}

/* Membaca sebuah sheet kembali menjadi array of object, mengambil hanya kolom
   yang namanya ada di `keys` (dicocokkan lewat baris header), berapa pun
   urutan kolomnya di sheet. Kolom tampilan seperti "kelas"/"siswa" otomatis
   diabaikan kalau tidak diminta di `keys`. */
/* PENTING (perbaikan bug "1899-12-30"): kalau ada sel jamMulai/jamSelesai
   LAMA yang sempat terlanjur tersimpan sebagai objek Date (dari sebelum
   writeSheet() dipaksa memakai format teks di atas), sel semacam itu akan
   punya bagian TANGGAL epoch "30 Desember 1899" — kebiasaan Sheets/Excel
   untuk nilai yang murni berupa jam, tanpa tanggal. readSheet() sebelumnya
   memformat SEMUA nilai Date dengan format tanggal 'yyyy-MM-dd', sehingga
   yang tampil hanya "1899-12-30" dan jam sesungguhnya (mis. "08:30") hilang.
   Perbaikannya: kolom yang memang berisi JAM diformat sebagai 'HH:mm',
   kolom tanggal biasa (date/tanggal) tetap 'yyyy-MM-dd'. */
function readSheet(ss, sheetName, keys) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const header = values[0].map(h => String(h).trim());
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      keys.forEach(k => {
        if (idx[k] === undefined) { obj[k] = ''; return; }
        let v = row[idx[k]];
        if (k === 'score' || k === 'points') v = Number(v) || 0;
        else if (v === null || v === undefined) v = '';
        else if (v instanceof Date) {
          if (TIME_ONLY_COLUMNS.indexOf(k) !== -1) {
            v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
          } else if (DAY_MONTH_TEXT_COLUMNS.indexOf(k) !== -1) {
            // Pulihkan nilai "jam ke" lama yang terlanjur disalahartikan
            // sebagai tanggal (lihat catatan DAY_MONTH_TEXT_COLUMNS di atas).
            v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'd-M');
          } else {
            v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          }
        }
        obj[k] = v;
      });
      return obj;
    });
}

/* Pengaturan bersama (bobot nilai, status Ulangan Lisan, kategori keaktifan)
   disimpan sebagai satu baris JSON di sheet "Pengaturan" supaya semua
   perangkat memakai bobot dan kategori yang sama. */
function writePengaturan(ss, pengaturan) {
  const sheet = getOrCreateSheet(ss, 'Pengaturan');
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  sheet.getRange(2, 1, 1, 2).setValues([['settingsJson', JSON.stringify(pengaturan || {})]]);
}

function readPengaturan(ss) {
  const sheet = ss.getSheetByName('Pengaturan');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'settingsJson') {
      try { return JSON.parse(values[i][1]); } catch (e) { return null; }
    }
  }
  return null;
}
