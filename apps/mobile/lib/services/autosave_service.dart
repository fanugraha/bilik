import 'dart:async';

import '../models/jawaban.dart';
import 'api_siswa.dart';
import 'session_store.dart';

/// Autosave lokal instan, lalu kirim ke server tiap 3 detik (PRD 5.2, 9).
/// Kirim lewat edge function `siswa` (RLS tabel tetap guru-saja).
class AutosaveService {
  final _pending = <String, Jawaban>{};
  Timer? _timer;
  String? _token;

  int get pendingCount => _pending.length;

  void start({required String token}) {
    _token = token;
    _timer ??= Timer.periodic(const Duration(seconds: 3), (_) => flush());
  }

  void record(Jawaban jawaban) {
    _pending[jawaban.soalId] = jawaban;
    // Simpan lokal dulu agar tahan crash/koneksi putus.
    unawaited(SessionStore.cacheAnswer(jawaban));
  }

  /// Kirim semua jawaban tertunda. Yang gagal dikembalikan ke antrean.
  Future<void> flush() async {
    final token = _token;
    if (_pending.isEmpty || token == null) return;
    final batch = List<Jawaban>.from(_pending.values);
    _pending.clear();
    for (final j in batch) {
      try {
        await ApiSiswa.simpan(token: token, soalId: j.soalId, isi: j.isi, raguRagu: j.raguRagu);
      } catch (_) {
        _pending.putIfAbsent(j.soalId, () => j);
      }
    }
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }
}
