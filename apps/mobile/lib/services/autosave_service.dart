import 'dart:async';
import '../core/supabase_client.dart';
import '../models/jawaban.dart';
import 'session_store.dart';

/// Autosave lokal instan, lalu flush ke server tiap beberapa detik (PRD 5.2, 9).
class AutosaveService {
  final _pending = <String, Jawaban>{};
  Timer? _timer;

  void start() {
    _timer ??= Timer.periodic(const Duration(seconds: 3), (_) => flush());
  }

  void record(Jawaban jawaban) {
    _pending[jawaban.soalId] = jawaban;
    // Tulis lokal langsung, synchronous-like
    unawaited(SessionStore.cacheAnswer(jawaban));
  }

  Future<void> flush() async {
    if (_pending.isEmpty) return;
    final batch = List<Jawaban>.from(_pending.values);
    _pending.clear();

    try {
      final rows = batch.map((j) => j.toUpsert()).toList();
      await BilikSupabase.client.from('jawaban').upsert(rows);
    } catch (_) {
      // Gagal kirim: kembalikan ke antrean agar dicoba lagi
      for (final j in batch) {
        _pending.putIfAbsent(j.soalId, () => j);
      }
    }
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    flush();
  }
}
