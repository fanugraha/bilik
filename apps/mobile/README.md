# Bilik — App Siswa (Flutter)

App ujian untuk siswa. Login tanpa akun: masuk lewat kode ujian, lalu layar dikunci selama ujian.

## Menjalankan

Isi URL + anon key Supabase lewat `--dart-define` (ada di `run-dev.sh`):

```bash
./run-dev.sh
# atau
flutter run \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key>
```

Build + pasang ke HP Android (MIUI perlu **Install via USB** & **Screen Pinning**):

```bash
flutter build apk --debug --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

## Struktur `lib/`

- `core/` — `env`, `supabase_client`, `router`, `theme`
- `components/` — UI reusable (`kartu`, `lencana`, `pesan`, `latar`, `langkah`)
- `features/` — `splash/ join/ device_check/ lobby/ exam/ locked/ receipt/`
  (widget layar ujian di `features/exam/widgets/`)
- `models/` — `join`, `ujian`, `peserta`, `soal`, `jawaban`, `sesi`
- `services/` — `api_siswa`, `autosave_service`, `session_store`, `sesi_aktif`
- `platform/` — `exam_guard` (Android: screen pinning + FLAG_SECURE; iOS: Guided Access + deteksi)
- `providers/` — state Riverpod
- `utils/` — `format`

## Catatan

- Semua akses data lewat edge function `siswa` (service role); app tak menyentuh tabel langsung.
- Kunci/pedoman soal TIDAK pernah dikirim ke app.
- Ikon & splash digenerate dari `assets/icon` & `assets/logo` (`flutter_launcher_icons`, `flutter_native_splash`).

## Uji

```bash
flutter test
```
