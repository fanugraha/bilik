---
name: bilik-flutter
description: Panduan app siswa Bilik (Flutter di apps/mobile). Use when mengerjakan app mobile Bilik, ExamGuard platform channel, autosave, screen pinning, Guided Access, atau layar join/lobby/exam/locked/receipt.
---

# Bilik Flutter (App Siswa)

App siswa di `apps/mobile/`. Flutter 3.38, Riverpod, go_router, supabase_flutter.

## Struktur lib/

- `core/` — `env.dart` (dart-define SUPABASE_URL/ANON_KEY), `supabase_client.dart`, `router.dart`
- `models/` — kelas, siswa, soal, peserta, jawaban, pelanggaran
- `platform/` — `exam_guard.dart` (abstract), `exam_guard_android.dart`, `exam_guard_ios.dart`
- `services/` — `session_store.dart` (SharedPreferences), `autosave_service.dart` (flush 3 detik)
- `features/` — `join/`, `device_check/`, `lobby/`, `exam/`, `locked/`, `submit/`
- `providers/app_providers.dart` — examGuardProvider, autosaveServiceProvider, currentPesertaProvider, soalListProvider, currentSoalIndexProvider
- `app.dart`, `main.dart`

## Aturan keras (dari PRD)

1. Model `Soal` TIDAK boleh ada field kunci/pedoman/skor. Penilaian 100% server.
2. Alur layar: `/join` → `/device` → `/lobby` → `/exam` → `/locked` → `/receipt`.
3. Jalankan dengan dart-define: `flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`

## Platform channel

Channel `com.bilik/exam_guard` (MethodChannel) + `com.bilik/exam_guard_events` (EventChannel).

- Android (`MainActivity.kt`): `canPin`, `startLock`, `stopLock`; events `pinning_released`, `window_unfocused`, `multi_window`. FLAG_SECURE di onCreate. Manifest sudah ada `lockTaskMode`, `resizeableActivity=false`, `supportsPictureInPicture=false`.
- iOS (`AppDelegate.swift`): `isGuidedAccessEnabled`, `enableSecureView`, `disableSecureView`; events `screenshot`, `screen_record`, `app_inactive`, `guided_access_disabled`.

Bila ubah contract channel, ubah ketiga file sekaligus: `exam_guard*.dart` + `MainActivity.kt` + `AppDelegate.swift`.
