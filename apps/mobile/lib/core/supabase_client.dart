import 'package:supabase_flutter/supabase_flutter.dart';

import 'env.dart';

/// Singleton Supabase untuk app siswa.
/// Auth guru tidak dipakai di sini (PRD 3: siswa tanpa akun,
/// masuk lewat kode ujian + token_sesi peserta).
class BilikSupabase {
  static Future<void> init() async {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
