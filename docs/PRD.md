# PRD: Bilik (Aplikasi Ujian Anti-Curang)

> Nama kerja: **Bilik** (ruang ujian di dalam HP). Alternatif: UjianAman, Kisi, Jaga. Cek ketersediaan nama di Play Store/App Store sebelum dipakai resmi.

## 1. Ringkasan

Bilik adalah aplikasi ujian untuk guru dan siswa. Guru membuat soal (pilihan ganda dan essay) di dashboard web, siswa mengerjakan di app mobile (Flutter, Android dan iPhone) yang dikunci selama ujian. Pelanggaran dideteksi dan dicatat di server. Nilai hanya dilihat guru.

## 2. Tujuan MVP

Satu kelas bisa ujian serentak dengan aman: guru membuat soal, siswa mengerjakan di HP terkunci, pelanggaran tercatat, guru mendapat rekap nilai.

**Bukan tujuan MVP:** anti-curang 100% (HP kedua dan bantuan orang lain tidak bisa dicegah secara teknis), proctoring kamera, multi-sekolah.

## 3. Pengguna

| Peran | Akses | Platform |
|---|---|---|
| Guru | Login email + password | Dashboard web (React/Next.js) |
| Siswa | **Tanpa akun**: kode ujian, pilih kelas, pilih nama dari daftar | App Flutter (Android + iOS) |

## 4. Alur Ujian

Status ujian: `draft` -> `lobby` -> `berjalan` -> `selesai` -> `dinilai`.

1. Guru membuat ujian (draft), memilih soal, durasi, kelas, pengaturan.
2. Guru membuka lobby; server membuat **kode ujian** (6 karakter) yang ditampilkan besar untuk proyektor.
3. Siswa: input kode -> pilih kelas -> pilih nama (nama terpakai tidak bisa dipilih lagi) -> cek perangkat -> masuk lobby.
4. Guru **Setujui/Tolak** tiap siswa di lobby (mencocokkan dengan wajah di ruangan).
5. Guru menekan **Mulai** (dengan konfirmasi). Soal terbuka serentak, timer server berjalan.
6. Siswa mengerjakan, jawaban autosave. Submit manual atau otomatis saat waktu habis.
7. Siswa hanya melihat **tanda terima** (tanpa skor, tanpa benar/salah).
8. Guru mengoreksi essay, melihat rekap, ekspor Excel. Status jadi `dinilai`.

## 5. Kebutuhan Fungsional

### 5.1 Dashboard Guru

- **Akun:** daftar, login, lupa password.
- **Kelas dan siswa:** buat kelas, impor siswa CSV/Excel (kolom: `nama`, `no_absen`), tambah/edit/hapus manual.
- **Bank soal:**
  - Pilihan ganda: teks, 2-5 opsi, satu kunci, bobot.
  - Essay: teks, bobot, pedoman jawaban (hanya terlihat guru).
  - Teks saja (gambar opsional jika waktu cukup).
- **Pengaturan ujian:** judul, mapel, kelas peserta, durasi, pilih soal dan bobot, acak soal, acak opsi, batas pelanggaran (default 3).
- **Ruang kontrol (live):**
  - Kode ujian besar.
  - Daftar lobby dengan Setujui/Tolak.
  - Tombol Mulai, Akhiri, Tambah waktu (per siswa atau semua); semua dengan konfirmasi.
  - Tabel live: nama, status (menunggu/mengerjakan/terkunci/selesai), soal terjawab, jumlah pelanggaran.
  - Antrean siswa terkunci dengan tombol **Beri kode buka**.
  - Reset pilihan nama atau izin ganti perangkat untuk siswa tertentu.
- **Penilaian:** pilihan ganda otomatis di server; halaman koreksi essay (jawaban + pedoman + input skor); rekap per kelas; ekspor Excel; log pelanggaran per siswa.

### 5.2 App Siswa

