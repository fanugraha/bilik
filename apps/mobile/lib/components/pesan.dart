import 'package:flutter/material.dart';

import '../core/theme.dart';

enum JenisPesan { info, sukses, peringatan, error }

/// Kotak pesan (info/sukses/peringatan/error) dengan ikon, seperti `Pesan` di web.
class Pesan extends StatelessWidget {
  const Pesan(this.teks, {super.key, this.jenis = JenisPesan.info});

  final String teks;
  final JenisPesan jenis;

  ({IconData ikon, Color latar, Color teks, Color garis}) get _gaya {
    switch (jenis) {
      case JenisPesan.sukses:
        return (ikon: Icons.check_circle_outline, latar: BilikWarna.hijauMuda, teks: BilikWarna.hijau, garis: BilikWarna.hijau);
      case JenisPesan.peringatan:
        return (ikon: Icons.warning_amber_outlined, latar: BilikWarna.kuningMuda, teks: BilikWarna.kuning, garis: BilikWarna.kuning);
      case JenisPesan.error:
        return (ikon: Icons.error_outline, latar: BilikWarna.merahMuda, teks: BilikWarna.merah, garis: BilikWarna.merah);
      case JenisPesan.info:
        return (ikon: Icons.info_outline, latar: BilikWarna.biruMuda, teks: BilikWarna.biru, garis: BilikWarna.biru);
    }
  }

  @override
  Widget build(BuildContext context) {
    final g = _gaya;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: g.latar,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: g.garis.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(g.ikon, size: 18, color: g.teks),
          const SizedBox(width: 10),
          Expanded(
            child: Text(teks, style: TextStyle(fontSize: 13.5, color: g.teks, height: 1.35)),
          ),
        ],
      ),
    );
  }
}
