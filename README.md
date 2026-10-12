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
│   └── functions/     Edge functions (penilaian, timer, validasi)
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

Setup awal selesai. Belum ada:
- Implementasi lengkap UI dashboard (hanya scaffold)
- Integrasi realtime Supabase di mobile & dashboard
- Edge functions untuk timer & validasi waktu server
- Impor CSV siswa
- Ekspor Excel rekap nilai
- Uji perangkat fisik (Android: Samsung/Xiaomi/Oppo, iOS: iPhone)

Lihat `docs/PRD.md` untuk detail lengkap.

## Tahapan Berikutnya (PRD bagian 12)

1. ✅ Fondasi: proyek, database, struktur
2. ⏳ CRUD soal & ujian di dashboard
3. ⏳ Alur pengerjaan: lobby → persetujuan → mulai → autosave → submit
4. ⏳ Penilaian: auto-nilai PG, koreksi essay, rekap
5. ⏳ Anti-curang: deteksi pelanggaran, kunci layar, kode buka
6. ⏳ Uji lapangan: 1 kelas nyata, beberapa merek HP

## Lisensi

Private (belum ditentukan).