1. **Masuk:** kode ujian, kelas, nama.
2. **Cek perangkat sebelum mulai:**
   - Android: screen pinning harus bisa aktif.
   - iPhone: Guided Access harus aktif.
   - Jika belum, tombol "Siap" nonaktif.
3. **Lobby:** menunggu persetujuan dan perintah mulai.
4. **Pengerjaan:** satu soal per layar, navigasi nomor soal, tanda ragu-ragu, timer dari server, autosave (lokal + server), indikator koneksi.
5. **Layar terkunci:** muncul saat pelanggaran melewati batas; ada kolom input kode buka. Timer tetap berjalan.
6. **Kumpulkan:** konfirmasi, lalu tanda terima (tanpa nilai). Otomatis kumpul saat waktu habis.

## 6. Aturan Anti-Curang

### Android
- Screen pinning wajib (`startLockTask`), status dicek terus (`getLockTaskModeState`); terlepas = pelanggaran.
- `FLAG_SECURE` (blokir screenshot, rekam layar, thumbnail Recent Apps).
- Deteksi kehilangan fokus (`onWindowFocusChanged`) dan lifecycle.
- Multi-window dan PiP dimatikan di manifest; `isInMultiWindowMode` sebagai cadangan.

### iPhone
- Guided Access wajib (`UIAccessibility.isGuidedAccessEnabled`).
- Deteksi lifecycle (`inactive`/`paused`): pindah app, Control Center, Notification Center.
- Deteksi screenshot (`userDidTakeScreenshotNotification`) dan screen recording (`UIScreen.isCaptured`) sebagai pelanggaran; sembunyikan konten saat terekam.
- AAC (`AEAssessmentSession`) ditunda; ajukan entitlement ke Apple secara paralel.

### Kedua platform
- Pelanggaran dikirim ke server saat kejadian (jenis + waktu), bukan dikumpulkan di akhir.
- Pelanggaran ke-N -> ujian terkunci sampai guru memberi kode buka.
- Kode buka: per siswa, sekali pakai, kedaluwarsa cepat.
- Timer dihitung server; terus berjalan saat terkunci. Kompensasi hanya lewat tombol Tambah waktu guru (tercatat).
- Satu perangkat per peserta; ganti perangkat butuh izin guru.
- Heartbeat tiap beberapa detik; putus lama dicatat sebagai kejadian (ada toleransi sinyal jelek).
- **Kunci jawaban dan skor tidak pernah dikirim ke app.** Penilaian hanya di server.
- Jawaban yang diterima setelah batas waktu server ditolak; waktu diambil dari server, bukan timestamp klien.
- Rate limit pada input kode ujian dan kode buka.

## 7. Model Data

| Tabel | Kolom utama |
|---|---|
| `guru` | id, nama, email |
| `kelas` | id, guru_id, nama |
| `siswa` | id, kelas_id, nama, no_absen |
| `soal` | id, guru_id, tipe (pg/essay), teks, opsi (json), kunci, pedoman, bobot |
| `ujian` | id, guru_id, judul, mapel, durasi, acak_soal, acak_opsi, batas_pelanggaran, kode, status, mulai_at, selesai_at |
| `ujian_kelas` | ujian_id, kelas_id |
| `ujian_soal` | ujian_id, soal_id, urutan, bobot |
| `peserta` | id, ujian_id, siswa_id, device_id, token_sesi, status, disetujui, mulai_at, selesai_at, jumlah_pelanggaran, tambahan_waktu |
| `jawaban` | id, peserta_id, soal_id, isi, diterima_at (server), skor (hanya guru) |
| `pelanggaran` | id, peserta_id, jenis, waktu_server, keterangan |
| `kode_buka` | id, peserta_id, kode, dipakai, kedaluwarsa_at |

Aturan akses: peran siswa/anonim **tidak bisa** membaca `soal.kunci`, `soal.pedoman`, `jawaban.skor`. Soal dikirim bertahap/saat ujian berjalan, bukan sebelumnya.

