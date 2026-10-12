---
name: bilik-supabase
description: Panduan backend Bilik (Supabase di supabase/migrations). Use when mengubah schema database, RLS policies, functions SQL, atau migrasi tabel guru/kelas/siswa/soal/ujian/peserta/jawaban/pelanggaran/kode_buka.
---

# Bilik Supabase (Backend)

Migrasi di `supabase/migrations/`, berurutan:

1. `20261012000001_initial_schema.sql` — 11 tabel + index
2. `20261012000002_rls_policies.sql` — RLS policies
3. `20261012000003_functions.sql` — helper SQL (hitung_skor_pg, generate_kode_ujian, generate_kode_buka)

## Tabel (PRD bagian 7)

guru, kelas, siswa, soal (tipe pg/essay, opsi jsonb, kunci, pedoman, bobot), ujian (status draft/lobby/berjalan/selesai/dinilai, kode unik 6 char), ujian_kelas, ujian_soal, peserta (status menunggu/mengerjakan/terkunci/selesai, token_sesi unik), jawaban (isi, ragu_ragu, skor), pelanggaran (jenis, waktu_server), kode_buka (sekali pakai, kedaluwarsa).

## Aturan RLS keras

- Siswa (anon) akses via `token_sesi` di JWT claim — JANGAN ubah pola ini tanpa ganti auth flow mobile.
- Anon/siswa TIDAK BOLEH baca `soal.kunci`, `soal.pedoman`, `jawaban.skor`. Policy select guru saja.
- `kode_buka`: hanya guru (all policy join ujian-guru).
- Perubahan schema: buat file migrasi BARU dengan timestamp berikutnya, JANGAN edit migrasi lama yang sudah di-push.

## Perintah

- `supabase db push` — apply migrasi ke cloud (butuh `supabase link` dulu)
- `supabase db diff` — cek drift schema
