import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Penunjuk langkah: Kode -> Nama -> Lobby. Membantu murid tahu posisinya.
class LangkahUjian extends StatelessWidget {
  const LangkahUjian({super.key, required this.aktif, this.terang = false});

  final int aktif; // 1..3
  final bool terang;

  static const _label = ['Kode', 'Nama', 'Lobby'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < _label.length; i++) ...[
          _titik(i + 1),
          if (i < _label.length - 1) const SizedBox(width: 6),
        ],
      ],
    );
  }

  Widget _titik(int nomor) {
    final selesai = nomor < aktif;
    final sedang = nomor == aktif;
    final Color isi;
    final Color teks;
    final Color garis;
    if (terang) {
      isi = sedang ? Colors.white : (selesai ? Colors.white.withValues(alpha: 0.25) : Colors.white.withValues(alpha: 0.12));
      teks = sedang ? BilikWarna.nila : Colors.white.withValues(alpha: 0.85);
      garis = Colors.white.withValues(alpha: 0.22);
    } else {
      isi = sedang ? BilikWarna.nila : (selesai ? BilikWarna.nilaMuda : BilikWarna.kertas);
      teks = sedang ? Colors.white : (selesai ? BilikWarna.nila : BilikWarna.tinta3);
      garis = BilikWarna.garis;
    }
    return Row(
      children: [
        Container(
          width: 26,
          height: 26,
          alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, color: isi, border: Border.all(color: garis)),
          child: selesai
              ? Icon(Icons.check, size: 14, color: terang ? Colors.white : BilikWarna.nila)
              : Text('$nomor', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: teks)),
        ),
        const SizedBox(width: 6),
        Text(
          _label[nomor - 1],
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: sedang ? FontWeight.w700 : FontWeight.w500,
            color: terang ? Colors.white : (sedang ? BilikWarna.tinta : BilikWarna.tinta3),
          ),
        ),
      ],
    );
  }
}
