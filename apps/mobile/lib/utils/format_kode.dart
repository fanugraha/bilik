import 'package:flutter/services.dart';

/// Kode ujian / kode buka: hanya huruf kapital dan angka.
class FormatKodeKapital extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue lama, TextEditingValue baru) {
    final teks = baru.text.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    return TextEditingValue(text: teks, selection: TextSelection.collapsed(offset: teks.length));
  }
}

/// Pengaturan kolom kode. Autocorrect & saran keyboard dimatikan: keyboard HP (mis. MIUI/Gboard)
/// sempat mengganti kode yang diketik dengan "kata" yang pernah dipelajarinya (XRWU7S jadi WRWU7S),
/// sehingga server menolak kode yang sebenarnya diketik benar. visiblePassword memaksa keyboard
/// tanpa saran di kebanyakan HP Android.
const kodeAutocorrect = false;
const kodeEnableSuggestions = false;
const kodeKeyboardType = TextInputType.visiblePassword;
List<TextInputFormatter> formatterKode(int panjang) => [FormatKodeKapital(), LengthLimitingTextInputFormatter(panjang)];
