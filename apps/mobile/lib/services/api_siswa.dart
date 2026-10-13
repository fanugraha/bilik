import 'dart:convert';

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

/// Pesan error yang bisa dipahami siswa. Pesan dari fungsi `siswa` (field `error`) diutamakan;
/// tanpa itu (mis. ditolak gateway sebelum fungsi jalan) pesan disusun dari kode status.
String pesanGalatServer(int status, dynamic details) {
  var isi = details;
  if (isi is String && isi.trim().startsWith('{')) {
    try {
      isi = jsonDecode(isi);
    } on FormatException {
      // Bukan JSON: tampilkan apa adanya di bawah
    }
  }
  if (isi is Map && isi['error'] != null) return isi['error'].toString();
  if (isi is String && isi.trim().isNotEmpty && !isi.trim().startsWith('{')) return isi.trim();

  if (status == 404) return 'Kode ujian tidak ditemukan. Periksa lagi kodenya ke guru.';
  if (status == 401 || status == 403) return 'Aplikasi tidak diizinkan oleh server. Perbarui aplikasi lalu coba lagi.';
  if (status == 429) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  if (status >= 500) return 'Server sedang sibuk atau bermasalah. Coba lagi sebentar lagi.';
  return 'Permintaan ditolak server (kode $status). Coba lagi atau beri tahu guru.';
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
      // Status 0: permintaan tak sampai ke server (jaringan putus)
      if (e.status == 0) throw ApiException('Gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.');
      throw ApiException(pesanGalatServer(e.status, e.details));
    } catch (e) {
      // Kegagalan jaringan (tidak ada internet, koneksi direset, timeout) sering
      // terlihat seperti "server menolak". Beri pesan yang lebih tepat.
      if (e is ApiException) rethrow;
      throw ApiException('Gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.');
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
    String? alasan,
    bool raguRagu = false,
  }) async {
    await _call('simpan', {'token': token, 'soal_id': soalId, 'isi': isi, 'alasan': alasan, 'ragu_ragu': raguRagu});
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
