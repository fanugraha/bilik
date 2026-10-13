import 'package:bilik_mobile/utils/format_kode.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

TextEditingValue _ketik(String teks) =>
    FormatKodeKapital().formatEditUpdate(TextEditingValue.empty, TextEditingValue(text: teks, selection: TextSelection.collapsed(offset: teks.length)));

void main() {
  group('FormatKodeKapital', () {
    test('mengubah ke huruf kapital', () {
      expect(_ketik('xrwu7s').text, 'XRWU7S');
    });

    test('membuang spasi dan tanda baca', () {
      expect(_ketik(' XR-WU 7s.').text, 'XRWU7S');
    });

    test('kursor tetap di akhir', () {
      expect(_ketik('ab c').selection.baseOffset, 3);
    });
  });
}
