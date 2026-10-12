import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/supabase_client.dart';
import '../models/join.dart';
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

  static Future<JoinData> join(String kode) async {
    return JoinData.fromJson(await _call('join', {'kode': kode}));
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
}
