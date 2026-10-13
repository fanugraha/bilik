import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/app_providers.dart';
import 'session_store.dart';

/// Ambil token sesi peserta: dari provider (tercepat) atau penyimpanan lokal.
/// Dipakai bersama oleh layar yang butuh token ujian.
Future<String?> ambilTokenSesi(WidgetRef ref) async {
  final dariProvider = ref.read(tokenSesiProvider);
  if (dariProvider != null && dariProvider.isNotEmpty) return dariProvider;
  return (await SessionStore.getSession())['tokenSesi'];
}
