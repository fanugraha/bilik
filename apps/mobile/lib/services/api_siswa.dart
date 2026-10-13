import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/supabase_client.dart';
import '../models/join.dart';
import '../models/sesi.dart';
import '../models/soal.dart';

/// Kesalahan yang aman ditampilkan ke siswa.
class ApiException implements Exception {
  final String pesan;
  ApiException(this.pesan);
  @override
  String toString() => pesan;
}

/// Satu pintu ke edge function `siswa` (PRD Fase 3).
/// App siswa tak pernah menyentuh tabel langsung.
class ApiSiswa {
  static Future<Map<String, dynamic>> _call(String aksi, Map<String, dynamic> body) async {
    try {
      final res = await BilikSupabase.client.functions.invoke('siswa', body: {'aksi': aksi, ...body});
      final data = res.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      throw ApiException('Respons server tidak dikenal');
    } on FunctionException catch (e) {
      final d = e.details;
      if (d is Map && d['error'] != null) throw ApiException(d['error'].toString());
      if (d is String && d.isNotEmpty) throw ApiException(d);
      throw ApiException('Server menolak permintaan (${e.status})');
    }
  }

  static Future<JoinData> join({required String kode, required String deviceId}) async {
    return JoinData.fromJson(await _call('join', {'kode': kode, 'device_id': deviceId}));
  }

  static Future<HasilPilih> pilih({
    required String kode,
    required String kelasId,
    required String siswaId,
    required String deviceId,
  }) async {
    return HasilPilih.fromJson(await _call('pilih', {
      'kode': kode,
      'kelas_id': kelasId,
      'siswa_id': siswaId,
      'device_id': deviceId,
    }));
  }

  static Future<StatusSesi> status(String token) async {
    return StatusSesi.fromJson(await _call('status', {'token': token}));
  }

  static Future<HasilSoal> soal(String token) async {
    return HasilSoal.fromJson(await _call('soal', {'token': token}));
  }

  static Future<void> simpan({
    required String token,
    required String soalId,
    String? isi,
    bool raguRagu = false,
  }) async {
    await _call('simpan', {'token': token, 'soal_id': soalId, 'isi': isi, 'ragu_ragu': raguRagu});
  }

  static Future<void> submit(String token) async {
    await _call('submit', {'token': token});
  }

  /// Catat pelanggaran. Balikan: total, batas, dan apakah peserta terkunci.
  static Future<({int jumlah, int batas, bool terkunci})> lapor({
    required String token,
    required String jenis,
    String? keterangan,
  }) async {
    final d = await _call('lapor', {'token': token, 'jenis': jenis, 'keterangan': keterangan});
    return (
      jumlah: (d['jumlah_pelanggaran'] as num?)?.toInt() ?? 0,
      batas: (d['batas'] as num?)?.toInt() ?? 3,
      terkunci: d['terkunci'] == true,
    );
  }

  /// Buka kunci dengan kode sekali pakai dari guru.
  static Future<String> buka({required String token, required String kode}) async {
    final d = await _call('buka', {'token': token, 'kode': kode});
    return d['status'] as String? ?? 'mengerjakan';
  }
}
