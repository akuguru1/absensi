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

/* Menyimpan foto bukti mengajar (dikirim sebagai base64) ke folder Google
   Drive "Buku Kelas - Bukti Mengajar" di akun Gmail pemilik Spreadsheet,
   lalu mengembalikan URL foto tersebut. Nama file diberi awalan tanggal &
   nama kelas supaya mudah ditelusuri langsung dari Drive. */
function uploadTeachingProofPhoto(data) {
  try {
    const folderName = 'Buku Kelas - Bukti Mengajar';
    const folders = DriveApp.getFoldersByName(folderName);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    const bytes = Utilities.base64Decode(data.base64);
    const safeKelas = String(data.kelas || 'Kelas').replace(/[\\/:*?"<>|]/g, '-');
    const safeTanggal = String(data.tanggal || '');
    const namaFile = [safeTanggal, safeKelas, data.fileName || 'bukti-mengajar.jpg'].filter(Boolean).join(' - ');
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

function writeSheet(ss, name, rows, columns) {
  const sheet = getOrCreateSheet(ss, name);
  sheet.clear();
  if (!rows || !rows.length) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    return;
  }
  const header = columns;
  const body = rows.map(r => columns.map(c => (r[c] !== undefined && r[c] !== null) ? r[c] : ''));
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(2, 1, body.length, header.length).setValues(body);
  sheet.setFrozenRows(1);
}

/* Membaca sebuah sheet kembali menjadi array of object, mengambil hanya kolom
   yang namanya ada di `keys` (dicocokkan lewat baris header), berapa pun
   urutan kolomnya di sheet. Kolom tampilan seperti "kelas"/"siswa" otomatis
   diabaikan kalau tidak diminta di `keys`. */
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
        else if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
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
