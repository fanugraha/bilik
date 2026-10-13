# Bilik — Aplikasi Ujian Anti-Curang

Monorepo aplikasi ujian untuk guru dan siswa. Guru membuat soal di dashboard web, siswa mengerjakan di app mobile yang dikunci selama ujian.

## Struktur

```
Bilik/
├── apps/
│   ├── mobile/        Flutter app (Android + iOS) untuk siswa
│   └── dashboard/     Next.js dashboard untuk guru
├── supabase/
│   ├── migrations/    Schema database Postgres
│   └── functions/     Edge function siswa (index router + handlers/ + lib/)
├── docs/              PRD dan dokumentasi
└── catatan/           Memori proyek (disimpan otomatis ke vault hermesops)
```

## Tech Stack

- **Mobile:** Flutter 3.38, Riverpod, Supabase Flutter SDK
- **Dashboard:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)

## Setup Awal

### 1. Mobile App

```bash
cd apps/mobile
flutter pub get
```

Jalankan dengan environment variables:

```bash
flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co \
            --dart-define=SUPABASE_ANON_KEY=eyJxxx
```

**Platform channel:**
- Android: `MainActivity.kt` implementasi screen pinning, FLAG_SECURE, window focus
- iOS: `AppDelegate.swift` implementasi Guided Access check, screenshot/recording detection

### 2. Dashboard

```bash
cd apps/dashboard
npm install
npm run dev
```

Buka http://localhost:3000

### 3. Supabase

```bash
# Login ke Supabase
supabase login

# Link ke project cloud (atau start lokal)
supabase link --project-ref <project-id>

# Apply migrasi
supabase db push
```

## Alur Ujian (MVP)

1. **Guru:** Buat ujian (soal PG + essay), buka lobby → kode ujian muncul
2. **Siswa:** Input kode → pilih kelas → pilih nama → cek perangkat (screen pinning/Guided Access)
3. **Guru:** Setujui siswa di lobby (cocokkan wajah), tekan Mulai
4. **Siswa:** Mengerjakan (layar terkunci, autosave, deteksi pelanggaran)
5. **Guru:** Monitoring live, beri kode buka bila terkunci, akhiri ujian
6. **Siswa:** Submit → tanda terima (tanpa nilai)
7. **Guru:** Koreksi essay, rekap, ekspor Excel

## Anti-Curang (PRD bagian 6)

### Android
- Screen pinning wajib (`startLockTask`)
- `FLAG_SECURE` (blokir screenshot/screen recording)
- Deteksi window unfocused & multi-window
- Pelanggaran → kunci ujian setelah N kali

### iOS
- Guided Access wajib
- Deteksi screenshot & screen recording
- Deteksi app lifecycle (Control Center, Notification Center)
- Pelanggaran → kunci ujian setelah N kali

### Kedua Platform
- Kunci jawaban & skor **tidak pernah dikirim** ke app
- Timer dihitung server (tidak percaya timestamp klien)
- Heartbeat periodik, putus lama dicatat
- Kode buka: per siswa, sekali pakai, kedaluwarsa cepat

## Status

Fase 0–7 **selesai**; Fase 8 (QA otomatis) selesai — tinggal uji lapangan manual.
- **Dashboard**: auth guru (daftar/login/lupa password), kelas & siswa (+impor CSV), bank soal (PG/Benar-Salah/Essay, berkelompok), ujian, ruang kontrol realtime, penilaian (rekap per siswa & per soal, histogram, ekspor `.xlsx`).
- **App siswa**: join (kode → kelas → nama), cek perangkat, lobby, pengerjaan (timer server, autosave offline, ragu-ragu, submit), anti-curang (catat pelanggaran, kunci, kode buka), UI bermerek + splash + ikon.
- **Backend**: edge function `siswa` (join/pilih/status/soal/simpan/submit/lapor/buka), auto-tutup ujian (pg_cron), trigger pelanggaran, rate limit kode.
- **Uji**: `flutter test` (mobile), `npm test` (dashboard), integration end-to-end.

Belum: uji lapangan lintas perangkat (Samsung/Xiaomi/Oppo + iPhone), build/uji iOS, SMTP email, Leaked Password Protection. Detail: `catatan/2026-10-12-progres-lengkap.md`.

## Struktur folder (ringkas)

- `apps/dashboard/src/app` — rute (halaman hanya merakit UI)
- `apps/dashboard/src/actions` — server actions (mutasi data)
- `apps/dashboard/src/components/{ui,auth,soal,siswa,ujian,layout}` — komponen UI
- `apps/dashboard/src/lib` — util & data (`supabase/`, `nilai.ts`, `ruang-kontrol.ts`, `relasi.ts`, `impor-siswa.ts`)
- `apps/mobile/lib` — `core/ components/ features/ models/ services/ platform/ providers/ utils/`
- `supabase/functions/siswa` — `index.ts` (router) + `handlers/` + `lib/`
- `supabase/migrations` — migrasi SQL berurutan

## Lisensi

Private (belum ditentukan).
