/* =========================================================================
   BUKU KELAS — Absensi & Nilai IPA
   Semua data disimpan di localStorage peramban. Backup otomatis dikirim
   ke Google Spreadsheet lewat Google Apps Script (lihat TUTORIAL.md).
   ========================================================================= */

const STORAGE_KEY = 'bukukelas_v1';
const KKM_DEFAULT = 70;

const DEFAULT_STATE = {
  classes: [],
  students: [],
  attendance: [],        // {id, classId, studentId, date, status, note}
  activityCategories: ['Menjawab pertanyaan', 'Bertanya'],
  activityPoints: [],     // {id, classId, studentId, date, category, points}
  activityNotes: [],      // {id, classId, studentId, date, note} — catatan opsional keaktifan harian
  grades: [],             // {id, classId, studentId, type, name, score, date}
  praktikum: [],          // {id, classId, date, judul, alat, k3}
  jurnalMengajar: [],     // {id, classId, date, jamKe, materi, catatan, fotoUrl, fotoFileName} — fotoUrl = link Google Drive (bukti mengajar)
  schedule: [],           // {id, classId, hari, jamKe, jamMulai, jamSelesai}
  modules: [],            // {id, classId, judul, mapel, sumber, fileName, driveUrl, content, tanggal}
  settings: {
    weights: { tugas: 20, uh: 25, ulisan: 0, uts: 20, uas: 20, praktikum: 15 },
    enableUlisan: false,
    sheetsUrl: '',
    lastSync: null,
    lastPull: null,
    syncedSnapshot: null,
    activeYear: '',                    // tahun ajaran yang sedang berjalan, mis. "2026/2027". Kosong = belum diatur (semua kelas dianggap berjalan, supaya data lama tidak tiba-tiba tersembunyi)
    guru: { nama: '', foto: '' }       // foto = data URL, disimpan lokal saja (tidak disinkron, terlalu besar untuk sel spreadsheet)
  }
};

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jumat", 'Sabtu', 'Minggu'];
function todayHari() {
  const idx = new Date().getDay(); // 0=Minggu
  return HARI_LIST[(idx + 6) % 7];
}

/* Jenis penilaian yang dikenal aplikasi. 'ulisan' (Ulangan Lisan) bersifat
   opsional — hanya muncul di dropdown/rekap jika diaktifkan di Pengaturan. */
const GRADE_TYPES = [
  { id: 'tugas', label: 'Tugas' },
  { id: 'uh', label: 'Ulangan Harian' },
  { id: 'ulisan', label: 'Ulangan Lisan' },
  { id: 'uts', label: 'UTS' },
  { id: 'uas', label: 'UAS' },
  { id: 'praktikum', label: 'Praktikum' }
];
function jenisLabel(type) { return (GRADE_TYPES.find(t => t.id === type) || {}).label || type; }
function activeGradeTypes() { return GRADE_TYPES.filter(t => t.id !== 'ulisan' || state.settings.enableUlisan); }

/* =========================================================================
   TEMA & PALET WARNA (tampilan aplikasi)
   Sengaja disimpan di localStorage TERPISAH dari STORAGE_KEY utama, supaya:
   - tidak ikut terkirim/tersinkron ke Google Spreadsheet
   - tidak mengubah struktur DEFAULT_STATE / backup JSON yang sudah ada
   Warna sesungguhnya (variabel CSS) didefinisikan di style.css lewat atribut
   [data-theme="..."] pada <html>. Di sini hanya daftar pilihan + 4 warna
   untuk pratinjau bulatan (swatch) pada kartu pilihan di menu Pengaturan.
   ========================================================================= */
const THEME_STORAGE_KEY = 'bukukelas_theme_v1';
const DEFAULT_THEME = 'klasik';

const THEMES = [
  // --- Palet warna ---
  { id:'klasik',         group:'Palet warna',            name:'Pink, Ungu & Emas', desc:'Tampilan bawaan aplikasi', swatch:['#FF2E88','#9D00FF','#6D28D9','#E8B923'] },
  { id:'elektrik',       group:'Palet warna',            name:'Ungu Elektrik & Sian', desc:'Ungu tegas + biru sian menyala', swatch:['#7B2FE0','#22D3EE','#6425C7','#FFD23F'] },
  { id:'emas-kerajaan',  group:'Palet warna',            name:'Emas Kerajaan', desc:'Nuansa emas & cokelat hangat', swatch:['#FFD700','#9C6B15','#6E4A0C','#D9A93B'] },
  { id:'senja-jingga',   group:'Palet warna',            name:'Senja Jingga', desc:'Jingga senja dipadu emas', swatch:['#D6551E','#FFA45E','#C24A1D','#F6C445'] },
  { id:'anggur-merah',   group:'Palet warna',            name:'Anggur Merah & Rose Gold', desc:'Merah marun elegan', swatch:['#9E2A4C','#D4A24C','#701C36','#D98BA0'] },
  { id:'biru-kobalt',    group:'Palet warna',            name:'Biru Kobalt & Perak', desc:'Biru tegas, formal & bersih', swatch:['#2F5FD6','#7FA6F2','#1D3F9E','#C7CDD9'] },
  { id:'monokrom',       group:'Palet warna',            name:'Monokrom Elegan', desc:'Abu grafit + aksen emas', swatch:['#4B4F58','#D4AF37','#1B1D22','#9AA0AC'] },
  { id:'magenta-limau',  group:'Palet warna',            name:'Magenta Neon & Limau', desc:'Kombinasi ceria & berani', swatch:['#E4187A','#B4E023','#A80F5C','#FFD23F'] },
  // --- Tema alam, hewan & lainnya ---
  { id:'hutan',          group:'Tema alam, hewan & lainnya', name:'Tumbuhan / Hutan Hijau', desc:'Hijau dedaunan yang menenangkan', swatch:['#2E8B57','#3FA66B','#8FD19E','#D8A93B'] },
  { id:'sakura',         group:'Tema alam, hewan & lainnya', name:'Kebun Bunga Sakura', desc:'Pink lembut ala bunga sakura', swatch:['#DB5A97','#F9A8D4','#FDCFE8','#E8B923'] },
  { id:'samudra',        group:'Tema alam, hewan & lainnya', name:'Samudra Biru', desc:'Biru laut yang segar', swatch:['#0B84A0','#38BDF8','#0891B2','#F2C14E'] },
  { id:'karang-laut',    group:'Tema alam, hewan & lainnya', name:'Karang Laut', desc:'Terumbu karang: koral & tosca', swatch:['#C24E3D','#2AA9A0','#F2B26B','#8FD8CF'] },
  { id:'kupu-kupu',      group:'Tema alam, hewan & lainnya', name:'Kupu-kupu & Taman Tropis', desc:'Fuchsia, ungu & tosca ceria', swatch:['#D6249F','#7C3AED','#22C3A6','#F5C518'] },
  { id:'gurun',          group:'Tema alam, hewan & lainnya', name:'Gurun Pasir', desc:'Terracotta, pasir & sage', swatch:['#A85F2A','#8E9A6B','#E0A85C','#D9A441'] },
  { id:'aurora',         group:'Tema alam, hewan & lainnya', name:'Langit Aurora', desc:'Ungu-tosca-pink ala aurora senja', swatch:['#7C5CFC','#4CC9E8','#FF7AC6','#F5D76E'] },
];

/* =========================================================================
   100+ KOMBINASI PALET WARNA TAMBAHAN (dibuat otomatis dari 4 warna dasar
   per palet: purple/violet/pink/gold, lalu warna turunannya — gelap,
   pucat/soft, tinta teks, latar, dsb — dihitung otomatis lewat
   deriveThemeVars() di bawah supaya tetap kontras & enak dibaca). Ini juga
   fungsi yang sama dipakai untuk fitur "Buat Palet Sendiri".
   ========================================================================= */
