import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/env.dart';
import 'core/supabase_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Env.isConfigured) {
    await BilikSupabase.init();
  }

  // Splash screen yang menentukan lanjut ke lobby (ada sesi) atau join.
  runApp(const ProviderScope(child: BilikApp()));
}
