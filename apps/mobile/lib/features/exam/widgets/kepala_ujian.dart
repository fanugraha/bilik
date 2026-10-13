import 'package:flutter/material.dart';

import '../../../core/theme.dart';
import '../../../utils/format.dart';

/// Header gradien ujian: nomor soal, pil timer, dan bilah kemajuan.
class KepalaUjian extends StatelessWidget {
  const KepalaUjian({
    super.key,
    required this.nomorSoal,
    required this.total,
    required this.sisa,
    required this.terjawab,
  });

  final int nomorSoal;
  final int total;
  final Duration sisa;
  final int terjawab;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(22)),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [BilikWarna.papan, BilikWarna.nila],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(Icons.description_outlined, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Soal $nomorSoal dari $total',
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const Spacer(),
                    _PilTimer(sisa: sisa),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: total == 0 ? 0 : terjawab / total,
                    minHeight: 6,
                    backgroundColor: Colors.white.withValues(alpha: 0.24),
                    valueColor: const AlwaysStoppedAnimation(Colors.white),
                  ),
                ),
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '$terjawab dari $total soal terjawab',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11.5),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PilTimer extends StatelessWidget {
  const _PilTimer({required this.sisa});

  final Duration sisa;

  @override
  Widget build(BuildContext context) {
    final rendah = sisa.inSeconds <= 60;
    final warna = rendah ? BilikWarna.merah : Colors.white;
    final latar = rendah ? Colors.white : Colors.white.withValues(alpha: 0.18);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: latar, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.timer_outlined, size: 16, color: warna),
          const SizedBox(width: 6),
          Text(
            formatDurasi(sisa),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: warna,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
