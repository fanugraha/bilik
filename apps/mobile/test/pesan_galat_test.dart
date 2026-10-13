import 'package:bilik_mobile/services/api_siswa.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('pesanGalatServer', () {
    test('memakai pesan error dari server bila ada', () {
      expect(pesanGalatServer(404, {'error': 'Kode ujian tidak ditemukan'}), 'Kode ujian tidak ditemukan');
    });

    test('membaca pesan dari body JSON yang masih berupa teks', () {
      expect(pesanGalatServer(409, '{"error":"Ujian belum dibuka atau sudah selesai"}'), 'Ujian belum dibuka atau sudah selesai');
    });

    test('kode tak dikenal tanpa pesan: jelaskan dengan bahasa siswa', () {
      expect(pesanGalatServer(404, null), 'Kode ujian tidak ditemukan. Periksa lagi kodenya ke guru.');
    });

    test('ditolak gateway (kunci aplikasi): minta perbarui aplikasi', () {
      expect(pesanGalatServer(401, {'code': 401, 'message': 'Invalid JWT'}),
          'Aplikasi tidak diizinkan oleh server. Perbarui aplikasi lalu coba lagi.');
    });

    test('server sedang bermasalah', () {
      expect(pesanGalatServer(503, ''), 'Server sedang sibuk atau bermasalah. Coba lagi sebentar lagi.');
    });

    test('teks biasa yang bukan JSON tetap ditampilkan', () {
      expect(pesanGalatServer(400, 'Data tidak lengkap'), 'Data tidak lengkap');
    });
  });
}