const GENERATED_PALETTES = [
  { id:'gen-rose-gold-klasik', group:'Merah Muda & Rose Gold', name:'Rose Gold Klasik', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#d0396b','#d46873','#dd7eba','#c69239'] },
  { id:'gen-merah-jambu-senja', group:'Merah Muda & Rose Gold', name:'Merah Jambu Senja', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#cf596d','#d58b85','#df9bba','#cfa344'] },
  { id:'gen-pink-mutiara', group:'Merah Muda & Rose Gold', name:'Pink Mutiara', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#d45e99','#da8ba0','#e3a1d6','#d7b350'] },
  { id:'gen-merah-muda-anggun', group:'Merah Muda & Rose Gold', name:'Merah Muda Anggun', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#cf6e86','#d49192','#e1adc9','#d5962a'] },
  { id:'gen-rose-champagne', group:'Merah Muda & Rose Gold', name:'Rose Champagne', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#c15c81','#ca8690','#d59ac1','#caa149'] },
  { id:'gen-pink-blush-lembut', group:'Merah Muda & Rose Gold', name:'Pink Blush Lembut', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#d0437e','#d57284','#dd88c5','#d3b155'] },
  { id:'gen-merah-jambu-zaitun', group:'Merah Muda & Rose Gold', name:'Merah Jambu Zaitun', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#ce6472','#d6968f','#dfa4be','#d0952f'] },
  { id:'gen-pink-karat-antik', group:'Merah Muda & Rose Gold', name:'Pink Karat Antik', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#bd4267','#c46e74','#ce82b0','#d8a73b'] },
  { id:'gen-rose-dusty-elegan', group:'Merah Muda & Rose Gold', name:'Rose Dusty Elegan', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#d05888','#d68592','#df9aca','#cfaf59'] },
  { id:'gen-merah-muda-mawar', group:'Merah Muda & Rose Gold', name:'Merah Muda Mawar', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#d64360','#da7572','#e189b5','#cb9434'] },
  { id:'gen-pink-salem-hangat', group:'Merah Muda & Rose Gold', name:'Pink Salem Hangat', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#cf6e9b','#d491a1','#e1add5','#d4a540'] },
  { id:'gen-rose-petal-muda', group:'Merah Muda & Rose Gold', name:'Rose Petal Muda', desc:'Nuansa merah muda hangat dipadu emas mawar yang lembut', swatch:['#cc3e63','#d06c6f','#d981b3','#dcb54c'] },
  { id:'gen-ungu-anggun-klasik', group:'Ungu & Lavender', name:'Ungu Anggun Klasik', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#7135b6','#a558c6','#7d6dd0','#c6a339'] },
  { id:'gen-lavender-kabut', group:'Ungu & Lavender', name:'Lavender Kabut', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#957ec8','#b498cd','#b3b3db','#cfb344'] },
  { id:'gen-ungu-royal-elegan', group:'Ungu & Lavender', name:'Ungu Royal Elegan', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#6f2bab','#a843c7','#7458d0','#d7c350'] },
  { id:'gen-violet-senja', group:'Ungu & Lavender', name:'Violet Senja', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#6e40bf','#a26cc6','#8680d0','#d5aa2a'] },
  { id:'gen-lilac-lembut', group:'Ungu & Lavender', name:'Lilac Lembut', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#9f91ca','#b29cc9','#b6b7d8','#cab049'] },
  { id:'gen-ungu-amethyst', group:'Ungu & Lavender', name:'Ungu Amethyst', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#7b2fb1','#b04dc7','#8162d0','#d3c055'] },
  { id:'gen-lavender-malam', group:'Ungu & Lavender', name:'Lavender Malam', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#7140b5','#a167c1','#847bcc','#d0a82f'] },
  { id:'gen-ungu-plum-mewah', group:'Ungu & Lavender', name:'Ungu Plum Mewah', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#74319b','#ab45ba','#7d59c5','#d8b93b'] },
  { id:'gen-violet-berkabut', group:'Ungu & Lavender', name:'Violet Berkabut', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#9175c7','#b697ce','#b3b2dc','#cfbd59'] },
  { id:'gen-ungu-iris-segar', group:'Ungu & Lavender', name:'Ungu Iris Segar', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#7136bf','#a65ec9','#8073d3','#cba534'] },
  { id:'gen-lavender-fajar', group:'Ungu & Lavender', name:'Lavender Fajar', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#9587c9','#af9acb','#b4b8da','#d4b640'] },
  { id:'gen-ungu-wisteria', group:'Ungu & Lavender', name:'Ungu Wisteria', desc:'Ungu tenang dipadu lavender yang anggun', swatch:['#7536b5','#a859c5','#816ecf','#dcc64c'] },
  { id:'gen-biru-navy-formal', group:'Biru & Navy', name:'Biru Navy Formal', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#3163b9','#5464c9','#6ab0d2','#c69c39'] },
  { id:'gen-biru-denim-elegan', group:'Biru & Navy', name:'Biru Denim Elegan', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#5586be','#7f90c7','#93c3d2','#cfac44'] },
  { id:'gen-biru-safir', group:'Biru & Navy', name:'Biru Safir', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#254bb1','#3c41cd','#539dd5','#d7bc50'] },
  { id:'gen-biru-laut-dalam', group:'Biru & Navy', name:'Biru Laut Dalam', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#2e6a9e','#4167be','#56b5c8','#d5a22a'] },
  { id:'gen-biru-cornflower', group:'Biru & Navy', name:'Biru Cornflower', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#5e8bc9','#8997d1','#9ecadb','#caaa49'] },
  { id:'gen-biru-baja', group:'Biru & Navy', name:'Biru Baja', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#4d6bb3','#767bbc','#89afc8','#d3ba55'] },
  { id:'gen-biru-tengah-malam', group:'Biru & Navy', name:'Biru Tengah Malam', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#253793','#3e36b5','#4080c9','#d0a02f'] },
  { id:'gen-biru-perak-berkilau', group:'Biru & Navy', name:'Biru Perak Berkilau', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#8aadc7','#9cacc9','#b6d4d8','#d8b13b'] },
  { id:'gen-biru-sky-lembut', group:'Biru & Navy', name:'Biru Sky Lembut', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#8bb9d0','#97afce','#b2dbdc','#cfb759'] },
  { id:'gen-biru-indigo-tegas', group:'Biru & Navy', name:'Biru Indigo Tegas', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#2b36b6','#5c48cb','#5e8bd4','#cb9e34'] },
  { id:'gen-biru-denim-klasik', group:'Biru & Navy', name:'Biru Denim Klasik', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#4a85bf','#758bc7','#89c3d1','#d4af40'] },
  { id:'gen-biru-es-segar', group:'Biru & Navy', name:'Biru Es Segar', desc:'Biru formal dan tegas, cocok untuk tampilan yang rapi', swatch:['#9cc2d3','#9ab1cb','#b4dada','#dcbf4c'] },
  { id:'gen-tosca-segar', group:'Tosca & Pirus', name:'Tosca Segar', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#30a6a2','#49a9c1','#5dcba6','#c69739'] },
  { id:'gen-pirus-elegan', group:'Tosca & Pirus', name:'Pirus Elegan', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#42b3bd','#6ea9c4','#82cebe','#cfa844'] },
  { id:'gen-tosca-karang', group:'Tosca & Pirus', name:'Tosca Karang', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#279b8c','#38afbc','#48cb92','#d7b850'] },
  { id:'gen-teal-mewah', group:'Tosca & Pirus', name:'Teal Mewah', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#4496a7','#6697b7','#79c3b9','#d59c2a'] },
  { id:'gen-tosca-laguna', group:'Tosca & Pirus', name:'Tosca Laguna', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#38a8a8','#56a5bd','#6ac8ac','#caa649'] },
  { id:'gen-pirus-zamrud-muda', group:'Tosca & Pirus', name:'Pirus Zamrud Muda', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#33c1b6','#5cbbcc','#72d5af','#d3b655'] },
  { id:'gen-tosca-mint', group:'Tosca & Pirus', name:'Tosca Mint', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#6bc7b5','#95ced0','#a9dbc2','#d09a2f'] },
  { id:'gen-teal-malam', group:'Tosca & Pirus', name:'Teal Malam', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#3f798d','#5781a8','#69b5b1','#d8ac3b'] },
  { id:'gen-tosca-kristal', group:'Tosca & Pirus', name:'Tosca Kristal', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#54c5c9','#80bbd0','#95dac8','#cfb359'] },
  { id:'gen-pirus-berkabut', group:'Tosca & Pirus', name:'Pirus Berkabut', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#7ebec8','#98b9cd','#b3dbd4','#cb9934'] },
  { id:'gen-tosca-botani', group:'Tosca & Pirus', name:'Tosca Botani', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#2d9f8c','#40b7bf','#54c993','#d4aa40'] },
  { id:'gen-teal-klasik', group:'Tosca & Pirus', name:'Teal Klasik', desc:'Tosca segar berpadu pirus yang menyejukkan', swatch:['#3f8ea2','#5d90b6','#70c2ba','#dcba4c'] },
  { id:'gen-hijau-zamrud-klasik', group:'Hijau & Zamrud', name:'Hijau Zamrud Klasik', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#358d61','#4baa91','#5aba6d','#c6a339'] },
  { id:'gen-hijau-sage-lembut', group:'Hijau & Zamrud', name:'Hijau Sage Lembut', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#79af79','#9dbea5','#b7cbaf','#cfb344'] },
  { id:'gen-hijau-hutan-dalam', group:'Hijau & Zamrud', name:'Hijau Hutan Dalam', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#297a44','#3c9a71','#42b346','#d7c350'] },
  { id:'gen-hijau-botanikal', group:'Hijau & Zamrud', name:'Hijau Botanikal', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#439d5a','#62b288','#78be74','#d5aa2a'] },
  { id:'gen-hijau-pinus', group:'Hijau & Zamrud', name:'Hijau Pinus', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#358262','#4ba090','#56b370','#cab049'] },
  { id:'gen-hijau-giok', group:'Hijau & Zamrud', name:'Hijau Giok', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#359773','#4ab5a7','#5dc07e','#d3c055'] },
  { id:'gen-hijau-olive-elegan', group:'Hijau & Zamrud', name:'Hijau Olive Elegan', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#6b9146','#74a861','#a8b573','#d0a82f'] },
  { id:'gen-hijau-mint-segar', group:'Hijau & Zamrud', name:'Hijau Mint Segar', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#79c398','#9acbba','#b4dab8','#d8b93b'] },
  { id:'gen-hijau-lumut-hangat', group:'Hijau & Zamrud', name:'Hijau Lumut Hangat', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#6a9852','#79aa74','#a5b785','#cfbd59'] },
  { id:'gen-hijau-emerald-mewah', group:'Hijau & Zamrud', name:'Hijau Emerald Mewah', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#2a8454','#3da485','#42bd57','#cba534'] },
  { id:'gen-hijau-daun-muda', group:'Hijau & Zamrud', name:'Hijau Daun Muda', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#4fba5d','#79c394','#98ce8d','#d4b640'] },
  { id:'gen-hijau-cemara', group:'Hijau & Zamrud', name:'Hijau Cemara', desc:'Hijau alami yang menenangkan dan elegan', swatch:['#32865f','#46a48e','#51b869','#dcc64c'] },
  { id:'gen-kuning-mustard-hangat', group:'Kuning Keemasan & Mustard', name:'Kuning Mustard Hangat', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#b68f35','#c6be58','#d0946d','#c6a039'] },
  { id:'gen-emas-madu', group:'Kuning Keemasan & Mustard', name:'Emas Madu', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#b4902d','#c9c54a','#d29160','#cfb144'] },
  { id:'gen-kuning-keemasan-klasik', group:'Kuning Keemasan & Mustard', name:'Kuning Keemasan Klasik', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#b18225','#cdbe3c','#d58253','#d7c150'] },
  { id:'gen-mustard-antik', group:'Kuning Keemasan & Mustard', name:'Mustard Antik', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#977335','#b5a74a','#c07e5d','#d5a72a'] },
  { id:'gen-kuning-amber', group:'Kuning Keemasan & Mustard', name:'Kuning Amber', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#b1792f','#c7ae4d','#d07f62','#caae49'] },
  { id:'gen-emas-champagne', group:'Kuning Keemasan & Mustard', name:'Emas Champagne', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#c1ac67','#cbcb90','#d6bba4','#d3be55'] },
  { id:'gen-kuning-jerami-lembut', group:'Kuning Keemasan & Mustard', name:'Kuning Jerami Lembut', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#c3b683','#c7c99c','#d8c7b6','#d0a52f'] },
  { id:'gen-mustard-tembaga', group:'Kuning Keemasan & Mustard', name:'Mustard Tembaga', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#a36f33','#bda34c','#c77860','#d8b63b'] },
  { id:'gen-kuning-safron', group:'Kuning Keemasan & Mustard', name:'Kuning Safron', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#be842d','#ceb950','#d68866','#cfbb59'] },
  { id:'gen-emas-gading', group:'Kuning Keemasan & Mustard', name:'Emas Gading', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#c6be95','#c2c5a0','#d5c8b8','#cba334'] },
  { id:'gen-mustard-klasik', group:'Kuning Keemasan & Mustard', name:'Mustard Klasik', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#b88f3d','#c3ba65','#cd9879','#d4b440'] },
  { id:'gen-kuning-vanila-hangat', group:'Kuning Keemasan & Mustard', name:'Kuning Vanila Hangat', desc:'Kuning keemasan hangat bernuansa mewah', swatch:['#ccc6a4','#c0c3a2','#d4c9b9','#dcc44c'] },
  { id:'gen-terracotta-hangat', group:'Jingga & Terracotta', name:'Terracotta Hangat', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#b1522f','#c78a4d','#d06266','#c69c39'] },
  { id:'gen-jingga-senja-klasik', group:'Jingga & Terracotta', name:'Jingga Senja Klasik', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#be6837','#c89e5f','#d27b74','#cfac44'] },
  { id:'gen-terracotta-gurun', group:'Jingga & Terracotta', name:'Terracotta Gurun', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#a14f36','#ba814f','#c56369','#d7bc50'] },
  { id:'gen-jingga-karamel', group:'Jingga & Terracotta', name:'Jingga Karamel', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#ae723d','#bea260','#c98273','#d5a22a'] },
  { id:'gen-bata-elegan', group:'Jingga & Terracotta', name:'Bata Elegan', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#933f2f','#b36f42','#c25160','#caaa49'] },
  { id:'gen-jingga-tembaga', group:'Jingga & Terracotta', name:'Jingga Tembaga', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#b97446','#c1a471','#cc8c85','#d3ba55'] },
  { id:'gen-terracotta-pasir', group:'Jingga & Terracotta', name:'Terracotta Pasir', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#bc7d62','#c6aa8b','#d19e9e','#d0a02f'] },
  { id:'gen-jingga-karang-hangat', group:'Jingga & Terracotta', name:'Jingga Karang Hangat', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#ab452b','#c77c43','#d05864','#d8b13b'] },
  { id:'gen-bata-antik', group:'Jingga & Terracotta', name:'Bata Antik', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#91473b','#ad7352','#b96472','#cfb759'] },
  { id:'gen-jingga-musim-gugur', group:'Jingga & Terracotta', name:'Jingga Musim Gugur', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#af5b31','#c4924f','#ce6764','#cb9e34'] },
  { id:'gen-terracotta-sunset', group:'Jingga & Terracotta', name:'Terracotta Sunset', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#b37e56','#bda87f','#c99992','#d4af40'] },
  { id:'gen-jingga-cinnamon', group:'Jingga & Terracotta', name:'Jingga Cinnamon', desc:'Jingga hangat ala terracotta, hangat & bersahabat', swatch:['#a87038','#bda256','#c87d6a','#dcbf4c'] },
  { id:'gen-merah-marun-klasik', group:'Merah & Marun', name:'Merah Marun Klasik', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#862734','#a74439','#c13e77','#c69239'] },
  { id:'gen-merah-anggur-mewah', group:'Merah & Marun', name:'Merah Anggur Mewah', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#7a2939','#9a3f3c','#b3427a','#cfa344'] },
  { id:'gen-merah-bata-elegan', group:'Merah & Marun', name:'Merah Bata Elegan', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#8d3538','#aa5e4b','#ba5a7a','#d7b350'] },
  { id:'gen-maroon-formal', group:'Merah & Marun', name:'Maroon Formal', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#712834','#91413b','#a94272','#d5962a'] },
  { id:'gen-merah-delima', group:'Merah & Marun', name:'Merah Delima', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#91272f','#b24b38','#c74375','#caa149'] },
  { id:'gen-merah-cranberry', group:'Merah & Marun', name:'Merah Cranberry', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#842a40','#a43d3e','#bd4286','#d3b155'] },
  { id:'gen-merah-burgundy', group:'Merah & Marun', name:'Merah Burgundy', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#721d39','#952d37','#af3181','#d0952f'] },
  { id:'gen-merah-rubi-gelap', group:'Merah & Marun', name:'Merah Rubi Gelap', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#7e2535','#a03c37','#b93c78','#d8a73b'] },
  { id:'gen-merah-cherry-hangat', group:'Merah & Marun', name:'Merah Cherry Hangat', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#a13d36','#ba6f4f','#c5637a','#cfaf59'] },
  { id:'gen-merah-tua-berkelas', group:'Merah & Marun', name:'Merah Tua Berkelas', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#76232d','#974035','#b03b6c','#cb9434'] },
  { id:'gen-merah-sirsak-muda', group:'Merah & Marun', name:'Merah Sirsak Muda', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#a63e3a','#bb7358','#c66c84','#d4a540'] },
  { id:'gen-merah-merlot', group:'Merah & Marun', name:'Merah Merlot', desc:'Merah tua nan berkelas, formal dan berwibawa', swatch:['#772236','#993333','#b23879','#dcb54c'] },
  { id:'gen-abu-grafit-elegan', group:'Netral & Monokrom Elegan', name:'Abu Grafit Elegan', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#575463','#715e8d','#6f749b','#c6a339'] },
  { id:'gen-krem-gading-hangat', group:'Netral & Monokrom Elegan', name:'Krem Gading Hangat', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#9d927b','#b8b494','#c2b2a8','#cfb344'] },
  { id:'gen-taupe-lembut', group:'Netral & Monokrom Elegan', name:'Taupe Lembut', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#8f8070','#ada385','#b89f99','#d7c350'] },
  { id:'gen-abu-batu-klasik', group:'Netral & Monokrom Elegan', name:'Abu Batu Klasik', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#656972','#6c719d','#8199a7','#d5aa2a'] },
  { id:'gen-krem-pasir-netral', group:'Netral & Monokrom Elegan', name:'Krem Pasir Netral', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#a39e8f','#c2c1a3','#cdc1b7','#cab049'] },
  { id:'gen-abu-mutiara', group:'Netral & Monokrom Elegan', name:'Abu Mutiara', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#928f99','#b09dbe','#b2b1c9','#d3c055'] },
  { id:'gen-taupe-cokelat-susu', group:'Netral & Monokrom Elegan', name:'Taupe Cokelat Susu', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#8c7869','#a99a7e','#b49793','#d0a82f'] },
  { id:'gen-abu-perak-formal', group:'Netral & Monokrom Elegan', name:'Abu Perak Formal', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#676f79','#727ba1','#87a1ab','#d8b93b'] },
  { id:'gen-krem-vanila-netral', group:'Netral & Monokrom Elegan', name:'Krem Vanila Netral', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#aaa692','#c0c2a3','#d1c8bd','#cfbd59'] },
  { id:'gen-abu-slate-modern', group:'Netral & Monokrom Elegan', name:'Abu Slate Modern', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#5d6265','#627393','#759a9f','#cba534'] },
  { id:'gen-taupe-kabut-pagi', group:'Netral & Monokrom Elegan', name:'Taupe Kabut Pagi', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#958c7e','#b6af91','#c0ada5','#d4b640'] },
  { id:'gen-abu-arang-elegan', group:'Netral & Monokrom Elegan', name:'Abu Arang Elegan', desc:'Netral kalem dengan sentuhan elegan minimalis', swatch:['#4c4c57','#605681','#647290','#dcc64c'] },
  { id:'gen-pastel-peach-manis', group:'Pastel Lembut', name:'Pastel Peach Manis', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#ddbca6','#d0ba95','#deb4b0','#c69739'] },
  { id:'gen-pastel-biru-bayi', group:'Pastel Lembut', name:'Pastel Biru Bayi', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#b0cbdd','#98abcd','#b3d6db','#cfa844'] },
  { id:'gen-pastel-ungu-muda', group:'Pastel Lembut', name:'Pastel Ungu Muda', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#ccbade','#bd9cc9','#bcb6d8','#d7b850'] },
  { id:'gen-pastel-mint-segar', group:'Pastel Lembut', name:'Pastel Mint Segar', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#acd7c5','#9cc9c1','#b6d8bf','#d59c2a'] },
  { id:'gen-pastel-kuning-lembut', group:'Pastel Lembut', name:'Pastel Kuning Lembut', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#e0d8b8','#cbcd98','#dbc7b3','#caa649'] },
  { id:'gen-pastel-pink-manis', group:'Pastel Lembut', name:'Pastel Pink Manis', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#deafc3','#ce97a1','#dcb2d0','#d3b655'] },
  { id:'gen-pastel-lilac-halus', group:'Pastel Lembut', name:'Pastel Lilac Halus', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#cfc2e0','#b89fc6','#bbb7d7','#d09a2f'] },
  { id:'gen-pastel-hijau-sage', group:'Pastel Lembut', name:'Pastel Hijau Sage', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#b6d8bc','#a0c5af','#bcd5b8','#d8ac3b'] },
  { id:'gen-pastel-karamel-lembut', group:'Pastel Lembut', name:'Pastel Karamel Lembut', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#d6bda4','#cbbe9a','#dabbb4','#cfb359'] },
  { id:'gen-pastel-biru-langit', group:'Pastel Lembut', name:'Pastel Biru Langit', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#bad3de','#9cb1c9','#b5d9d9','#cb9934'] },
  { id:'gen-pastel-coral-muda', group:'Pastel Lembut', name:'Pastel Coral Muda', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#ddb0a7','#d0ad95','#ddb0b6','#d4aa40'] },
  { id:'gen-pastel-lavender-halus', group:'Pastel Lembut', name:'Pastel Lavender Halus', desc:'Pastel lembut, ringan dan menenangkan mata', swatch:['#ccc3df','#b4a0c5','#b8b8d5','#dcba4c'] },
  { id:'gen-zamrud-malam-mewah', group:'Jewel Tone Mewah', name:'Zamrud Malam Mewah', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#19573a','#2a7a67','#2f9247','#c6a039'] },
  { id:'gen-safir-kerajaan', group:'Jewel Tone Mewah', name:'Safir Kerajaan', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#182f62','#282e86','#2d719f','#cfb144'] },
  { id:'gen-ametis-gelap-elegan', group:'Jewel Tone Mewah', name:'Ametis Gelap Elegan', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#381551','#662574','#462a8d','#d7c150'] },
  { id:'gen-ruby-malam', group:'Jewel Tone Mewah', name:'Ruby Malam', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#571924','#7a2f2a','#922f5e','#d5a72a'] },
  { id:'gen-topaz-madu-gelap', group:'Jewel Tone Mewah', name:'Topaz Madu Gelap', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#6a501b','#8d832a','#a75b2f','#caae49'] },
  { id:'gen-garnet-anggur', group:'Jewel Tone Mewah', name:'Garnet Anggur', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#4e182a','#702930','#883068','#d3be55'] },
  { id:'gen-giok-kekaisaran', group:'Jewel Tone Mewah', name:'Giok Kekaisaran', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#1f5c3b','#317d66','#379547','#d0a52f'] },
  { id:'gen-onyx-ungu-dalam', group:'Jewel Tone Mewah', name:'Onyx Ungu Dalam', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#2a1943','#502c63','#3b337a','#d8b63b'] },
  { id:'gen-peridot-hutan-malam', group:'Jewel Tone Mewah', name:'Peridot Hutan Malam', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#305e26','#3b7d3f','#689442','#cfbb59'] },
  { id:'gen-aquamarine-dalam', group:'Jewel Tone Mewah', name:'Aquamarine Dalam', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#1c4b54','#2e5976','#348d82','#cba334'] },
  { id:'gen-opal-senja-gelap', group:'Jewel Tone Mewah', name:'Opal Senja Gelap', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#5b3320','#7b5c32','#933c39','#d4b440'] },
  { id:'gen-batu-delima-tua', group:'Jewel Tone Mewah', name:'Batu Delima Tua', desc:'Warna permata pekat yang mewah dan dramatis', swatch:['#50161c','#733026','#8c2c52','#dcc44c'] },
];

/* Urutan tampil grup di menu pilihan tema (grup yang tidak ada di daftar
   ini otomatis ditaruh paling akhir, urut sesuai kemunculan). */
const THEME_GROUP_ORDER = [
  'Palet warna', 'Tema saya',
  'Merah Muda & Rose Gold', 'Ungu & Lavender', 'Biru & Navy', 'Tosca & Pirus',
  'Hijau & Zamrud', 'Kuning Keemasan & Mustard', 'Jingga & Terracotta',
  'Merah & Marun', 'Netral & Monokrom Elegan', 'Pastel Lembut', 'Jewel Tone Mewah',
  'Tema alam, hewan & lainnya'
];
/* Grup yang otomatis terbuka (tidak dilipat) saat pertama kali dibuka */
const THEME_GROUP_OPEN_BY_DEFAULT = ['Palet warna', 'Tema saya'];

/* =========================================================================
   GENERATOR WARNA — mengubah 4 warna dasar (utama/kedua/aksen/emas) jadi
   satu set variabel CSS lengkap (versi gelap, pucat, tinta teks, latar,
   dst.) secara otomatis, dengan sedikit penyesuaian saturasi/kecerahan
   supaya kombinasi apa pun yang dipilih pengguna tetap enak dibaca &
   terlihat rapi. Dipakai baik untuk 132 palet siap pakai di atas maupun
   untuk fitur "Buat Palet Sendiri".
   ========================================================================= */
const CUSTOM_THEME_VAR_NAMES = ['--purple','--purple-dark','--purple-deep','--purple-soft','--violet','--pink','--lilac','--gold','--gold-dark','--gold-soft','--ink','--ink-soft','--line','--bg','--glow1','--glow2','--glow3','--shadow-rgb'];

function hexToHsl(hex) {
  hex = (hex || '#999999').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16) / 255, g = parseInt(hex.substr(2, 2), 16) / 255, b = parseInt(hex.substr(4, 2), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}
function hexToRgbStr(hex) {
  hex = (hex || '#999999').replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
  return r + ',' + g + ',' + b;
}
function clampNum(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* colors = [warnaUtama, warnaKedua, warnaAksen, warnaEmas] (hex). Mengembalikan
   object {'--purple':'#...', ...} siap diterapkan lewat style.setProperty. */
function deriveThemeVars(colors) {
  const [purpleHex, violetHex, pinkHex, goldHex] = colors;
  let P = hexToHsl(purpleHex); P = { h: P.h, s: clampNum(P.s, 32, 95), l: clampNum(P.l, 24, 60) };
  let V = hexToHsl(violetHex); V = { h: V.h, s: clampNum(V.s, 28, 95), l: clampNum(V.l, 30, 72) };
  let K = hexToHsl(pinkHex); K = { h: K.h, s: clampNum(K.s, 26, 95), l: clampNum(K.l, 34, 78) };
  let G = hexToHsl(goldHex); G = { h: G.h, s: clampNum(G.s, 32, 95), l: clampNum(G.l, 36, 68) };

  const purple = hslToHex(P.h, P.s, P.l);
  const purpleDark = hslToHex(P.h, Math.min(P.s + 8, 95), Math.max(P.l - 18, 12));
  const purpleDeep = hslToHex(P.h, Math.min(P.s + 14, 95), Math.max(P.l - 32, 8));
  const purpleSoft = hslToHex(P.h, Math.max(P.s - 45, 10), Math.min(P.l + 42, 96));
  const lilac = hslToHex(P.h, Math.max(P.s - 18, 18), Math.min(P.l + 30, 82));

  const violet = hslToHex(V.h, V.s, V.l);
  const pink = hslToHex(K.h, K.s, K.l);

  const gold = hslToHex(G.h, G.s, G.l);
  const goldDark = hslToHex(G.h, Math.min(G.s + 5, 95), Math.max(G.l - 20, 15));
  const goldSoft = hslToHex(G.h, Math.max(G.s - 40, 8), Math.min(G.l + 40, 96));

  const ink = hslToHex(P.h, Math.min(P.s * 0.55, 45), 14);
  const inkSoft = hslToHex(P.h, Math.min(P.s * 0.4, 35), 52);
  const line = hslToHex(P.h, Math.max(P.s * 0.22, 8), 90);
  const bg = hslToHex(P.h, Math.max(P.s * 0.10, 4), 97.5);

  const glow1 = hslToHex(K.h, Math.max(K.s * 0.55, 22), 90);
  const glow2 = hslToHex(V.h, Math.max(V.s * 0.5, 18), 91);
  const glow3 = hslToHex(G.h, Math.max(G.s * 0.45, 18), 92);

  const shadowRgb = hexToRgbStr(purpleDark);

  return {
    '--purple': purple, '--purple-dark': purpleDark, '--purple-deep': purpleDeep, '--purple-soft': purpleSoft,
    '--violet': violet, '--pink': pink, '--lilac': lilac,
    '--gold': gold, '--gold-dark': goldDark, '--gold-soft': goldSoft,
    '--ink': ink, '--ink-soft': inkSoft, '--line': line, '--bg': bg,
    '--glow1': glow1, '--glow2': glow2, '--glow3': glow3,
    '--shadow-rgb': shadowRgb
  };
}

function clearCustomThemeVars() {
  CUSTOM_THEME_VAR_NAMES.forEach(v => document.documentElement.style.removeProperty(v));
}
function applyGeneratedVars(colors) {
  const vars = deriveThemeVars(colors);
  Object.keys(vars).forEach(k => document.documentElement.style.setProperty(k, vars[k]));
  return vars;
}

/* --------- tema kustom buatan pengguna sendiri (fitur "Buat Palet Sendiri") --------- */
const CUSTOM_THEME_KEY = 'bukukelas_custom_themes_v1';
const CUSTOM_LIVE_KEY = 'bukukelas_custom_live_v1';

function loadCustomThemes() {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function saveCustomThemes(list) {
  try { localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(list)); } catch (e) {}
}
function loadCustomLiveColors() {
  try {
    const raw = localStorage.getItem(CUSTOM_LIVE_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return (Array.isArray(arr) && arr.length === 4) ? arr : null;
  } catch (e) { return null; }
}
function saveCustomLiveColors(colors) {
  try { localStorage.setItem(CUSTOM_LIVE_KEY, JSON.stringify(colors)); } catch (e) {}
}

function findThemeSeed(id) {
  const gen = GENERATED_PALETTES.find(t => t.id === id);
  if (gen) return gen;
  const custom = loadCustomThemes().find(t => t.id === id);
  if (custom) return { id: custom.id, name: custom.name, swatch: custom.colors };
  return null;
}

function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (!t) return DEFAULT_THEME;
    if (THEMES.some(th => th.id === t)) return t;
    if (t === 'custom-live' && loadCustomLiveColors()) return t;
    if (findThemeSeed(t)) return t;
    return DEFAULT_THEME;
  } catch (e) {
    return DEFAULT_THEME;
  }
}

function applyTheme(id) {
  let theme = id;
  let swatchFirst = null;

  const legacy = THEMES.find(t => t.id === id);
  if (legacy) {
    clearCustomThemeVars();
    document.documentElement.setAttribute('data-theme', theme);
    swatchFirst = legacy.swatch[0];
  } else if (id === 'custom-live' && loadCustomLiveColors()) {
    document.documentElement.setAttribute('data-theme', 'custom');
    const colors = loadCustomLiveColors();
    const vars = applyGeneratedVars(colors);
    swatchFirst = colors[0];
    theme = 'custom-live';
  } else {
    const seed = findThemeSeed(id);
    if (seed) {
      document.documentElement.setAttribute('data-theme', 'custom');
      applyGeneratedVars(seed.swatch);
      swatchFirst = seed.swatch[0];
      theme = seed.id;
    } else {
      clearCustomThemeVars();
      theme = DEFAULT_THEME;
      document.documentElement.setAttribute('data-theme', theme);
      swatchFirst = THEMES.find(t => t.id === theme).swatch[0];
    }
  }

  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && swatchFirst) meta.setAttribute('content', swatchFirst);
  renderThemePicker(theme);
}

function renderThemePicker(activeId, query) {
  const root = document.getElementById('themePickerRoot');
  if (!root) return;
  activeId = activeId || loadTheme();
  query = (query || '').trim().toLowerCase();

  const customThemes = loadCustomThemes().map(c => ({ id: c.id, group: 'Tema saya', name: c.name, desc: 'Palet buatan Anda sendiri', swatch: c.colors }));
  const all = [...THEMES, ...customThemes, ...GENERATED_PALETTES];

  const groupsPresent = [];
  all.forEach(t => { if (!groupsPresent.includes(t.group)) groupsPresent.push(t.group); });
  const orderedGroups = [
    ...THEME_GROUP_ORDER.filter(g => groupsPresent.includes(g)),
    ...groupsPresent.filter(g => !THEME_GROUP_ORDER.includes(g))
  ];

  let anyMatch = false;
  const html = orderedGroups.map(g => {
    let items = all.filter(t => t.group === g);
    if (query) items = items.filter(t => t.name.toLowerCase().includes(query) || (t.desc || '').toLowerCase().includes(query));
    if (!items.length) return '';
    anyMatch = true;
    const openAttr = (THEME_GROUP_OPEN_BY_DEFAULT.includes(g) || query) ? ' open' : '';
    return `
    <details class="theme-group"${openAttr}>
      <summary class="theme-group-label">${g}<span class="theme-group-count">${items.length}</span></summary>
      <div class="theme-grid">
        ${items.map(t => `
          <button type="button" class="theme-swatch-btn${t.id === activeId ? ' is-active' : ''}" data-theme-id="${t.id}">
            <span class="theme-dots">${t.swatch.map(c => `<span class="theme-dot" style="background:${c}"></span>`).join('')}</span>
            <span class="theme-swatch-name">${t.name}<small>${t.desc}</small></span>
            ${t.group === 'Tema saya' ? `<span class="theme-swatch-del" data-del-custom="${t.id}" title="Hapus palet ini">✕</span>` : ''}
          </button>`).join('')}
      </div>
    </details>`;
  }).join('');

  root.innerHTML = html || '<p class="hint" style="margin:8px 0">Tidak ada palet warna yang cocok dengan pencarian.</p>';

  root.querySelectorAll('.theme-swatch-btn').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-del-custom]')) return;
      const id = btn.dataset.themeId;
      applyTheme(id);
      const t = all.find(x => x.id === id);
      toast('Tema tampilan diganti: ' + (t ? t.name : id));
      syncCustomBuilderInputs();
    });
  });
  root.querySelectorAll('[data-del-custom]').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const id = el.dataset.delCustom;
      const list = loadCustomThemes();
      const t = list.find(x => x.id === id);
      if (!confirm(`Hapus palet "${t ? t.name : ''}" ini?`)) return;
      saveCustomThemes(list.filter(x => x.id !== id));
      if (loadTheme() === id) applyTheme(DEFAULT_THEME);
      else renderThemePicker(loadTheme(), query);
      renderCustomThemeList();
      toast('Palet dihapus.');
    });
  });
}

const themeSearchInput = document.getElementById('themeSearchInput');
if (themeSearchInput) {
  themeSearchInput.addEventListener('input', () => renderThemePicker(loadTheme(), themeSearchInput.value));
}

/* =========================================================================
   FITUR "BUAT PALET SENDIRI" — pengguna memilih (klik warna atau geser
   penggeser rona) 4 warna dasar, lalu langsung melihat hasilnya diterapkan
   ke seluruh tampilan aplikasi secara langsung (live preview). Bisa
   disimpan dengan nama sendiri supaya muncul juga di daftar "Tema saya"
   di atas dan bisa dipakai lagi kapan saja.
   ========================================================================= */
const CUSTOM_ROLES = [
  { key: 'purple', label: 'Warna utama', hint: 'Tombol, ikon aktif & aksen utama' },
  { key: 'violet', label: 'Warna kedua', hint: 'Aksen pendamping warna utama' },
  { key: 'pink', label: 'Warna aksen', hint: 'Highlight & elemen penarik perhatian' },
  { key: 'gold', label: 'Warna emas/highlight', hint: 'Ikon bintang, lencana & sorotan' }
];
let customBuilderColors = null; // array 4 hex, disinkron dgn input saat dibuka

function currentAppliedColorsForRole() {
  const activeId = loadTheme();
  if (activeId === 'custom-live') return loadCustomLiveColors() || ['#9D00FF', '#6D28D9', '#FF2E88', '#E8B923'];
  const seed = findThemeSeed(activeId);
  if (seed) return seed.swatch.slice(0, 4);
  const legacy = THEMES.find(t => t.id === activeId);
  if (legacy) return legacy.swatch.slice(0, 4);
  return ['#9D00FF', '#6D28D9', '#FF2E88', '#E8B923'];
}

function renderCustomThemeBuilder() {
  const root = document.getElementById('customThemeBuilderRoot');
  if (!root) return;
  if (!customBuilderColors) customBuilderColors = currentAppliedColorsForRole();

  root.innerHTML = `
    <div class="palette-builder">
      <div class="palette-role-list">
        ${CUSTOM_ROLES.map((r, i) => `
          <div class="palette-role-row">
            <div class="palette-role-text"><strong>${r.label}</strong><small>${r.hint}</small></div>
            <input type="color" class="palette-color-input" data-role-idx="${i}" value="${customBuilderColors[i]}">
            <input type="range" min="0" max="360" class="palette-hue-slider" data-role-idx="${i}" value="${Math.round(hexToHsl(customBuilderColors[i]).h)}">
          </div>`).join('')}
      </div>
      <div class="palette-preview-row" id="paletteLivePreviewDots"></div>
      <div class="palette-builder-actions">
        <button type="button" class="btn btn-line" id="btnRandomPalette">🎲 Acak warna</button>
        <button type="button" class="btn btn-line" id="btnResetPalette">↺ Kembalikan semula</button>
        <input type="text" id="customPaletteNameInput" placeholder="Nama palet, mis. Favoritku" maxlength="40">
        <button type="button" class="btn btn-primary" id="btnSavePalette">💾 Simpan sebagai tema saya</button>
      </div>
      <p class="hint" style="margin:10px 0 0">Klik kotak warna untuk memilih warna persis, atau geser penggeser di sampingnya untuk mengubah rona (hue) warna tersebut. Perubahan langsung terlihat di seluruh tampilan aplikasi.</p>
    </div>`;

  bindCustomThemeBuilder();
  updatePaletteLivePreviewDots();
  renderCustomThemeList();
}

function updatePaletteLivePreviewDots() {
  const wrap = document.getElementById('paletteLivePreviewDots');
  if (!wrap) return;
  wrap.innerHTML = customBuilderColors.map(c => `<span class="theme-dot theme-dot-lg" style="background:${c}"></span>`).join('');
}

function applyCustomLive() {
  applyGeneratedVars(customBuilderColors);
  saveCustomLiveColors(customBuilderColors);
  try { localStorage.setItem(THEME_STORAGE_KEY, 'custom-live'); } catch (e) {}
  document.documentElement.setAttribute('data-theme', 'custom');
  updatePaletteLivePreviewDots();
  renderThemePicker('custom-live', themeSearchInput ? themeSearchInput.value : '');
}

function bindCustomThemeBuilder() {
  const root = document.getElementById('customThemeBuilderRoot');
  if (!root) return;

  root.querySelectorAll('.palette-color-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = +inp.dataset.roleIdx;
      customBuilderColors[idx] = inp.value;
      const slider = root.querySelector(`.palette-hue-slider[data-role-idx="${idx}"]`);
      if (slider) slider.value = Math.round(hexToHsl(inp.value).h);
      applyCustomLive();
    });
  });
  root.querySelectorAll('.palette-hue-slider').forEach(sl => {
    sl.addEventListener('input', () => {
      const idx = +sl.dataset.roleIdx;
      const cur = hexToHsl(customBuilderColors[idx]);
      const s = cur.s < 15 ? 55 : cur.s; // kalau warna awal abu-abu, beri saturasi supaya rona terlihat
      const l = cur.l < 20 || cur.l > 85 ? 50 : cur.l;
      const newHex = hslToHex(+sl.value, s, l);
      customBuilderColors[idx] = newHex;
      const colorInput = root.querySelector(`.palette-color-input[data-role-idx="${idx}"]`);
      if (colorInput) colorInput.value = newHex;
      applyCustomLive();
    });
  });

  const btnRandom = document.getElementById('btnRandomPalette');
  if (btnRandom) btnRandom.addEventListener('click', () => {
    const baseHue = Math.floor(Math.random() * 360);
    customBuilderColors = [
      hslToHex(baseHue, 55 + Math.random() * 25, 40 + Math.random() * 15),
      hslToHex(baseHue + 20 + Math.random() * 30, 45 + Math.random() * 25, 45 + Math.random() * 15),
      hslToHex(baseHue - 30 - Math.random() * 40, 40 + Math.random() * 30, 55 + Math.random() * 15),
      hslToHex(38 + Math.random() * 20, 50 + Math.random() * 30, 45 + Math.random() * 15)
    ];
    renderCustomThemeBuilder();
    applyCustomLive();
  });

  const btnReset = document.getElementById('btnResetPalette');
  if (btnReset) btnReset.addEventListener('click', () => {
    customBuilderColors = null;
    applyTheme(DEFAULT_THEME);
    renderCustomThemeBuilder();
    toast('Kembali ke tema bawaan.');
  });

  const btnSave = document.getElementById('btnSavePalette');
  if (btnSave) btnSave.addEventListener('click', () => {
    const nameInput = document.getElementById('customPaletteNameInput');
    const name = (nameInput.value || '').trim() || 'Palet Saya ' + (loadCustomThemes().length + 1);
    const id = 'custom-' + Date.now();
    const list = loadCustomThemes();
    list.push({ id, name, colors: customBuilderColors.slice() });
    saveCustomThemes(list);
    applyTheme(id);
    nameInput.value = '';
    renderCustomThemeList();
    toast('Palet "' + name + '" disimpan ke Tema saya.');
  });
}

function syncCustomBuilderInputs() {
  // dipanggil saat pengguna memilih tema lain dari daftar, supaya kalau
  // mereka buka pembuat palet lagi, warnanya mulai dari tema yang aktif.
  customBuilderColors = null;
}

function renderCustomThemeList() {
  const root = document.getElementById('customThemeListRoot');
  if (!root) return;
  const list = loadCustomThemes();
  if (!list.length) { root.innerHTML = '<p class="hint" style="margin:10px 0 0">Belum ada palet tersimpan. Atur warna di atas lalu klik "Simpan sebagai tema saya".</p>'; return; }
  root.innerHTML = `<div class="theme-grid" style="margin-top:12px">${list.map(c => `
    <button type="button" class="theme-swatch-btn${loadTheme() === c.id ? ' is-active' : ''}" data-apply-custom="${c.id}">
      <span class="theme-dots">${c.colors.map(cl => `<span class="theme-dot" style="background:${cl}"></span>`).join('')}</span>
      <span class="theme-swatch-name">${c.name}<small>Palet buatan Anda</small></span>
      <span class="theme-swatch-del" data-del-custom2="${c.id}" title="Hapus palet ini">✕</span>
    </button>`).join('')}</div>`;
  root.querySelectorAll('[data-apply-custom]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-del-custom2]')) return;
      const id = btn.dataset.applyCustom;
      applyTheme(id);
      customBuilderColors = null;
      renderCustomThemeBuilder();
      toast('Tema tampilan diganti.');
    });
  });
  root.querySelectorAll('[data-del-custom2]').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const id = el.dataset.delCustom2;
      const l = loadCustomThemes();
      const t = l.find(x => x.id === id);
      if (!confirm(`Hapus palet "${t ? t.name : ''}" ini?`)) return;
      saveCustomThemes(l.filter(x => x.id !== id));
      if (loadTheme() === id) applyTheme(DEFAULT_THEME);
      renderCustomThemeList();
      renderThemePicker(loadTheme());
      toast('Palet dihapus.');
    });
  });
}

applyTheme(loadTheme());
renderCustomThemeBuilder();

let state = loadState();

/* ---------------------------- util dasar ---------------------------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    // gabungkan supaya field baru tetap ada saat update aplikasi
    return Object.assign(structuredClone(DEFAULT_STATE), parsed, {
      settings: Object.assign({}, DEFAULT_STATE.settings, parsed.settings || {})
    });
  } catch (e) {
    console.error('Gagal memuat data lokal', e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleAutoSync();
}

/* ---------------------------- sinkron otomatis (tanpa perlu klik) ---------------------------- */
/* Setiap perubahan data (nilai, absensi, dst.) langsung tersimpan ke
   localStorage (lihat saveState di atas) lalu dijadwalkan untuk otomatis
   dikirim ke Google Spreadsheet beberapa saat kemudian — tidak perlu klik
   "Kirim ke Spreadsheet" lagi. Kalau sedang offline, pengiriman otomatis
   ditunda (data tetap aman tersimpan di perangkat) dan akan dicoba lagi
   otomatis begitu koneksi internet kembali tersedia. */
let autoSyncTimer = null;

function scheduleAutoSync() {
  updateSyncBadge();
  if (!state.settings.sheetsUrl) return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(attemptAutoSync, 1200);
}

async function attemptAutoSync() {
  if (!state.settings.sheetsUrl) return;
  if (!hasUnsyncedChanges()) { updateSyncBadge(); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { updateSyncBadge(); return; }
  await syncToSheets(true);
}

/* Begitu koneksi internet kembali online, langsung coba kirim perubahan
   yang sempat tertunda saat offline. */
window.addEventListener('online', () => {
  updateSyncBadge();
  if (state.settings.sheetsUrl && hasUnsyncedChanges()) {
    toast('Koneksi internet kembali — mengirim perubahan yang tertunda…');
    attemptAutoSync();
  }
});
window.addEventListener('offline', () => { updateSyncBadge(); });

/* Jaring pengaman: kalau event 'online' tidak terpicu (kadang terjadi di
   beberapa peramban HP), coba lagi tiap 30 detik selama masih ada
   perubahan yang belum terkirim dan koneksi terlihat tersedia. */
setInterval(() => {
  if (state.settings.sheetsUrl && hasUnsyncedChanges() && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    attemptAutoSync();
  }
}, 30000);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/* Ringkasan (hash sederhana) dari seluruh data inti — dipakai untuk mendeteksi
   apakah ada perubahan lokal yang BELUM dikirim ke Spreadsheet, supaya
   aplikasi tidak diam-diam menimpa perubahan itu saat mengambil data terbaru. */
function coreSnapshotStr() {
  return JSON.stringify({
    classes: state.classes, students: state.students, attendance: state.attendance,
    activityPoints: state.activityPoints, activityNotes: state.activityNotes, grades: state.grades,
    praktikum: state.praktikum, jurnalMengajar: state.jurnalMengajar,
    schedule: state.schedule, modules: state.modules,
    activityCategories: state.activityCategories,
    weights: state.settings.weights, enableUlisan: state.settings.enableUlisan,
    guruNama: state.settings.guru.nama, activeYear: state.settings.activeYear
  });
}
function hasUnsyncedChanges() {
  return state.settings.sheetsUrl && state.settings.syncedSnapshot !== coreSnapshotStr();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDateID(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('is-show'), 2600);
}

function studentsOf(classId) {
  return state.students.filter(s => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

function classById(id) { return state.classes.find(c => c.id === id); }
function studentById(id) { return state.students.find(s => s.id === id); }

/* ---------------------------- tahun ajaran (arsip kelas) ---------------------------- */

/* Tahun ajaran yang sedang berjalan. Kalau belum pernah diatur (mis. baru
   saja update dari versi lama), dianggap kosong — supaya SEMUA kelas lama
   tetap dianggap "berjalan" dan tidak tiba-tiba hilang dari pilihan
   kelas aktif setelah update. */
function getActiveYear() { return (state.settings.activeYear || '').trim(); }

/* Kelas dianggap "aktif" (kelas yang sedang berjalan) kalau: belum ada tahun
   ajaran diatur sama sekali, ATAU kelas itu tidak diisi tahun ajarannya
   (data lama), ATAU tahun ajarannya sama dengan tahun ajaran berjalan.
   Kelas dengan tahun ajaran yang berbeda dianggap arsip. */
function isClassActive(c) {
  if (!c) return false;
  const active = getActiveYear();
  if (!active) return true;
  return !c.year || !c.year.trim() || c.year.trim() === active;
}

/* Daftar kelas yang tampil di pemilihan "Kelas aktif" & seluruh menu operasional
   (Absensi, Nilai, Keaktifan, Praktikum, Jurnal Mengajar, Jadwal, Modul Ajar,
   Rekap) — supaya kelas dari tahun ajaran lama tidak mengganggu tampilan. */
function activeClasses() { return state.classes.filter(isClassActive); }

/* Semua nilai tahun ajaran yang pernah dipakai (dari kelas yang ada) plus
   tahun ajaran berjalan, diurutkan dari yang terbaru. Dipakai untuk mengisi
   pilihan filter arsip di menu Kelas & Siswa. */
function academicYearsList() {
  const set = new Set();
  state.classes.forEach(c => { if (c.year && c.year.trim()) set.add(c.year.trim()); });
  const active = getActiveYear();
  if (active) set.add(active);
  return Array.from(set).sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || ['0'])[0], 10);
    const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10);
    if (nb !== na) return nb - na;
    return b.localeCompare(a, 'id');
  });
}

/* Menyarankan nama tahun ajaran berikutnya, mis. "2026/2027" -> "2027/2028". */
function suggestNextYear(year) {
  const range = (year || '').match(/(\d{4})\s*\/\s*(\d{4})/);
  if (range) return `${parseInt(range[1], 10) + 1}/${parseInt(range[2], 10) + 1}`;
  const single = (year || '').match(/\d{4}/);
  if (single) { const y = parseInt(single[0], 10); return `${y + 1}/${y + 2}`; }
  const y = new Date().getFullYear();
  return `${y}/${y + 1}`;
}

/* ---------------------------- konteks global ---------------------------- */

const globalKelasSelect = document.getElementById('globalKelasSelect');
const globalDate = document.getElementById('globalDate');
globalDate.value = todayStr();

function getCtx() {
  return { classId: globalKelasSelect.value, date: globalDate.value };
}

/* Dipakai di seluruh menu operasional (topbar "Kelas aktif", Jadwal, Modul
   Ajar, dst) — hanya menampilkan kelas dari tahun ajaran yang sedang
   berjalan, supaya kelas arsip tidak mengganggu tampilan kelas yang sedang
   berjalan. Untuk melihat/menelusuri kelas arsip, gunakan filter tahun
   ajaran di menu "Kelas & Siswa". */
function refreshKelasOptions() {
  const list = activeClasses();
  const opts = ['<option value="">— pilih kelas —</option>']
    .concat(list.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`));
  const prevGlobal = globalKelasSelect.value;
  globalKelasSelect.innerHTML = opts.join('');
  if (list.some(c => c.id === prevGlobal)) globalKelasSelect.value = prevGlobal;
  else if (list.length) globalKelasSelect.value = list[0].id;

  renderKelasYearFilterOptions();
  refreshSiswaKelasFilterOptions();
}

/* Filter tahun ajaran di menu Kelas & Siswa — menentukan tahun ajaran mana
   yang ditampilkan di tabel Kelas & daftar Siswa (termasuk kelas arsip). */
function renderKelasYearFilterOptions() {
  const sel = document.getElementById('kelasYearFilter');
  if (!sel) return;
  const years = academicYearsList();
  const active = getActiveYear();
  const prev = sel.value;
  sel.innerHTML = '<option value="">Semua tahun ajaran</option>' +
    years.map(y => `<option value="${escapeHtml(y)}">${escapeHtml(y)}${y === active ? ' (berjalan)' : ' (arsip)'}</option>`).join('');
  if (sel.dataset.userSet === '1' && (years.includes(prev) || prev === '')) sel.value = prev;
  else sel.value = active || '';

  const label = document.getElementById('activeYearLabel');
  if (label) label.textContent = active || 'Belum diatur';

  if (!sel.dataset.wired) {
    sel.addEventListener('change', () => {
      sel.dataset.userSet = '1';
      renderKelasTable();
      refreshSiswaKelasFilterOptions();
      renderSiswaTable();
    });
    sel.dataset.wired = '1';
  }
}

/* Kelas-kelas yang cocok dengan filter tahun ajaran di menu Kelas & Siswa
   ("" / kosong berarti semua tahun ajaran, termasuk arsip). */
function classesForYearFilter() {
  const sel = document.getElementById('kelasYearFilter');
  const val = sel ? sel.value : '';
  if (!val) return state.classes.slice();
  return state.classes.filter(c => (c.year || '').trim() === val);
}

function refreshSiswaKelasFilterOptions() {
  const filt = document.getElementById('siswaKelasFilter');
  if (!filt) return;
  const list = classesForYearFilter();
  const prevFilt = filt.value;
  filt.innerHTML = '<option value="">Semua kelas (tahun ajaran terpilih)</option>' +
    list.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  if (list.some(c => c.id === prevFilt)) filt.value = prevFilt;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------------------- navigasi antar view ---------------------------- */

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => { switchView(btn.dataset.view); closeMobileNav(); });
});

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + view));
  renderAll();
}

/* ---------------------------- menu mobile (hamburger) ---------------------------- */

function openMobileNav() {
  document.getElementById('sideNav').classList.add('is-open');
  document.getElementById('mobileNavBackdrop').classList.add('is-open');
  document.body.classList.add('no-scroll');
}
function closeMobileNav() {
  document.getElementById('sideNav').classList.remove('is-open');
  document.getElementById('mobileNavBackdrop').classList.remove('is-open');
  document.body.classList.remove('no-scroll');
}
document.getElementById('mobileMenuBtn').addEventListener('click', openMobileNav);
document.getElementById('mobileNavClose').addEventListener('click', closeMobileNav);
document.getElementById('mobileNavBackdrop').addEventListener('click', closeMobileNav);

globalKelasSelect.addEventListener('change', renderAll);
globalDate.addEventListener('change', renderAll);

/* =========================================================================
   MODAL sederhana (dipakai untuk tambah/edit kelas & siswa)
   ========================================================================= */

const modalBackdrop = document.getElementById('modalBackdrop');
const modalBox = document.getElementById('modalBox');

function openModal(html, onMount) {
  modalBox.innerHTML = html;
  modalBackdrop.classList.add('is-open');
  if (onMount) onMount(modalBox);
}
function closeModal() {
  modalBackdrop.classList.remove('is-open');
  modalBox.innerHTML = '';
}
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

/* =========================================================================
   KELAS & SISWA
   ========================================================================= */

document.getElementById('addKelasBtn').addEventListener('click', () => openKelasModal());

function openKelasModal(existing) {
  const isEdit = !!existing;
  // Kelas baru mengikuti tahun ajaran yang sedang difilter/ditampilkan (atau
  // tahun ajaran berjalan kalau filternya "Semua"), supaya tidak perlu ketik ulang.
  const yearSel = document.getElementById('kelasYearFilter');
  const defaultYear = (yearSel && yearSel.value) || getActiveYear();
  openModal(`
    <h3>${isEdit ? 'Edit kelas' : 'Tambah kelas'}</h3>
    <div class="form-row">
      <label class="ctx-field"><span>Nama kelas</span><input id="mKelasNama" type="text" placeholder="Misal: IX-A" value="${escapeHtml(existing?.name || '')}"></label>
    </div>
    <div class="form-row">
      <label class="ctx-field"><span>Mata pelajaran</span><input id="mKelasMapel" type="text" placeholder="IPA" value="${escapeHtml(existing?.subject || 'IPA')}"></label>
      <label class="ctx-field"><span>Tahun ajaran</span><input id="mKelasTahun" type="text" placeholder="2026/2027" value="${escapeHtml(existing ? (existing.year || '') : defaultYear)}"></label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-line" id="mCancel">Batal</button>
      <button class="btn btn-primary" id="mSave">Simpan</button>
    </div>
  `, box => {
    box.querySelector('#mCancel').onclick = closeModal;
    box.querySelector('#mSave').onclick = () => {
      const name = box.querySelector('#mKelasNama').value.trim();
      if (!name) { toast('Nama kelas wajib diisi'); return; }
      if (isEdit) {
        existing.name = name;
        existing.subject = box.querySelector('#mKelasMapel').value.trim();
        existing.year = box.querySelector('#mKelasTahun').value.trim();
      } else {
        state.classes.push({ id: uid(), name, subject: box.querySelector('#mKelasMapel').value.trim(), year: box.querySelector('#mKelasTahun').value.trim() });
      }
      saveState(); closeModal(); refreshKelasOptions(); renderAll();
      toast('Kelas disimpan');
    };
  });
}

/* Membuka tahun ajaran baru: kelas-kelas lama TIDAK dihapus/diubah — hanya
   menu "tahun ajaran berjalan" yang berpindah, sehingga kelas lama otomatis
   dianggap arsip (tetap terlihat lewat filter tahun ajaran) dan pilihan
   "Kelas aktif" di seluruh aplikasi mulai bersih untuk tahun ajaran baru. */
document.getElementById('newYearBtn').addEventListener('click', () => {
  const current = getActiveYear();
  const suggestion = suggestNextYear(current);
  openModal(`
    <h3>Mulai tahun ajaran baru</h3>
    <p class="hint" style="margin-top:0">Kelas dari tahun ajaran <strong>${escapeHtml(current || 'saat ini')}</strong> akan tetap tersimpan sebagai arsip (tidak terhapus). Setelah tahun ajaran baru dibuat, tambahkan kelas-kelas baru Anda dari sini.</p>
    <div class="form-row">
      <label class="ctx-field" style="width:100%"><span>Nama tahun ajaran baru</span><input id="mTahunBaru" type="text" placeholder="2027/2028" value="${escapeHtml(suggestion)}"></label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-line" id="mCancel">Batal</button>
      <button class="btn btn-primary" id="mSave">Mulai tahun ajaran ini</button>
    </div>
  `, box => {
    box.querySelector('#mCancel').onclick = closeModal;
    box.querySelector('#mSave').onclick = () => {
      const val = box.querySelector('#mTahunBaru').value.trim();
      if (!val) { toast('Nama tahun ajaran wajib diisi'); return; }
      state.settings.activeYear = val;
      saveState(); closeModal(); refreshKelasOptions(); renderAll();
      const sel = document.getElementById('kelasYearFilter');
      if (sel) { sel.dataset.userSet = '1'; sel.value = val; renderKelasTable(); refreshSiswaKelasFilterOptions(); renderSiswaTable(); }
      toast(`Tahun ajaran ${val} dimulai. Tambahkan kelas baru untuk tahun ajaran ini.`);
    };
  });
});

function renderKelasTable() {
  const tbody = document.querySelector('#kelasTable tbody');
  const list = classesForYearFilter();
  if (!state.classes.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Belum ada kelas. Tambahkan kelas pertama Anda.</td></tr>';
    return;
  }
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Tidak ada kelas untuk tahun ajaran ini.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(c => {
    const aktif = isClassActive(c);
    return `
    <tr>
      <td data-label="Nama kelas">${escapeHtml(c.name)}</td>
      <td data-label="Mapel">${escapeHtml(c.subject)}</td>
      <td data-label="Tahun ajaran">${escapeHtml(c.year || '—')}</td>
      <td data-label="Status"><span class="badge ${aktif ? 'badge-aktif' : 'badge-arsip'}">${aktif ? 'Aktif' : 'Arsip'}</span></td>
      <td data-label="Jumlah siswa" class="numcell">${studentsOf(c.id).length}</td>
      <td>
        <button class="btn btn-line" data-edit-kelas="${c.id}">Edit</button>
        <button class="btn btn-line" data-del-kelas="${c.id}" style="color:#E1547A">Hapus</button>
      </td>
    </tr>
  `;
  }).join('');
  tbody.querySelectorAll('[data-edit-kelas]').forEach(b => b.onclick = () => openKelasModal(classById(b.dataset.editKelas)));
  tbody.querySelectorAll('[data-del-kelas]').forEach(b => b.onclick = () => {
    if (!confirm('Hapus kelas ini beserta seluruh data siswa, absensi, dan nilainya?')) return;
    const id = b.dataset.delKelas;
    state.classes = state.classes.filter(c => c.id !== id);
    state.students = state.students.filter(s => s.classId !== id);
    state.attendance = state.attendance.filter(a => a.classId !== id);
    state.activityPoints = state.activityPoints.filter(a => a.classId !== id);
    state.grades = state.grades.filter(a => a.classId !== id);
    state.praktikum = state.praktikum.filter(a => a.classId !== id);
    state.jurnalMengajar = state.jurnalMengajar.filter(a => a.classId !== id);
    saveState(); refreshKelasOptions(); renderAll();
    toast('Kelas dihapus');
  });
}

document.getElementById('addSiswaBtn').addEventListener('click', () => openSiswaModal());

function openSiswaModal(existing) {
  const isEdit = !!existing;
  let kelasList = classesForYearFilter();
  // kalau sedang edit siswa yang kelasnya di luar filter tahun ajaran saat ini,
  // tetap sertakan kelas itu supaya tidak hilang dari pilihan / tidak salah pindah kelas
  if (existing && !kelasList.some(c => c.id === existing.classId)) {
    const cur = classById(existing.classId);
    if (cur) kelasList = [cur, ...kelasList];
  }
  const kelasOpts = kelasList.map(c => `<option value="${c.id}" ${existing?.classId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}${c.year ? ' — ' + escapeHtml(c.year) : ''}</option>`).join('');
  openModal(`
    <h3>${isEdit ? 'Edit siswa' : 'Tambah siswa'}</h3>
    <div class="form-row">
      <label class="ctx-field"><span>Kelas</span><select id="mSiswaKelas">${kelasOpts || '<option value="">Buat kelas dahulu</option>'}</select></label>
    </div>
    <div class="form-row">
      <label class="ctx-field"><span>Nama</span><input id="mSiswaNama" type="text" value="${escapeHtml(existing?.name || '')}"></label>
    </div>
    <div class="form-row">
      <label class="ctx-field"><span>NIS/NISN</span><input id="mSiswaNis" type="text" value="${escapeHtml(existing?.nis || '')}"></label>
      <label class="ctx-field"><span>Jenis kelamin</span>
        <select id="mSiswaJk">
          <option value="L" ${existing?.gender === 'L' ? 'selected' : ''}>L</option>
          <option value="P" ${existing?.gender === 'P' ? 'selected' : ''}>P</option>
        </select>
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-line" id="mCancel">Batal</button>
      <button class="btn btn-primary" id="mSave">Simpan</button>
    </div>
  `, box => {
    box.querySelector('#mCancel').onclick = closeModal;
    box.querySelector('#mSave').onclick = () => {
      const name = box.querySelector('#mSiswaNama').value.trim();
      const classId = box.querySelector('#mSiswaKelas').value;
      if (!name || !classId) { toast('Nama dan kelas wajib diisi'); return; }
      if (isEdit) {
        Object.assign(existing, { name, classId, nis: box.querySelector('#mSiswaNis').value.trim(), gender: box.querySelector('#mSiswaJk').value });
      } else {
        state.students.push({ id: uid(), name, classId, nis: box.querySelector('#mSiswaNis').value.trim(), gender: box.querySelector('#mSiswaJk').value });
      }
      saveState(); closeModal(); renderAll();
      toast('Siswa disimpan');
    };
  });
}

function renderSiswaTable() {
  const filterKelas = document.getElementById('siswaKelasFilter').value;
  const q = document.getElementById('siswaSearch').value.trim().toLowerCase();
  const allowedClassIds = new Set(classesForYearFilter().map(c => c.id));
  let list = state.students.filter(s => allowedClassIds.has(s.classId));
  if (filterKelas) list = list.filter(s => s.classId === filterKelas);
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || (s.nis || '').toLowerCase().includes(q));
  list.sort((a, b) => a.name.localeCompare(b.name, 'id'));

  const tbody = document.querySelector('#siswaTable tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Belum ada siswa yang cocok.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(s => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td class="numcell">${escapeHtml(s.nis || '—')}</td>
      <td>${escapeHtml(s.gender || '—')}</td>
      <td>${escapeHtml(classById(s.classId)?.name || '—')}</td>
      <td>
        <button class="btn btn-line" data-edit-siswa="${s.id}">Edit</button>
        <button class="btn btn-line" data-del-siswa="${s.id}" style="color:#E1547A">Hapus</button>
      </td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-edit-siswa]').forEach(b => b.onclick = () => openSiswaModal(studentById(b.dataset.editSiswa)));
  tbody.querySelectorAll('[data-del-siswa]').forEach(b => b.onclick = () => {
    if (!confirm('Hapus siswa ini beserta riwayat absensi, poin, dan nilainya?')) return;
    const id = b.dataset.delSiswa;
    state.students = state.students.filter(s => s.id !== id);
    state.attendance = state.attendance.filter(a => a.studentId !== id);
    state.activityPoints = state.activityPoints.filter(a => a.studentId !== id);
    state.grades = state.grades.filter(a => a.studentId !== id);
    saveState(); renderAll();
    toast('Siswa dihapus');
  });
}

document.getElementById('siswaKelasFilter').addEventListener('change', renderSiswaTable);
document.getElementById('siswaSearch').addEventListener('input', renderSiswaTable);

/* ---- Template import & import file siswa ---- */

document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
  const ws = XLSX.utils.aoa_to_sheet([['Nama', 'NIS', 'JK'], ['Contoh Siswa', '1234567890', 'L']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
  XLSX.writeFile(wb, 'template-import-siswa.xlsx');
});

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const targetClass = document.getElementById('siswaKelasFilter').value || globalKelasSelect.value;
  if (!targetClass) { toast('Pilih kelas tujuan import terlebih dahulu (filter kelas di atas tabel)'); e.target.value = ''; return; }
  try {
    const rows = await parseSheetFile(file);
    const header = rows[0].map(h => String(h || '').toLowerCase().trim());
    const idxNama = header.findIndex(h => h.includes('nama'));
    const idxNis = header.findIndex(h => h.includes('nis'));
    const idxJk = header.findIndex(h => h.includes('jk') || h.includes('kelamin'));
    if (idxNama === -1) { toast('Kolom "Nama" tidak ditemukan pada file'); e.target.value = ''; return; }

    const preview = rows.slice(1).filter(r => r[idxNama]).map(r => ({
      name: String(r[idxNama]).trim(),
      nis: idxNis > -1 ? String(r[idxNis] ?? '').trim() : '',
      gender: idxJk > -1 ? String(r[idxJk] ?? '').trim().toUpperCase().slice(0, 1) : ''
    }));
    showImportPreview(preview, targetClass);
  } catch (err) {
    console.error(err);
    toast('Gagal membaca file. Pastikan formatnya .xlsx/.xls/.csv');
  }
  e.target.value = '';
});

function parseSheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function showImportPreview(rows, classId) {
  const rowsHtml = rows.slice(0, 200).map((r, i) => `
    <tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.nis)}</td><td>${escapeHtml(r.gender)}</td></tr>
  `).join('');
  openModal(`
    <h3>Pratinjau import (${rows.length} siswa)</h3>
    <div style="max-height:300px; overflow:auto; border:1px solid var(--line); border-radius:3px;">
      <table class="tbl"><thead><tr><th>#</th><th>Nama</th><th>NIS</th><th>JK</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </div>
    <div class="modal-actions">
      <button class="btn btn-line" id="mCancel">Batal</button>
      <button class="btn btn-primary" id="mSave">Import ke ${escapeHtml(classById(classId)?.name || '')}</button>
    </div>
  `, box => {
    box.querySelector('#mCancel').onclick = closeModal;
    box.querySelector('#mSave').onclick = () => {
      rows.forEach(r => {
        state.students.push({ id: uid(), classId, name: r.name, nis: r.nis, gender: r.gender });
      });
      saveState(); closeModal(); renderAll();
      toast(`${rows.length} siswa berhasil diimport`);
    };
  });
}

/* =========================================================================
   ABSENSI
   ========================================================================= */

const STATUS_LIST = ['Hadir', 'Sakit', 'Izin', 'Alpha', 'Terlambat'];

function getAttendance(classId, studentId, date) {
  return state.attendance.find(a => a.classId === classId && a.studentId === studentId && a.date === date);
}

function renderAbsensiView() {
  const { classId, date } = getCtx();
  const tbody = document.querySelector('#absensiTable tbody');
  const lockNote = document.getElementById('absensiLockNote');
  if (!classId) { tbody.innerHTML = '<tr><td colspan="3" class="empty">Pilih kelas di atas terlebih dahulu.</td></tr>'; lockNote.textContent = ''; return; }
  const list = studentsOf(classId);
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="3" class="empty">Kelas ini belum punya siswa.</td></tr>'; return; }

  const already = list.some(s => getAttendance(classId, s.id, date));
  lockNote.textContent = already ? 'Absensi tanggal ini sudah pernah disimpan — menyimpan lagi akan memperbarui data.' : '';

  tbody.innerHTML = list.map(s => {
    const rec = getAttendance(classId, s.id, date);
    const status = rec?.status || 'Hadir';
    const note = rec?.note || '';
    return `
      <tr data-student="${s.id}">
        <td>${escapeHtml(s.name)}</td>
        <td>
          <div class="status-group">
            ${STATUS_LIST.map(st => `<button type="button" class="status-btn ${st === status ? 'is-on' : ''}" data-s="${st}">${st}</button>`).join('')}
          </div>
        </td>
        <td><input type="text" class="noteInput" placeholder="Catatan (opsional)" value="${escapeHtml(note)}"></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr').forEach(row => {
    row.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        row.querySelectorAll('.status-btn').forEach(b => b.classList.remove('is-on'));
        btn.classList.add('is-on');
      });
    });
  });
}

document.getElementById('markAllHadirBtn').addEventListener('click', () => {
  document.querySelectorAll('#absensiTable tbody tr').forEach(row => {
    row.querySelectorAll('.status-btn').forEach(b => b.classList.toggle('is-on', b.dataset.s === 'Hadir'));
  });
});

document.getElementById('saveAbsensiBtn').addEventListener('click', () => {
  const { classId, date } = getCtx();
  if (!classId) { toast('Pilih kelas terlebih dahulu'); return; }
  document.querySelectorAll('#absensiTable tbody tr').forEach(row => {
    const studentId = row.dataset.student;
    const activeBtn = row.querySelector('.status-btn.is-on');
    const status = activeBtn ? activeBtn.dataset.s : 'Hadir';
    const note = row.querySelector('.noteInput').value.trim();
    let rec = getAttendance(classId, studentId, date);
    if (rec) { rec.status = status; rec.note = note; }
    else state.attendance.push({ id: uid(), classId, studentId, date, status, note });
  });
  saveState();
  toast('Absensi tersimpan');
  renderAll();
});

/* =========================================================================
   KEAKTIFAN
   ========================================================================= */

document.getElementById('addCategoryBtn').addEventListener('click', () => {
  const input = document.getElementById('newCategoryInput');
  const val = input.value.trim();
  if (!val) return;
  if (state.activityCategories.includes(val)) { toast('Kategori sudah ada'); return; }
  state.activityCategories.push(val);
  saveState(); input.value = ''; renderKeaktifanView();
});

function getActivityNote(classId, studentId, date) {
  const entry = state.activityNotes.find(n => n.classId === classId && n.studentId === studentId && n.date === date);
  return entry ? entry.note : '';
}

/* Jumlah total poin keaktifan siswa dari awal sampai sekarang (semua
   tanggal, sudah tersimpan), dipakai untuk kolom "Total keseluruhan". */
function activityPointsTotalAllTime(classId, studentId) {
  return state.activityPoints
    .filter(a => a.classId === classId && a.studentId === studentId)
    .reduce((sum, a) => sum + (Number(a.points) || 0), 0);
}

function renderKeaktifanView() {
  const { classId, date } = getCtx();
  const headRow = document.getElementById('keaktifanHeadRow');
  const tbody = document.querySelector('#keaktifanTable tbody');
  const colCount = state.activityCategories.length + 4;
  headRow.innerHTML = '<th>Siswa</th>' + state.activityCategories.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '<th>Total hari ini</th><th>Total keseluruhan</th><th>Catatan (opsional)</th>';

  if (!classId) { tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty">Pilih kelas di atas terlebih dahulu.</td></tr>`; return; }
  const list = studentsOf(classId);
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty">Kelas ini belum punya siswa.</td></tr>`; return; }

  tbody.innerHTML = list.map(s => {
    const cells = state.activityCategories.map(cat => {
      const entry = state.activityPoints.find(a => a.classId === classId && a.studentId === s.id && a.date === date && a.category === cat);
      return `<td><input type="number" min="0" class="ptInput" data-cat="${escapeHtml(cat)}" value="${entry ? entry.points : ''}" placeholder="0"></td>`;
    }).join('');
    const note = getActivityNote(classId, s.id, date);
    // total keseluruhan (semua tanggal) TIDAK termasuk poin hari ini, supaya
    // saat digabung dengan "Total hari ini" yang live/belum disimpan, tidak
    // terhitung dua kali begitu nanti disimpan.
    const todaySaved = state.activityPoints.filter(a => a.classId === classId && a.studentId === s.id && a.date === date).reduce((sum, a) => sum + (Number(a.points) || 0), 0);
    const baseAllTime = activityPointsTotalAllTime(classId, s.id) - todaySaved;
    return `<tr data-student="${s.id}" data-base-total="${baseAllTime}"><td>${escapeHtml(s.name)}</td>${cells}<td class="numcell totalCell">0</td><td class="numcell grandTotalCell">${baseAllTime}</td><td><input type="text" class="noteInput" placeholder="Catatan singkat (opsional)" value="${escapeHtml(note)}"></td></tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-student]').forEach(row => {
    const baseAllTime = Number(row.dataset.baseTotal) || 0;
    const updateTotal = () => {
      let total = 0;
      row.querySelectorAll('.ptInput').forEach(inp => total += Number(inp.value) || 0);
      row.querySelector('.totalCell').textContent = total;
      row.querySelector('.grandTotalCell').textContent = baseAllTime + total;
    };
    row.querySelectorAll('.ptInput').forEach(inp => inp.addEventListener('input', updateTotal));
    updateTotal();
  });
}

document.getElementById('saveKeaktifanBtn').addEventListener('click', () => {
  const { classId, date } = getCtx();
  if (!classId) { toast('Pilih kelas terlebih dahulu'); return; }
  document.querySelectorAll('#keaktifanTable tbody tr').forEach(row => {
    const studentId = row.dataset.student;
    row.querySelectorAll('.ptInput').forEach(inp => {
      const cat = inp.dataset.cat;
      const points = Number(inp.value) || 0;
      state.activityPoints = state.activityPoints.filter(a => !(a.classId === classId && a.studentId === studentId && a.date === date && a.category === cat));
      if (points > 0) state.activityPoints.push({ id: uid(), classId, studentId, date, category: cat, points });
    });
    const noteInp = row.querySelector('.noteInput');
    const note = noteInp ? noteInp.value.trim() : '';
    state.activityNotes = state.activityNotes.filter(n => !(n.classId === classId && n.studentId === studentId && n.date === date));
    if (note) state.activityNotes.push({ id: uid(), classId, studentId, date, note });
  });
  saveState();
  toast('Poin & catatan keaktifan tersimpan');
  renderAll();
});

/* =========================================================================
   NILAI
   ========================================================================= */

function naturalNameSort(a, b) {
  return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
}

/* Daftar nama penilaian (mis. "Tugas 1", "Tugas 2") yang sudah pernah dibuat
   untuk kombinasi kelas + jenis tertentu, diurutkan secara alami. */
function assessmentNamesFor(classId, type) {
  const names = new Set();
  state.grades.filter(g => g.classId === classId && g.type === type).forEach(g => names.add(g.name));
  return [...names].sort(naturalNameSort);
}

/* Menyarankan nama penilaian berikutnya, mis. jika sudah ada "Tugas 1" dan
   "Tugas 2", akan menyarankan "Tugas 3". */
function suggestNextName(classId, type) {
  const label = jenisLabel(type);
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + escaped + '\\s*(\\d+)$', 'i');
  let max = 0;
  assessmentNamesFor(classId, type).forEach(n => {
    const m = n.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${label} ${max + 1}`;
}

function refreshNilaiJenisOptions() {
  const sel = document.getElementById('nilaiJenis');
  const prev = sel.value;
  sel.innerHTML = activeGradeTypes().map(t => `<option value="${t.id}">${t.label}</option>`).join('');
  if (activeGradeTypes().some(t => t.id === prev)) sel.value = prev;
}

function renderNilaiChips() {
  const { classId } = getCtx();
  const jenis = document.getElementById('nilaiJenis').value;
  const wrap = document.getElementById('nilaiChipRow');
  const activeName = document.getElementById('nilaiNama').value.trim();
  if (!classId) { wrap.innerHTML = ''; return; }
  const names = assessmentNamesFor(classId, jenis);
  const chips = names.map(n => `
    <button type="button" class="chip ${n === activeName ? 'is-active' : ''}" data-chip="${escapeHtml(n)}">
      ${escapeHtml(n)}<span class="chip-x" data-chip-del="${escapeHtml(n)}" title="Hapus penilaian ini">×</span>
    </button>`).join('');
  const addLabel = names.length ? `+ ${jenisLabel(jenis)} baru` : `+ Tambah ${jenisLabel(jenis)} pertama`;
  wrap.innerHTML = chips + `<button type="button" class="chip chip-add" id="nilaiChipAdd">${addLabel}</button>`;

  wrap.querySelectorAll('[data-chip]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('[data-chip-del]')) return;
      document.getElementById('nilaiNama').value = btn.dataset.chip;
      renderNilaiInputTable();
      renderNilaiChips();
    });
  });
  wrap.querySelectorAll('[data-chip-del]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.chipDel;
      if (!confirm(`Hapus penilaian "${name}" beserta seluruh nilai siswa di dalamnya?`)) return;
      state.grades = state.grades.filter(g => !(g.classId === classId && g.type === jenis && g.name === name));
      if (document.getElementById('nilaiNama').value.trim() === name) document.getElementById('nilaiNama').value = '';
      saveState(); renderNilaiChips(); renderNilaiInputTable(); renderNilaiRekap();
      toast('Penilaian dihapus');
    });
  });
  const addBtn = document.getElementById('nilaiChipAdd');
  if (addBtn) addBtn.addEventListener('click', () => {
    const suggestion = suggestNextName(classId, jenis);
    const nameInput = document.getElementById('nilaiNama');
    nameInput.value = suggestion;
    nameInput.focus();
    nameInput.select();
    renderNilaiInputTable();
    renderNilaiChips();
  });
}

function renderNilaiInputTable() {
  const { classId, date } = getCtx();
  const tbody = document.querySelector('#nilaiInputTable tbody');
  const nama = document.getElementById('nilaiNama').value.trim();
  const jenis = document.getElementById('nilaiJenis').value;
  document.getElementById('nilaiItemLabel').textContent = nama ? `${jenisLabel(jenis)} — ${nama}` : jenisLabel(jenis);
  if (!classId) { tbody.innerHTML = '<tr><td colspan="2" class="empty">Pilih kelas di atas terlebih dahulu.</td></tr>'; return; }
  const list = studentsOf(classId);
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="2" class="empty">Kelas ini belum punya siswa.</td></tr>'; return; }
  if (!nama) { tbody.innerHTML = '<tr><td colspan="2" class="empty">Pilih penilaian di atas, atau klik salah satu tombol "+ Tambah baru".</td></tr>'; return; }

  tbody.innerHTML = list.map(s => {
    const existing = state.grades.find(g => g.classId === classId && g.studentId === s.id && g.type === jenis && g.name === nama);
    return `<tr data-student="${s.id}"><td>${escapeHtml(s.name)}</td><td><input type="number" min="0" max="100" class="scoreInput" value="${existing ? existing.score : ''}" placeholder="—"></td></tr>`;
  }).join('');

  wireNilaiAutoSave(tbody, classId, jenis, nama);
}

/* Menyimpan satu nilai siswa (dipakai oleh auto-save per kotak input).
   Mengembalikan true kalau ada perubahan nyata (supaya tidak menyimpan
   berulang kalau nilainya sama saja). */
function commitScoreCell(row, classId, jenis, nama, date) {
  const studentId = row.dataset.student;
  const input = row.querySelector('.scoreInput');
  const val = input.value;
  let rec = state.grades.find(g => g.classId === classId && g.studentId === studentId && g.type === jenis && g.name === nama);
  if (val === '') {
    if (rec) { state.grades = state.grades.filter(g => g !== rec); return true; }
    return false;
  }
  const score = Math.max(0, Math.min(100, Number(val)));
  if (rec) {
    if (rec.score === score) return false;
    rec.score = score; rec.date = date;
  } else {
    state.grades.push({ id: uid(), classId, studentId, type: jenis, name: nama, score, date });
  }
  return true;
}

const nilaiAutoSaveTimers = {};
function wireNilaiAutoSave(tbody, classId, jenis, nama) {
  tbody.querySelectorAll('tr[data-student]').forEach(row => {
    const studentId = row.dataset.student;
    const input = row.querySelector('.scoreInput');
    const commit = () => {
      clearTimeout(nilaiAutoSaveTimers[studentId]);
      const { date } = getCtx();
      const changed = commitScoreCell(row, classId, jenis, nama, date);
      if (changed) {
        saveState();
        renderNilaiRekap();
        renderNilaiChips();
        const note = document.getElementById('nilaiAutoSaveNote');
        if (note) note.textContent = '✓ Tersimpan otomatis · ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
    };
    input.addEventListener('input', () => {
      clearTimeout(nilaiAutoSaveTimers[studentId]);
      nilaiAutoSaveTimers[studentId] = setTimeout(commit, 700);
    });
    input.addEventListener('blur', commit);
  });
}

document.getElementById('nilaiJenis').addEventListener('change', () => {
  document.getElementById('nilaiNama').value = '';
  renderNilaiChips();
  renderNilaiInputTable();
});
document.getElementById('nilaiNama').addEventListener('input', () => { renderNilaiInputTable(); renderNilaiChips(); });

document.getElementById('saveNilaiBtn').addEventListener('click', () => {
  const { classId, date } = getCtx();
  const jenis = document.getElementById('nilaiJenis').value;
  const nama = document.getElementById('nilaiNama').value.trim();
  if (!classId) { toast('Pilih kelas terlebih dahulu'); return; }
  if (!nama) { toast('Isi/pilih nama penilaian terlebih dahulu (misal: Tugas 1)'); return; }
  let count = 0;
  document.querySelectorAll('#nilaiInputTable tbody tr').forEach(row => {
    const studentId = row.dataset.student;
    const val = row.querySelector('.scoreInput').value;
    if (val === '') return;
    const score = Math.max(0, Math.min(100, Number(val)));
    let rec = state.grades.find(g => g.classId === classId && g.studentId === studentId && g.type === jenis && g.name === nama);
    if (rec) { rec.score = score; rec.date = date; }
    else state.grades.push({ id: uid(), classId, studentId, type: jenis, name: nama, score, date });
    count++;
  });
  saveState();
  toast(`Nilai "${nama}" tersimpan untuk ${count} siswa`);
  renderNilaiChips();
  renderAll();
});


document.getElementById('importNilaiFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const { classId } = getCtx();
  const jenis = document.getElementById('nilaiJenis').value;
  const nama = document.getElementById('nilaiNama').value.trim();
  if (!classId) { toast('Pilih kelas terlebih dahulu'); e.target.value = ''; return; }
  if (!nama) { toast('Isi nama penilaian terlebih dahulu sebelum import'); e.target.value = ''; return; }
  try {
    const rows = await parseSheetFile(file);
    const header = rows[0].map(h => String(h || '').toLowerCase().trim());
    const idxNama = header.findIndex(h => h.includes('nama'));
    const idxNis = header.findIndex(h => h.includes('nis'));
    const idxNilai = header.findIndex(h => h.includes('nilai') || h.includes('skor') || h.includes('score'));
    if (idxNilai === -1 || (idxNama === -1 && idxNis === -1)) { toast('File harus punya kolom Nama/NIS dan Nilai'); e.target.value = ''; return; }

    let matched = 0, unmatched = 0;
    rows.slice(1).forEach(r => {
      const rowName = idxNama > -1 ? String(r[idxNama] || '').trim().toLowerCase() : '';
      const rowNis = idxNis > -1 ? String(r[idxNis] || '').trim() : '';
      const student = studentsOf(classId).find(s =>
        (rowNis && s.nis && s.nis === rowNis) || (rowName && s.name.toLowerCase() === rowName)
      );
      if (!student) { unmatched++; return; }
      const score = Math.max(0, Math.min(100, Number(r[idxNilai]) || 0));
      let rec = state.grades.find(g => g.classId === classId && g.studentId === student.id && g.type === jenis && g.name === nama);
      if (rec) rec.score = score;
      else state.grades.push({ id: uid(), classId, studentId: student.id, type: jenis, name: nama, score, date: todayStr() });
      matched++;
    });
    saveState(); renderAll();
    toast(`Import selesai: ${matched} cocok, ${unmatched} tidak ditemukan namanya di kelas ini`);
  } catch (err) {
    console.error(err);
    toast('Gagal membaca file nilai');
  }
  e.target.value = '';
});

function avgGrade(studentId, classId, type) {
  const list = state.grades.filter(g => g.classId === classId && g.studentId === studentId && g.type === type);
  if (!list.length) return null;
  return list.reduce((a, g) => a + g.score, 0) / list.length;
}

function computeFinalGrade(studentId, classId) {
  const w = state.settings.weights;
  const types = activeGradeTypes().map(t => t.id);
  const present = types.map(t => ({ t, avg: avgGrade(studentId, classId, t), w: w[t] || 0 })).filter(x => x.avg !== null);
  if (!present.length) return null;
  const totalW = present.reduce((a, x) => a + x.w, 0) || 1;
  return present.reduce((a, x) => a + x.avg * (x.w / totalW), 0);
}

let chartNilaiInst = null;
function renderNilaiRekap() {
  const { classId } = getCtx();
  const tbody = document.querySelector('#nilaiRekapTable tbody');
  const thead = document.querySelector('#nilaiRekapTable thead tr');
  const types = activeGradeTypes();
  thead.innerHTML = '<th>Siswa</th>' + types.map(t => `<th>${t.label}</th>`).join('') + '<th>Nilai akhir</th><th></th>';
  const colCount = types.length + 3;
  if (!classId) { tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty">Pilih kelas di atas terlebih dahulu.</td></tr>`; if (chartNilaiInst) chartNilaiInst.destroy(); return; }
  const list = studentsOf(classId);
  const rows = list.map(s => {
    const perType = types.map(t => ({ id: t.id, label: t.label, avg: avgGrade(s.id, classId, t.id) }));
    const fin = computeFinalGrade(s.id, classId);
    return { id: s.id, name: s.name, perType, fin };
  });
  tbody.innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      ${r.perType.map(p => `<td class="numcell">${p.avg !== null ? p.avg.toFixed(1) : '—'}</td>`).join('')}
      <td class="numcell" style="font-weight:600">${r.fin !== null ? r.fin.toFixed(1) : '—'}</td>
      <td><button type="button" class="btn btn-line btn-sm" data-detail="${r.id}">Rincian</button></td>
    </tr>
  `).join('') : `<tr><td colspan="${colCount}" class="empty">Belum ada siswa/nilai.</td></tr>`;

  tbody.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => openNilaiDetailModal(btn.dataset.detail, classId));
  });

  const ctx = document.getElementById('chartNilai');
  if (chartNilaiInst) chartNilaiInst.destroy();
  chartNilaiInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.name), datasets: [{ label: 'Nilai akhir', data: rows.map(r => r.fin ?? 0), backgroundColor: '#8B5CF6', borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
  });
}

/* Modal rincian nilai — menampilkan tiap komponen penilaian (Tugas 1, Tugas 2,
   dst.) satu per satu untuk seorang siswa, sebagai dasar nilai rapor. */
function openNilaiDetailModal(studentId, classId) {
  const s = studentById(studentId);
  const w = state.settings.weights;
  const sections = activeGradeTypes().map(t => {
    const items = state.grades.filter(g => g.classId === classId && g.studentId === studentId && g.type === t.id)
      .sort((a, b) => naturalNameSort(a.name, b.name));
    const avg = avgGrade(studentId, classId, t.id);
    const rows = items.length
      ? items.map(g => `<div class="detail-row"><span>${escapeHtml(g.name)}</span><span class="numcell">${g.score}</span></div>`).join('')
      : '<div class="detail-row"><span class="empty">Belum ada nilai</span></div>';
    return `<div class="detail-group">
      <div class="detail-group-head"><strong>${t.label}</strong><small>bobot ${w[t.id] || 0}%</small></div>
      ${rows}
      <div class="detail-row detail-avg"><span>Rata-rata</span><span class="numcell">${avg !== null ? avg.toFixed(1) : '—'}</span></div>
    </div>`;
  }).join('');
  const fin = computeFinalGrade(studentId, classId);
  openModal(`
    <h3>Rincian nilai — ${escapeHtml(s?.name || '')}</h3>
    <div class="detail-wrap">${sections}</div>
    <div class="detail-final"><span>Nilai akhir (nilai rapor)</span><strong>${fin !== null ? fin.toFixed(1) : '—'}</strong></div>
    <div class="modal-actions"><button class="btn btn-primary" id="mCloseDetail">Tutup</button></div>
  `, box => { box.querySelector('#mCloseDetail').onclick = closeModal; });
}

/* =========================================================================
   JURNAL PRAKTIKUM
   ========================================================================= */

document.getElementById('savePraktikumBtn').addEventListener('click', () => {
  const { classId, date } = getCtx();
  const judul = document.getElementById('prakJudul').value.trim();
  if (!classId) { toast('Pilih kelas terlebih dahulu'); return; }
  if (!judul) { toast('Isi judul percobaan'); return; }
  state.praktikum.push({
    id: uid(), classId, date,
    judul, alat: document.getElementById('prakAlat').value.trim(), k3: document.getElementById('prakK3').value.trim()
  });
  saveState();
  document.getElementById('prakJudul').value = '';
  document.getElementById('prakAlat').value = '';
  document.getElementById('prakK3').value = '';
  toast('Catatan praktikum disimpan');
  renderAll();
});

function renderPraktikumTable() {
  const { classId } = getCtx();
  const tbody = document.querySelector('#praktikumTable tbody');
  if (!classId) { tbody.innerHTML = '<tr><td colspan="5" class="empty">Pilih kelas di atas terlebih dahulu.</td></tr>'; return; }
  const list = state.praktikum.filter(p => p.classId === classId).sort((a, b) => b.date.localeCompare(a.date));
  tbody.innerHTML = list.length ? list.map(p => `
    <tr>
      <td class="numcell">${p.date}</td>
      <td>${escapeHtml(p.judul)}</td>
      <td>${escapeHtml(p.alat)}</td>
      <td>${escapeHtml(p.k3)}</td>
      <td><button class="btn btn-line" data-del-prak="${p.id}" style="color:#E1547A">Hapus</button></td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="empty">Belum ada catatan praktikum untuk kelas ini.</td></tr>';
  tbody.querySelectorAll('[data-del-prak]').forEach(b => b.onclick = () => {
    state.praktikum = state.praktikum.filter(p => p.id !== b.dataset.delPrak);
    saveState(); renderPraktikumTable();
  });
}

/* =========================================================================
   JURNAL MENGAJAR
   ========================================================================= */

document.getElementById('jmFoto').addEventListener('change', () => {
  const file = document.getElementById('jmFoto').files[0];
  document.getElementById('jmFotoNama').textContent = file ? `Dipilih: ${file.name}` : '';
});

document.getElementById('saveJurnalMengajarBtn').addEventListener('click', async () => {
  const { classId, date } = getCtx();
  const jamKe = document.getElementById('jmJamKe').value.trim();
  const materi = document.getElementById('jmMateri').value.trim();
  if (!classId) { toast('Pilih kelas terlebih dahulu'); return; }
  if (!materi) { toast('Isi materi yang diajarkan'); return; }

  const entry = {
    id: uid(), classId, date, jamKe,
    materi, catatan: document.getElementById('jmCatatan').value.trim(),
    fotoUrl: '', fotoFileName: ''
  };

  const fotoInput = document.getElementById('jmFoto');
  const fotoFile = fotoInput.files[0];
  const btn = document.getElementById('saveJurnalMengajarBtn');

  if (fotoFile) {
    if (!state.settings.sheetsUrl) {
      toast('Hubungkan ke Google Spreadsheet dulu (Pengaturan) supaya foto bisa diunggah ke Drive.');
    } else {
      btn.disabled = true;
      toast('Mengunggah foto bukti mengajar…');
      try {
        const dataUrl = await fileToBase64(fotoFile);
        const res = await fetch(state.settings.sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            type: 'uploadTeachingProofPhoto',
            fileName: fotoFile.name, mimeType: fotoFile.type, base64: dataUrl.split(',')[1],
            kelas: classById(classId)?.name || '', tanggal: date
          })
        });
        const data = await res.json().catch(() => null);
        if (data && data.ok && data.url) {
          entry.fotoUrl = data.url;
          entry.fotoFileName = fotoFile.name;
          toast('Foto tersimpan di Google Drive & tercatat di Spreadsheet');
        } else {
          toast('Gagal mengunggah foto ke Drive. Catatan tetap disimpan tanpa foto.');
        }
      } catch (err) {
        console.error(err);
        toast('Gagal mengunggah foto (cek koneksi internet). Catatan tetap disimpan tanpa foto.');
      }
      btn.disabled = false;
    }
  }

  state.jurnalMengajar.push(entry);
  saveState();
  document.getElementById('jmJamKe').value = '';
  document.getElementById('jmMateri').value = '';
  document.getElementById('jmCatatan').value = '';
  fotoInput.value = '';
  document.getElementById('jmFotoNama').textContent = '';
  if (!fotoFile) toast('Catatan mengajar disimpan');
  renderAll();
});

function renderJurnalMengajarView() {
  const { classId, date } = getCtx();
  document.getElementById('jmTanggalLabel').textContent = fmtDateID(date);
  const tbody = document.querySelector('#jurnalMengajarTable tbody');
  if (!classId) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Pilih kelas di atas terlebih dahulu.</td></tr>'; return; }
  const list = state.jurnalMengajar.filter(j => j.classId === classId).sort((a, b) => b.date.localeCompare(a.date) || String(b.jamKe).localeCompare(String(a.jamKe)));
  tbody.innerHTML = list.length ? list.map(j => `
    <tr>
      <td class="numcell">${j.date}</td>
      <td class="numcell">${escapeHtml(j.jamKe || '—')}</td>
      <td>${escapeHtml(j.materi)}</td>
      <td>${escapeHtml(j.catatan || '—')}</td>
      <td>${j.fotoUrl ? `<a class="btn btn-line btn-sm" href="${j.fotoUrl}" target="_blank" rel="noopener">📷 Lihat foto</a>` : '—'}</td>
      <td><button class="btn btn-line" data-del-jm="${j.id}" style="color:#E1547A">Hapus</button></td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty">Belum ada catatan mengajar untuk kelas ini.</td></tr>';
  tbody.querySelectorAll('[data-del-jm]').forEach(b => b.onclick = () => {
    state.jurnalMengajar = state.jurnalMengajar.filter(j => j.id !== b.dataset.delJm);
    saveState(); renderJurnalMengajarView();
  });
}

/* =========================================================================
   JADWAL PELAJARAN — pengingat jadwal mengajar per kelas
   ========================================================================= */

function renderJadwalHariSelect() {
  const sel = document.getElementById('jadwalHari');
  if (sel && !sel.dataset.filled) {
    sel.innerHTML = HARI_LIST.map(h => `<option value="${h}">${h}</option>`).join('');
    sel.dataset.filled = '1';
  }
}

function renderJadwalKelasSelect() {
  const sel = document.getElementById('jadwalKelas');
  if (!sel) return;
  const prev = sel.value;
  const list = activeClasses();
  sel.innerHTML = list.map(c => `<option value="${c.id}">${escapeHtml(c.name)}${c.subject ? ' — ' + escapeHtml(c.subject) : ''}</option>`).join('') || '<option value="">Belum ada kelas</option>';
  if (list.some(c => c.id === prev)) sel.value = prev;
}

document.getElementById('addJadwalBtn') && document.getElementById('addJadwalBtn').addEventListener('click', () => {
  const classId = document.getElementById('jadwalKelas').value;
  const hari = document.getElementById('jadwalHari').value;
  const jamKe = document.getElementById('jadwalJamKe').value.trim();
  const jamMulai = document.getElementById('jadwalJamMulai').value;
  const jamSelesai = document.getElementById('jadwalJamSelesai').value;
  if (!classId) { toast('Pilih kelas terlebih dahulu'); return; }
  if (!jamMulai) { toast('Isi jam mulai'); return; }
  state.schedule.push({ id: uid(), classId, hari, jamKe, jamMulai, jamSelesai });
  saveState();
  document.getElementById('jadwalJamKe').value = '';
  document.getElementById('jadwalJamMulai').value = '';
  document.getElementById('jadwalJamSelesai').value = '';
  toast('Jadwal ditambahkan');
  renderAll();
});

function renderJadwalView() {
  renderJadwalHariSelect();
  renderJadwalKelasSelect();
  const tbody = document.querySelector('#jadwalTable tbody');
  if (!tbody) return;
  const rows = HARI_LIST.flatMap(h => state.schedule.filter(j => j.hari === h)).sort((a, b) => {
    if (a.hari !== b.hari) return HARI_LIST.indexOf(a.hari) - HARI_LIST.indexOf(b.hari);
    return (a.jamMulai || '').localeCompare(b.jamMulai || '');
  });
  tbody.innerHTML = rows.length ? rows.map(j => {
    const kelas = classById(j.classId);
    return `<tr>
      <td>${escapeHtml(j.hari)}</td>
      <td>${kelas ? escapeHtml(kelas.name) + (kelas.subject ? ' — ' + escapeHtml(kelas.subject) : '') : '<em>Kelas dihapus</em>'}</td>
      <td class="numcell">${escapeHtml(j.jamKe || '—')}</td>
      <td class="numcell">${escapeHtml(j.jamMulai || '—')}${j.jamSelesai ? ' – ' + escapeHtml(j.jamSelesai) : ''}</td>
      <td><button class="btn btn-line" data-del-jadwal="${j.id}" style="color:#E1547A">Hapus</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">Belum ada jadwal. Tambahkan di atas agar Anda diingatkan.</td></tr>';
  tbody.querySelectorAll('[data-del-jadwal]').forEach(b => b.onclick = () => {
    state.schedule = state.schedule.filter(j => j.id !== b.dataset.delJadwal);
    saveState(); renderJadwalView();
  });
}

/* Jadwal hari ini, dipakai di Dashboard sebagai pengingat */
function todaysSchedule() {
  const hari = todayHari();
  return state.schedule.filter(j => j.hari === hari).sort((a, b) => (a.jamMulai || '').localeCompare(b.jamMulai || ''));
}

function renderDashboardJadwal() {
  const box = document.getElementById('dashJadwalList');
  if (!box) return;
  const list = todaysSchedule();
  const nowHm = new Date().toTimeString().slice(0, 5);
  box.innerHTML = list.length ? list.map(j => {
    const kelas = classById(j.classId);
    const isNext = j.jamMulai && j.jamMulai >= nowHm;
    return `<div class="attn-row${isNext ? ' is-next' : ''}">
      <span>${kelas ? escapeHtml(kelas.name) : '—'}${kelas && kelas.subject ? ' <small style="color:var(--ink-soft)">· ' + escapeHtml(kelas.subject) + '</small>' : ''}</span>
      <span class="attn-tag ${isNext ? 'ok' : ''}">${escapeHtml(j.jamMulai || '—')}${j.jamSelesai ? '–' + escapeHtml(j.jamSelesai) : ''}${j.jamKe ? ' · jam ke-' + escapeHtml(j.jamKe) : ''}</span>
    </div>`;
  }).join('') : `<p class="empty">Tidak ada jadwal mengajar untuk hari ${todayHari()}.</p>`;
}

/* Pengecekan pengingat sederhana: setiap menit, jika ada jadwal yang mulai
   dalam 10 menit ke depan dan belum diberitahu hari ini, tampilkan notifikasi
   browser (jika diizinkan) + toast di dalam aplikasi. Hanya berjalan selama
   halaman terbuka. */
const _notifiedToday = new Set();
function checkJadwalReminder() {
  const hari = todayHari();
  const now = new Date();
  const nowHm = now.toTimeString().slice(0, 5);
  state.schedule.filter(j => j.hari === hari && j.jamMulai).forEach(j => {
    const key = j.id + '_' + todayStr();
    if (_notifiedToday.has(key)) return;
    const [h, m] = j.jamMulai.split(':').map(Number);
    const target = new Date(now); target.setHours(h, m, 0, 0);
    const diffMin = (target - now) / 60000;
    if (diffMin >= 0 && diffMin <= 10) {
      _notifiedToday.add(key);
      const kelas = classById(j.classId);
      const msg = `Pengingat: ${kelas ? kelas.name : 'Kelas'} akan mulai pukul ${j.jamMulai}`;
      toast(msg);
      if (window.Notification && Notification.permission === 'granted') {
        try { new Notification('Buku Kelas — Pengingat Jadwal', { body: msg }); } catch (e) {}
      }
    }
  });
}
if (window.Notification && Notification.permission === 'default') {
  Notification.requestPermission().catch(() => {});
}
setInterval(checkJadwalReminder, 60 * 1000);

/* =========================================================================
   MODUL AJAR — upload file & generate dengan AI
   ========================================================================= */

function renderModulKelasSelects() {
  const sel = document.getElementById('modulUploadKelas');
  if (!sel) return;
  const prev = sel.value;
  const list = activeClasses();
  sel.innerHTML = list.map(c => `<option value="${c.id}">${escapeHtml(c.name)}${c.subject ? ' — ' + escapeHtml(c.subject) : ''}</option>`).join('') || '<option value="">Belum ada kelas</option>';
  if (list.some(c => c.id === prev)) sel.value = prev;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data URL: data:<mime>;base64,<...>
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('uploadModulBtn') && document.getElementById('uploadModulBtn').addEventListener('click', async () => {
  const classId = document.getElementById('modulUploadKelas').value;
  const judul = document.getElementById('modulUploadJudul').value.trim();
  const fileInput = document.getElementById('modulUploadFile');
  const file = fileInput.files[0];
  if (!classId) { toast('Pilih kelas terlebih dahulu'); return; }
  if (!judul) { toast('Isi judul modul'); return; }
  if (!file) { toast('Pilih file Word (.doc/.docx) atau PDF terlebih dahulu'); return; }
  const okExt = /\.(docx?|pdf)$/i.test(file.name);
  if (!okExt) { toast('File harus berformat .doc, .docx, atau .pdf'); return; }

  toast('Mengunggah modul…');
  const dataUrl = await fileToBase64(file);
  const item = { id: uid(), classId, judul, mapel: classById(classId)?.subject || '', sumber: 'upload', fileName: file.name, driveUrl: '', content: '', tanggal: todayStr() };

  if (state.settings.sheetsUrl) {
    try {
      const res = await fetch(state.settings.sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'uploadModuleFile', fileName: file.name, mimeType: file.type, base64: dataUrl.split(',')[1], judul })
      });
      // Catatan: fetch dengan mode 'no-cors' tidak bisa dibaca; di sini kita
      // memakai mode default supaya bisa membaca URL Drive hasil upload.
      const data = await res.json().catch(() => null);
      if (data && data.ok && data.url) {
        item.driveUrl = data.url;
        toast('Modul tersimpan ke Google Drive & tercatat di Spreadsheet');
      } else {
        toast('File tersimpan di perangkat ini saja (gagal mengunggah ke Drive). Cek koneksi/URL Apps Script.');
      }
    } catch (err) {
      console.error(err);
      toast('File tersimpan di perangkat ini saja (gagal mengunggah ke Drive).');
    }
  } else {
    toast('Modul disimpan di perangkat ini. Hubungkan ke Google Spreadsheet (Pengaturan) agar bisa dibuka dari HP/PC lain.');
  }

  state.modules.push(item);
  saveState();
  fileInput.value = '';
  document.getElementById('modulUploadJudul').value = '';
  renderModulAjarView();
});

function renderModulAjarView() {
  renderModulKelasSelects();
  const tbody = document.querySelector('#modulAjarTable tbody');
  if (!tbody) return;
  const list = state.modules.slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  tbody.innerHTML = list.length ? list.map(m => {
    const kelas = classById(m.classId);
    const sumberLabel = m.sumber === 'upload' ? 'Upload' : (m.sumber ? 'AI (arsip)' : 'Upload');
    let aksi = '';
    if (m.driveUrl) aksi += `<a class="btn btn-line btn-sm" href="${m.driveUrl}" target="_blank" rel="noopener">Buka file</a> `;
    if (m.content) aksi += `<button class="btn btn-line btn-sm" data-view-modul="${m.id}">Lihat isi</button> `;
    aksi += `<button class="btn btn-line btn-sm" data-del-modul="${m.id}" style="color:#E1547A">Hapus</button>`;
    return `<tr>
      <td>${escapeHtml(m.judul)}</td>
      <td>${kelas ? escapeHtml(kelas.name) : '<em>—</em>'}</td>
      <td>${escapeHtml(sumberLabel)}</td>
      <td class="numcell">${escapeHtml(m.tanggal)}</td>
      <td>${aksi}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">Belum ada modul ajar. Unggah file di atas.</td></tr>';

  tbody.querySelectorAll('[data-del-modul]').forEach(b => b.onclick = () => {
    state.modules = state.modules.filter(m => m.id !== b.dataset.delModul);
    saveState(); renderModulAjarView();
  });
  tbody.querySelectorAll('[data-view-modul]').forEach(b => b.onclick = () => {
    const m = state.modules.find(x => x.id === b.dataset.viewModul);
    if (m) openModal(`<h3>${escapeHtml(m.judul)}</h3><div style="max-height:60vh;overflow:auto;white-space:pre-wrap;font-size:13px;line-height:1.6;border:1px solid var(--line);border-radius:10px;padding:14px;margin-top:10px">${escapeHtml(m.content)}</div>`);
  });
}


/* =========================================================================
   PROFIL GURU
   ========================================================================= */

function renderGuruProfile() {
  const guru = state.settings.guru || { nama: '', foto: '' };
  const nameEl = document.getElementById('guruNamaInput');
  if (nameEl && document.activeElement !== nameEl) nameEl.value = guru.nama || '';
  const preview = document.getElementById('guruFotoPreview');
  if (preview) preview.src = guru.foto || '';
  if (preview) preview.style.display = guru.foto ? '' : 'none';
  const initial = document.getElementById('guruFotoInitial');
  if (initial) initial.style.display = guru.foto ? 'none' : '';
  if (initial) initial.textContent = (guru.nama || '?').trim().charAt(0).toUpperCase() || '?';

  // tampilkan di sidebar
  const sideName = document.getElementById('sideGuruNama');
  const sidePhoto = document.getElementById('sideGuruFoto');
  const sideInitial = document.getElementById('sideGuruInitial');
  if (sideName) sideName.textContent = guru.nama || 'Guru IPA';
  if (sidePhoto && sideInitial) {
    if (guru.foto) { sidePhoto.src = guru.foto; sidePhoto.style.display = ''; sideInitial.style.display = 'none'; }
    else { sidePhoto.style.display = 'none'; sideInitial.style.display = ''; sideInitial.textContent = (guru.nama || '?').trim().charAt(0).toUpperCase() || '?'; }
  }
}

document.getElementById('guruNamaInput') && document.getElementById('guruNamaInput').addEventListener('change', (e) => {
  state.settings.guru.nama = e.target.value.trim();
  saveState();
  renderGuruProfile();
  toast('Nama guru disimpan');
});

document.getElementById('guruFotoInput') && document.getElementById('guruFotoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('File harus berupa gambar'); return; }
  const dataUrl = await fileToBase64(file);
  state.settings.guru.foto = dataUrl;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // foto disimpan lokal saja, tidak disinkron ke Spreadsheet
  renderGuruProfile();
  toast('Foto profil diperbarui (tersimpan di perangkat ini)');
});

document.getElementById('guruFotoHapusBtn') && document.getElementById('guruFotoHapusBtn').addEventListener('click', () => {
  state.settings.guru.foto = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderGuruProfile();
  toast('Foto profil dihapus');
});

/* =========================================================================
   DASHBOARD
   ========================================================================= */

function renderDashboard() {
  const { classId, date } = getCtx();
  document.getElementById('dashDateLabel').textContent = fmtDateID(date);

  const dayAtt = state.attendance.filter(a => a.date === date && (!classId || a.classId === classId));
  document.getElementById('statHadir').textContent = dayAtt.filter(a => a.status === 'Hadir').length;
  document.getElementById('statSakit').textContent = dayAtt.filter(a => a.status === 'Sakit').length;
  document.getElementById('statIzin').textContent = dayAtt.filter(a => a.status === 'Izin').length;
  document.getElementById('statAlpha').textContent = dayAtt.filter(a => a.status === 'Alpha').length;

  const classesWithStudents = activeClasses().filter(c => studentsOf(c.id).length);
  const belum = classesWithStudents.filter(c => !state.attendance.some(a => a.classId === c.id && a.date === date));
  document.getElementById('statBelumAbsen').textContent = belum.length;

  // perlu perhatian: kehadiran 30 hari terakhir < 80%, atau nilai akhir < KKM
  // (dibatasi ke siswa di kelas tahun ajaran yang sedang berjalan)
  const cutoff = new Date(date); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const attn = [];
  const activeStudents = state.students.filter(s => isClassActive(classById(s.classId)));
  activeStudents.forEach(s => {
    const recs = state.attendance.filter(a => a.studentId === s.id && a.date >= cutoffStr && a.date <= date);
    if (recs.length >= 3) {
      const hadir = recs.filter(a => a.status === 'Hadir').length;
      const pct = (hadir / recs.length) * 100;
      if (pct < 80) attn.push({ name: s.name, kelas: classById(s.classId)?.name, tag: `${pct.toFixed(0)}% hadir`, ok: false });
    }
    const fin = computeFinalGrade(s.id, s.classId);
    if (fin !== null && fin < KKM_DEFAULT) attn.push({ name: s.name, kelas: classById(s.classId)?.name, tag: `Nilai ${fin.toFixed(0)}`, ok: false });
  });
  const attnList = document.getElementById('attentionList');
  attnList.innerHTML = attn.length
    ? attn.slice(0, 8).map(a => `<div class="attn-row"><span>${escapeHtml(a.name)} <small style="color:var(--ink-soft)">· ${escapeHtml(a.kelas || '')}</small></span><span class="attn-tag">${escapeHtml(a.tag)}</span></div>`).join('')
    : '<p class="empty">Tidak ada yang perlu perhatian khusus saat ini.</p>';

  // papan keaktifan 7 hari terakhir, kelas tahun ajaran yang sedang berjalan
  const cutoff7 = new Date(date); cutoff7.setDate(cutoff7.getDate() - 7);
  const cutoff7Str = cutoff7.toISOString().slice(0, 10);
  const activeStudentIds = new Set(activeStudents.map(s => s.id));
  const totals = {};
  state.activityPoints.filter(a => a.date >= cutoff7Str && a.date <= date && activeStudentIds.has(a.studentId)).forEach(a => {
    totals[a.studentId] = (totals[a.studentId] || 0) + a.points;
  });
  const ranked = Object.entries(totals).map(([sid, pts]) => ({ s: studentById(sid), pts })).filter(x => x.s).sort((a, b) => b.pts - a.pts).slice(0, 8);
  const topList = document.getElementById('topActiveList');
  topList.innerHTML = ranked.length
    ? ranked.map(r => `<div class="attn-row"><span>${escapeHtml(r.s.name)} <small style="color:var(--ink-soft)">· ${escapeHtml(classById(r.s.classId)?.name || '')}</small></span><span class="attn-tag ok">${r.pts} poin</span></div>`).join('')
    : '<p class="empty">Belum ada poin keaktifan tercatat.</p>';

  renderDashboardJadwal();
}

/* =========================================================================
   REKAP & LAPORAN
   ========================================================================= */

let currentRekapRows = [];
let chartAbsensiInst = null, chartKorelasiInst = null;

const rekapFrom = document.getElementById('rekapFrom');
const rekapTo = document.getElementById('rekapTo');

function defaultRekapRange() {
  const d = new Date(globalDate.value || todayStr());
  const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  if (!rekapFrom.value) rekapFrom.value = first;
  if (!rekapTo.value) rekapTo.value = last;
}

document.getElementById('rekapRunBtn').addEventListener('click', renderRekapView);

function renderRekapView() {
  defaultRekapRange();
  const { classId } = getCtx();
  const from = rekapFrom.value, to = rekapTo.value;
  const tbody = document.querySelector('#rekapTable tbody');
  if (!classId) { tbody.innerHTML = '<tr><td colspan="8" class="empty">Pilih kelas di atas terlebih dahulu.</td></tr>'; return; }

  const list = studentsOf(classId);
  currentRekapRows = list.map(s => {
    const recs = state.attendance.filter(a => a.studentId === s.id && a.date >= from && a.date <= to);
    const hadir = recs.filter(a => a.status === 'Hadir').length;
    const sakit = recs.filter(a => a.status === 'Sakit').length;
    const izin = recs.filter(a => a.status === 'Izin').length;
    const alpha = recs.filter(a => a.status === 'Alpha').length;
    const pct = recs.length ? (hadir / recs.length) * 100 : 0;
    const poin = state.activityPoints.filter(a => a.studentId === s.id && a.date >= from && a.date <= to).reduce((sum, a) => sum + a.points, 0);
    const fin = computeFinalGrade(s.id, classId);
    return { name: s.name, hadir, sakit, izin, alpha, pct, poin, fin };
  });

  tbody.innerHTML = currentRekapRows.length ? currentRekapRows.map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td class="numcell">${r.hadir}</td>
      <td class="numcell">${r.sakit}</td>
      <td class="numcell">${r.izin}</td>
      <td class="numcell">${r.alpha}</td>
      <td class="numcell">${r.pct.toFixed(0)}%</td>
      <td class="numcell">${r.poin}</td>
      <td class="numcell">${r.fin !== null ? r.fin.toFixed(1) : '—'}</td>
    </tr>
  `).join('') : '<tr><td colspan="8" class="empty">Tidak ada data pada rentang ini.</td></tr>';

  const ctxA = document.getElementById('chartAbsensi');
  if (chartAbsensiInst) chartAbsensiInst.destroy();
  chartAbsensiInst = new Chart(ctxA, {
    type: 'bar',
    data: { labels: currentRekapRows.map(r => r.name), datasets: [{ label: '% Kehadiran', data: currentRekapRows.map(r => r.pct), backgroundColor: '#A78BFA' }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
  });

  const ctxK = document.getElementById('chartKorelasi');
  if (chartKorelasiInst) chartKorelasiInst.destroy();
  chartKorelasiInst = new Chart(ctxK, {
    type: 'scatter',
    data: { datasets: [{ label: 'Siswa', data: currentRekapRows.filter(r => r.fin !== null).map(r => ({ x: r.pct, y: r.fin })), backgroundColor: '#7040E0' }] },
    options: { scales: { x: { title: { display: true, text: '% Kehadiran' }, min: 0, max: 100 }, y: { title: { display: true, text: 'Nilai akhir' }, min: 0, max: 100 } } }
  });
}

/* ---- Ekspor Excel / Word / PDF ---- */

function rekapAoa() {
  const header = ['Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpha', '% Kehadiran', 'Poin Keaktifan', 'Nilai Akhir'];
  const body = currentRekapRows.map(r => [r.name, r.hadir, r.sakit, r.izin, r.alpha, r.pct.toFixed(0) + '%', r.poin, r.fin !== null ? r.fin.toFixed(1) : '-']);
  return [header, ...body];
}

document.getElementById('exportExcelBtn').addEventListener('click', () => {
  if (!currentRekapRows.length) { toast('Tampilkan rekap terlebih dahulu'); return; }
  const ws = XLSX.utils.aoa_to_sheet(rekapAoa());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
  XLSX.writeFile(wb, `rekap-${classById(getCtx().classId)?.name || 'kelas'}-${rekapFrom.value}_${rekapTo.value}.xlsx`);
});

document.getElementById('exportPdfBtn').addEventListener('click', () => {
  if (!currentRekapRows.length) { toast('Tampilkan rekap terlebih dahulu'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const kelas = classById(getCtx().classId)?.name || '';
  doc.setFontSize(13); doc.text(`Rekap Kelas ${kelas}`, 14, 15);
  doc.setFontSize(9); doc.text(`Periode: ${rekapFrom.value} s/d ${rekapTo.value}`, 14, 21);
  const aoa = rekapAoa();
  doc.autoTable({ head: [aoa[0]], body: aoa.slice(1), startY: 26, styles: { fontSize: 8 }, headStyles: { fillColor: [112, 64, 224] } });
  doc.save(`rekap-${kelas}-${rekapFrom.value}_${rekapTo.value}.pdf`);
});

document.getElementById('exportWordBtn').addEventListener('click', () => {
  if (!currentRekapRows.length) { toast('Tampilkan rekap terlebih dahulu'); return; }
  const kelas = classById(getCtx().classId)?.name || '';
  const aoa = rekapAoa();
  const tableHtml = `<table border="1" style="border-collapse:collapse;font-family:Calibri;font-size:12px">
    <thead><tr>${aoa[0].map(h => `<th style="padding:4px;background:#7040E0;color:#fff">${h}</th>`).join('')}</tr></thead>
    <tbody>${aoa.slice(1).map(row => `<tr>${row.map(c => `<td style="padding:4px">${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>Rekap</title></head>
    <body>
      <h2 style="font-family:Calibri">Rekap Kelas ${kelas}</h2>
      <p style="font-family:Calibri;font-size:12px">Periode: ${rekapFrom.value} s/d ${rekapTo.value}</p>
      ${tableHtml}
    </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `rekap-${kelas}-${rekapFrom.value}_${rekapTo.value}.doc`;
  link.click();
});

/* =========================================================================
   PENGATURAN
   ========================================================================= */

const BOBOT_IDS = { tugas: 'bobotTugas', uh: 'bobotUh', ulisan: 'bobotUlisan', uts: 'bobotUts', uas: 'bobotUas', praktikum: 'bobotPraktikum' };

function renderPengaturan() {
  const w = state.settings.weights;
  Object.entries(BOBOT_IDS).forEach(([key, id]) => { document.getElementById(id).value = w[key] || 0; });
  document.getElementById('enableUlisanToggle').checked = !!state.settings.enableUlisan;
  document.getElementById('bobotUlisanWrap').style.display = state.settings.enableUlisan ? '' : 'none';
  updateBobotHint();
  document.getElementById('sheetsUrl').value = state.settings.sheetsUrl || '';
  renderGuruProfile();
}

function updateBobotHint() {
  const ids = state.settings.enableUlisan ? Object.values(BOBOT_IDS) : Object.values(BOBOT_IDS).filter(id => id !== 'bobotUlisan');
  const total = ids.reduce((a, id) => a + (Number(document.getElementById(id).value) || 0), 0);
  const hint = document.getElementById('bobotHint');
  hint.textContent = `Total saat ini: ${total}%` + (total !== 100 ? ' — sebaiknya 100%, tapi aplikasi tetap akan menormalkan otomatis.' : ' ✓');
}
Object.values(BOBOT_IDS).forEach(id => document.getElementById(id).addEventListener('input', updateBobotHint));

document.getElementById('enableUlisanToggle').addEventListener('change', (e) => {
  state.settings.enableUlisan = e.target.checked;
  saveState();
  refreshNilaiJenisOptions();
  renderPengaturan();
  renderNilaiChips();
  renderNilaiInputTable();
  renderNilaiRekap();
  toast(state.settings.enableUlisan ? 'Ulangan Lisan diaktifkan' : 'Ulangan Lisan dinonaktifkan');
});

document.getElementById('saveBobotBtn').addEventListener('click', () => {
  const weights = {};
  Object.entries(BOBOT_IDS).forEach(([key, id]) => { weights[key] = Number(document.getElementById(id).value) || 0; });
  state.settings.weights = weights;
  saveState();
  toast('Bobot nilai disimpan');
  renderAll();
});

document.getElementById('saveSheetsBtn').addEventListener('click', async () => {
  const url = document.getElementById('sheetsUrl').value.trim();
  state.settings.sheetsUrl = url;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const result = document.getElementById('sheetsTestResult');
  if (!url) { result.textContent = 'URL dikosongkan — sinkronisasi otomatis dimatikan.'; updateSyncBadge(); return; }
  result.textContent = 'Menguji koneksi (mengambil data dari Spreadsheet)…';
  const ok = await pullFromSheets(true);
  if (ok) {
    result.textContent = '✓ Terhubung. Data dari Spreadsheet berhasil dimuat ke perangkat ini. Mulai sekarang, setiap perubahan (nilai, absensi, dll.) otomatis tersimpan & terkirim ke Spreadsheet ini — tidak perlu klik apa pun lagi.';
  } else {
    result.textContent = '✗ Gagal terhubung. Cek kembali URL dan langkah deploy di TUTORIAL.md (pastikan sudah redeploy sebagai versi terbaru).';
  }
});

document.getElementById('downloadBackupBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cadangan-bukukelas-${todayStr()}.json`;
  link.click();
});

document.getElementById('restoreFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm('Ini akan menimpa seluruh data saat ini dengan isi file cadangan. Lanjutkan?')) return;
      state = Object.assign(structuredClone(DEFAULT_STATE), data, { settings: Object.assign({}, DEFAULT_STATE.settings, data.settings || {}) });
      saveState(); refreshKelasOptions(); renderAll();
      toast('Data berhasil dipulihkan');
    } catch (err) { toast('File cadangan tidak valid'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (!confirm('Semua data (kelas, siswa, absensi, nilai) akan dihapus permanen dari peramban ini. Yakin?')) return;
  if (!confirm('Konfirmasi sekali lagi: hapus semua data?')) return;
  state = structuredClone(DEFAULT_STATE);
  saveState(); refreshKelasOptions(); renderAll();
  toast('Semua data telah dihapus');
});

/* =========================================================================
   SINKRON DENGAN GOOGLE SPREADSHEET (dua arah)
   ========================================================================= */

function updateSyncBadge() {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  const timeEl = document.getElementById('syncTime');
  if (state.settings.sheetsUrl) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const pending = hasUnsyncedChanges();
    dot.classList.toggle('is-ok', !pending && !offline);
    dot.classList.toggle('is-offline', offline);
    if (offline) label.textContent = pending ? 'Offline — perubahan tersimpan, akan terkirim otomatis saat online' : 'Offline';
    else if (pending) label.textContent = 'Menyimpan otomatis ke Spreadsheet…';
    else label.textContent = 'Tersambung ke Google Sheets (Gmail)';
  } else {
    dot.classList.remove('is-ok', 'is-offline');
    label.textContent = 'Belum tersambung ke Google/Gmail';
  }
  const parts = [];
  if (state.settings.lastPull) parts.push('Ambil: ' + new Date(state.settings.lastPull).toLocaleString('id-ID'));
  if (state.settings.lastSync) parts.push('Kirim: ' + new Date(state.settings.lastSync).toLocaleString('id-ID'));
  timeEl.textContent = parts.length ? parts.join(' · ') : '—';
}

/* KIRIM: mendorong seluruh data perangkat ini ke Spreadsheet (menimpa isi
   Spreadsheet dengan versi dari perangkat ini). */
async function syncToSheets(silent) {
  const url = state.settings.sheetsUrl;
  if (!url) { if (!silent) toast('Isi URL Google Apps Script di Pengaturan terlebih dahulu'); return false; }
  const payload = {
    classes: state.classes,
    students: state.students.map(s => ({ ...s, kelas: classById(s.classId)?.name || '' })),
    attendance: state.attendance.map(a => ({ ...a, kelas: classById(a.classId)?.name || '', siswa: studentById(a.studentId)?.name || '' })),
    activityPoints: state.activityPoints.map(a => ({ ...a, kelas: classById(a.classId)?.name || '', siswa: studentById(a.studentId)?.name || '' })),
    activityNotes: state.activityNotes.map(n => ({ ...n, kelas: classById(n.classId)?.name || '', siswa: studentById(n.studentId)?.name || '' })),
    grades: state.grades.map(g => ({ ...g, kelas: classById(g.classId)?.name || '', siswa: studentById(g.studentId)?.name || '' })),
    praktikum: state.praktikum.map(p => ({ ...p, kelas: classById(p.classId)?.name || '' })),
    jurnalMengajar: state.jurnalMengajar.map(j => ({ ...j, kelas: classById(j.classId)?.name || '' })),
    schedule: state.schedule.map(j => ({ ...j, kelas: classById(j.classId)?.name || '' })),
    modules: state.modules.map(m => ({ ...m, kelas: classById(m.classId)?.name || '', content: (m.content || '').slice(0, 45000) })),
    pengaturan: {
      weights: state.settings.weights, enableUlisan: state.settings.enableUlisan, activityCategories: state.activityCategories,
      guruNama: state.settings.guru.nama, // catatan: foto & API key AI TIDAK dikirim ke Spreadsheet (tersimpan lokal saja)
      activeYear: state.settings.activeYear
    },
    syncedAt: new Date().toISOString()
  };
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    state.settings.lastSync = new Date().toISOString();
    state.settings.syncedSnapshot = coreSnapshotStr();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSyncBadge();
    if (!silent) toast('Data terkirim ke Spreadsheet');
    return true;
  } catch (err) {
    console.error('Sinkron (kirim) gagal', err);
    if (!silent) toast('Gagal mengirim data. Periksa koneksi internet dan URL.');
    return false;
  }
}

/* AMBIL: menarik data terbaru dari Spreadsheet dan menggantikan data di
   perangkat ini dengannya (dipakai supaya perubahan dari perangkat lain
   ikut muncul di sini). */
async function pullFromSheets(silent) {
  const url = state.settings.sheetsUrl;
  if (!url) { if (!silent) toast('Isi URL Google Apps Script di Pengaturan terlebih dahulu'); return false; }
  try {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(url + sep + 'action=pull&t=' + Date.now());
    const data = await res.json();
    if (!data || !data.ok) throw new Error((data && data.error) || 'Respons tidak valid');
    applyCloudSnapshot(data);
    state.settings.lastPull = new Date().toISOString();
    state.settings.syncedSnapshot = coreSnapshotStr();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSyncBadge();
    if (!silent) toast('Data terbaru berhasil diambil dari Spreadsheet');
    return true;
  } catch (err) {
    console.error('Sinkron (ambil) gagal', err);
    if (!silent) toast('Gagal mengambil data. Pastikan URL benar & skrip sudah versi terbaru (lihat TUTORIAL.md).');
    return false;
  }
}

function applyCloudSnapshot(data) {
  state.classes = data.classes || [];
  state.students = data.students || [];
  state.attendance = data.attendance || [];
  state.activityPoints = data.activityPoints || [];
  state.activityNotes = data.activityNotes || [];
  state.grades = data.grades || [];
  state.praktikum = data.praktikum || [];
  state.jurnalMengajar = data.jurnalMengajar || [];
  state.schedule = data.schedule || [];
  state.modules = data.modules || [];
  if (data.pengaturan) {
    if (data.pengaturan.weights) state.settings.weights = Object.assign({}, DEFAULT_STATE.settings.weights, data.pengaturan.weights);
    if (typeof data.pengaturan.enableUlisan === 'boolean') state.settings.enableUlisan = data.pengaturan.enableUlisan;
    if (Array.isArray(data.pengaturan.activityCategories) && data.pengaturan.activityCategories.length) state.activityCategories = data.pengaturan.activityCategories;
    if (typeof data.pengaturan.guruNama === 'string' && data.pengaturan.guruNama) state.settings.guru.nama = data.pengaturan.guruNama;
    if (typeof data.pengaturan.activeYear === 'string') state.settings.activeYear = data.pengaturan.activeYear;
  }
  refreshKelasOptions();
  refreshNilaiJenisOptions();
  renderAll();
}

document.getElementById('syncNowBtn').addEventListener('click', () => syncToSheets(false));
document.getElementById('pullNowBtn').addEventListener('click', async () => {
  if (hasUnsyncedChanges()) {
    toast('Mengirim perubahan yang tertunda dahulu…');
    const ok = await syncToSheets(true);
    if (!ok) { toast('Gagal mengirim perubahan tertunda (mungkin sedang offline). Coba lagi setelah tersambung ke internet.'); return; }
  }
  pullFromSheets(false);
});

/* =========================================================================
   RENDER SEMUA
   ========================================================================= */

function renderAll() {
  renderKelasTable();
  renderSiswaTable();
  renderAbsensiView();
  renderKeaktifanView();
  refreshNilaiJenisOptions();
  renderNilaiChips();
  renderNilaiInputTable();
  renderNilaiRekap();
  renderPraktikumTable();
  renderJurnalMengajarView();
  renderJadwalView();
  renderModulAjarView();
  renderRekapView();
  renderDashboard();
  renderPengaturan();
  renderGuruProfile();
  updateSyncBadge();
}

refreshKelasOptions();
refreshNilaiJenisOptions();
renderAll();

/* Saat aplikasi dibuka: kalau sudah terhubung ke Spreadsheet —
   - Kalau ada perubahan lokal yang belum terkirim (mis. sempat diisi saat
     offline), otomatis kirim dulu (tanpa perlu klik apa pun).
   - Kalau tidak ada perubahan tertunda, otomatis ambil data terbaru dari
     Spreadsheet supaya selalu memakai data terbaru dari perangkat lain. */
if (state.settings.sheetsUrl) {
  if (hasUnsyncedChanges()) {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      syncToSheets(true);
    } else {
      toast('Sedang offline. Perubahan yang tersimpan di perangkat ini akan otomatis terkirim begitu koneksi internet tersedia.');
    }
  } else {
    pullFromSheets(true);
  }
}
