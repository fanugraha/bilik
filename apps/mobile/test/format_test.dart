import 'package:bilik_mobile/utils/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formatDurasi', () {
    test('nol jadi 00:00', () {
      expect(formatDurasi(Duration.zero), '00:00');
    });

    test('menit dan detik', () {
      expect(formatDurasi(const Duration(minutes: 5, seconds: 3)), '05:03');
      expect(formatDurasi(const Duration(minutes: 59, seconds: 59)), '59:59');
    });

    test('lebih dari satu jam pakai jam', () {
      expect(formatDurasi(const Duration(hours: 1, minutes: 2, seconds: 3)), '1:02:03');
    });

    test('durasi negatif dianggap nol', () {
      expect(formatDurasi(const Duration(seconds: -5)), '00:00');
    });
  });
}