## 8. Teknologi

- **App siswa:** Flutter; platform channel Kotlin (Android) dan Swift (iOS) untuk kunci layar dan deteksi. Antarmuka seragam `ExamGuard` dengan implementasi per platform.
- **Dashboard guru:** React/Next.js.
- **Backend:** Supabase (Postgres, auth guru, realtime untuk ruang kontrol, edge function untuk penilaian, timer, validasi).
- **State management Flutter:** Riverpod atau Bloc.

## 9. Kebutuhan Non-Fungsional

- Kapasitas: 40-100 siswa serentak per ujian (asumsi; konfirmasi).
- Tahan koneksi putus: autosave lokal, sinkron ulang otomatis.
- Beban "Mulai" serentak: soal sudah di-cache terenkripsi di perangkat saat lobby, dibuka dengan kunci saat Mulai.
- Privasi: data siswa di bawah umur; kebijakan retensi data, selaras UU PDP.
- Uji perangkat: minimal 3 merek Android (mis. Samsung, Xiaomi, Oppo) dan 1 iPhone fisik.

## 10. Di Luar MVP

Rilis nilai ke siswa, review benar/salah, kamera/proctoring, verifikasi wajah, Play Integrity/App Attest, deteksi root/jailbreak, AAC iOS, kode ujian berganti otomatis, jadwal fleksibel (rentang waktu), 2FA guru, audit log lengkap, analisis pola ketikan essay/bantuan AI, soal bergambar dan rumus, bank soal bersama, multi-sekolah dan peran admin.

## 11. Risiko yang Diterima

- HP kedua dan bantuan orang lain tidak bisa dicegah secara teknis; mitigasi: pengawas fisik, soal diacak, desain soal kontekstual.
- Di HP pribadi tanpa MDM, screen pinning Android bisa dilepas siswa; mitigasi: deteksi + kunci + kode buka.
- iPhone lebih longgar dari Android; mitigasi: Guided Access wajib, pelanggaran dicatat.
- Perilaku berbeda antar merek Android; mitigasi: uji perangkat nyata.
- Jalur cadangan untuk siswa tanpa HP/HP rusak (HP sekolah atau kertas) di luar sistem.

## 12. Tahapan Pembangunan

1. **Fondasi:** proyek, database, auth guru, kelas dan siswa.
2. **Soal dan ujian:** CRUD soal, susun ujian, kode ujian.
3. **Alur pengerjaan:** lobby, persetujuan, mulai serentak, timer server, autosave, submit.
4. **Penilaian:** auto-nilai PG, koreksi essay, rekap, ekspor Excel.
5. **Anti-curang:** deteksi pelanggaran, kunci layar, antrean kode buka, heartbeat.
6. **Uji lapangan:** satu kelas nyata, beberapa merek HP, perbaikan.

## 13. Kriteria Selesai (MVP)

- [ ] Guru menjalankan ujian 20 soal untuk 30 siswa tanpa kendala.
- [ ] Pindah app di Android dan iPhone tercatat dan memicu kunci setelah N pelanggaran.
- [ ] Siswa terputus bisa lanjut tanpa kehilangan jawaban.
- [ ] PG dinilai otomatis, essay bisa dikoreksi, rekap bisa diekspor Excel.
- [ ] Tidak ada skor, kunci, atau pedoman yang bisa diakses dari app siswa.
- [ ] Teruji di 3 merek Android dan 1 iPhone.

## 14. Pertanyaan Terbuka

1. Impor daftar siswa (asumsi: ya) atau siswa mengetik sendiri?
2. Jumlah siswa per ujian (asumsi: 40-100)?
3. Satu guru atau banyak guru per sekolah (perlu peran admin)?
4. Ujian selalu di kelas dengan pengawas, atau ada yang dari rumah?
