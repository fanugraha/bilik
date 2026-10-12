---
name: bilik-dashboard
description: Panduan dashboard guru Bilik (Next.js di apps/dashboard). Use when mengerjakan dashboard guru Bilik, halaman auth/kelas/soal/ujian/ruang-kontrol/penilaian, atau komponen Next.js App Router dan Supabase client.
---

# Bilik Dashboard (Guru)

Dashboard guru di `apps/dashboard/`. Next.js 16, React 19, Tailwind 4, src-dir, App Router.

## Fitur target (PRD 5.1)

Auth (daftar/login/lupa password) → kelas+siswa (CRUD, impor CSV kolom nama/no_absen) → bank soal (PG 2-5 opsi + essay + pedoman) → pengaturan ujian (judul, mapel, durasi, acak, batas pelanggaran) → ruang kontrol live (kode besar, lobby setujui/tolak, mulai/akhiri/tambah waktu, tabel live, antrean kode buka) → penilaian (auto PG server, koreksi essay, rekap, ekspor Excel, log pelanggaran).

## Aturan

- App Router (`src/app/`). Jalankan `npm run dev` dari `apps/dashboard/`.
- File `AGENTS.md` di root dashboard dibuat otomatis oleh `next dev` — JANGAN hapus manual.
- Penilaian PG di server (function `hitung_skor_pg`), dashboard hanya tampilkan + koreksi essay.
- Ekspor Excel: pakai skill `xlsx` bila tersedia.
