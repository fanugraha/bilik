import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/env.dart';
import 'core/supabase_client.dart';
import 'services/session_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Env.isConfigured) {
    await BilikSupabase.init();
  }

  // Ada sesi tersimpan? Langsung lanjut ke lobby (biar tak perlu isi kode lagi
  // saat app dibuka ulang di tengah ujian).
  final sesi = await SessionStore.getSession();
  final token = sesi['tokenSesi'];
  final awal = (token != null && token.isNotEmpty) ? '/lobby' : '/join';

  runApp(ProviderScope(child: BilikApp(awal: awal)));
}
