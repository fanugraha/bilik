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

## Sesi lanjutan (2026-10-13 — revisi, distribusi, deploy)

### 5. Revisi fitur dari uji pengguna
- **Soal Benar/Salah + alasan wajib**: siswa harus mengisi alasan; kolom `jawaban.alasan`, app menampilkan input (blokir lanjut/kumpul bila kosong), guru melihat alasan saat mengoreksi. Migrasi `20261013080000_alasan_benar_salah.sql`.
- **Aksi massal ruang kontrol**: "Setujui semua" kini juga berfungsi saat ujian **berjalan** (siswa telat langsung mulai); tambah "Buka semua" untuk membuka kunci antrean terkunci sekaligus.
- **Blokir pelanggaran opsional** per ujian (`ujian.blokir_pelanggaran`, toggle di wizard). Pelanggaran tetap dicatat walau blokir mati. Migrasi `20261013090000_blokir_pelanggaran_opsional.sql`.
- **Logo Google berwarna** di tombol "Masuk dengan Google" (`IkonGoogle` + `ikonKustom` di `Tombol`).

### 6. Distribusi app siswa (tanpa Play Store/App Store)
- **Android**: APK dibagikan lewat **Supabase Storage** (bucket publik `unduhan`, file `bilik-siswa.apk`) + halaman publik **`/unduh`** berisi petunjuk & tombol unduh. Murid: buka link → unduh → izinkan "install unknown apps" → pasang.
- **iOS**: belum bisa tanpa Apple Developer Program (TestFlight/ad-hoc).

### 7. Deploy produksi
- **Dashboard guru** di **Vercel**: https://bilik-lemon.vercel.app (proyek `bilik`). Env Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Build cloud sempat gagal (konflik peer-dep `vitest@5` vs `@types/node@20`) → diperbaiki dengan `.npmrc` (`legacy-peer-deps=true`) + set framework proyek `nextjs`.
- **Login Google** awalnya memantul ke `localhost:3000`: karena Supabase Auth belum mengizinkan domain Vercel, GoTrue jatuh ke Site URL lama. Diperbaiki dengan set **Site URL** `https://bilik-lemon.vercel.app` + **Redirect URL** `https://bilik-lemon.vercel.app/**` di Supabase → Authentication → URL Configuration.
- Catatan: proyek Vercel terhubung via CLI (bukan integrasi Git), jadi update perlu deploy ulang dari CLI.

### 8. Pengujian
- **Happy path** (edge function + SQL): 30/30 soal tersimpan, submit selesai, penilaian otomatis PG 15 + B/S 10 + essay 10 = 100.
- **Uji negatif**: 18 kasus (kode salah, token salah, soal bukan bagian, simpan setelah kumpul, salah jawab → skor 0, kode buka salah ≤5 percobaan lalu rate-limit, kode sekali-pakai) — sesuai harapan.
- **Uji UI**: sisi siswa di HP via `adb` (join → cek perangkat → lobby → ujian → "Jawaban Terkirim"); sisi guru di dashboard via remote debugging (Setujui semua → Mulai → Akhiri → halaman Nilai).
- **Data dummy**: kelas + 30 soal (15 PG, 10 Benar/Salah, 5 Essay) pada akun guru testing; ujian kode 6 karakter.

## Status saat ini
- **Dashboard**: auth (termasuk Google), kelas & siswa (+ impor CSV), bank soal (PG / Benar-Salah / Essay berkelompok), ujian, ruang kontrol realtime, penilaian (rekap per siswa & per soal, histogram, ekspor `.xlsx`).
- **App siswa**: join (kode → kelas → nama), cek perangkat, lobby, pengerjaan (timer server, autosave, ragu-ragu, submit), anti-curang (pelanggaran, kunci, kode buka).
- **Backend**: edge function `siswa` (join/pilih/status/soal/simpan/submit/lapor/buka), auto-tutup ujian, trigger pelanggaran, rate limit kode, skema ternormalisasi + view `ml_jawaban`.

## Belum dikerjakan
- Distribusi **iOS** (butuh Apple Developer Program) dan uji lapangan lintas perangkat (Samsung/Oppo + iPhone), build/uji iOS.
- Integrasi Git di Vercel agar `git push` auto-deploy (sekarang deploy manual dari CLI).
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
