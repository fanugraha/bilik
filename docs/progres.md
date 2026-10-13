# Progres Pengembangan Bilik

Catatan ini merangkum progres yang sudah di-commit (berbeda dari `catatan/` yang bersifat memori lokal). Fokus terbaru: login Google, redesain UI/UX dashboard, dan perapian database sebagai fondasi analisis/ML.

## Sesi terbaru (2026-10-13)

### 1. Login dengan Google (dashboard guru)
- Tombol "Masuk dengan Google" di halaman login; server action `loginDenganGoogle` (Supabase OAuth) dengan callback di `/auth/callback`.
- Setup di luar kode: aktifkan provider Google di Supabase + OAuth client (Client ID/Secret) di Google Cloud Console, daftarkan redirect `https://<ref>.supabase.co/auth/v1/callback`.

### 2. Redesain UI/UX dashboard
- **Beranda**: aksi header kontekstual (ada ujian hidup → "Pantau ujian"), blok ujian aktif ringkas (tanpa dobel di daftar), ringkasan jadi strip, kartu onboarding.
- **Alur konsisten saat data awal**: tombol utama mengikuti langkah terdekat (kelas → siswa → bank soal → tulis soal → buat ujian); tetap fleksibel begitu data cukup.
- **Kelas**: aksi tiap baris diringkas jadi menu "Lainnya". **Siswa**: kotak pencarian. **Bank soal**: grid kartu → daftar. **Ujian**: penyaring status + jumlah.
- Komponen baru/ubah: ikon `google`/`lanjut`/`lainnya`, `PilihMapel` (dropdown mapel dari master).

### 3. Database: kerapian & fondasi ML
Migrasi baru (berurutan):
- `20261013054942_kerapian_database.sql` — master `mapel` + `mapel_alias`, kolom `mapel_id` (FK) di `ujian`/`bank_soal`, CHECK `pelanggaran.jenis`, unique `(guru_id, lower nama)` untuk kelas/bank, `NOT NULL` relasi inti, kolom `updated_at` + trigger, validasi angka & isi soal.
- `20261013055016_kerapian_database_search_path.sql` — kunci `search_path` fungsi + index FK.
- `20261013055316_tahap2_mapel_versi_ml.sql` — `mapel_id` jadi sumber kebenaran (kolom teks `mapel` denormal otomatis), **versi soal** (`soal.versi`, `soal_riwayat`, `jawaban.soal_versi`), view **`ml_jawaban`** untuk ekspor ML.
- `20261013060759_perbaikan_notnull_rls_ringkasan.sql` — NOT NULL untuk `created_at`/boolean; `kode_buka` satu aktif per peserta; RLS `(select auth.uid())` (warning initplan 18 → 3); RPC `ringkasan_guru()` (5 query CTA → 1).

### 4. Data dev dibersihkan
Semua data turunan (kelas, siswa, bank, soal, ujian, peserta, jawaban, pelanggaran) dihapus; disisakan akun `guru` dan master `mapel`.

## Status saat ini
- **Dashboard**: auth (termasuk Google), kelas & siswa (+ impor CSV), bank soal (PG / Benar-Salah / Essay berkelompok), ujian, ruang kontrol realtime, penilaian (rekap per siswa & per soal, histogram, ekspor `.xlsx`).
- **App siswa**: join (kode → kelas → nama), cek perangkat, lobby, pengerjaan (timer server, autosave, ragu-ragu, submit), anti-curang (pelanggaran, kunci, kode buka).
- **Backend**: edge function `siswa` (join/pilih/status/soal/simpan/submit/lapor/buka), auto-tutup ujian, trigger pelanggaran, rate limit kode, skema ternormalisasi + view `ml_jawaban`.

## Belum dikerjakan
- Uji lapangan lintas perangkat (Samsung/Xiaomi/Oppo + iPhone) dan build/uji iOS.
- SMTP email, Leaked Password Protection.
- Lanjutan DB opsional: hapus kolom teks `mapel` (setelah mobile tidak membacanya), enum Postgres untuk status/tipe, satukan `soal.bobot` vs `ujian_soal.bobot`.

## Verifikasi
```bash
# Dashboard
cd apps/dashboard && npm test && npm run lint && npm run build

# Mobile
cd apps/mobile && flutter test

# Migrasi database
supabase db push
```
