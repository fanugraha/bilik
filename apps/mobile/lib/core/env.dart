/// Konfigurasi environment.
///
/// Isi lewat `--dart-define` saat build/run:
///   flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Detik antar kirim heartbeat & flush autosave ke server (PRD 6).
  static const heartbeatSeconds = 5;

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
