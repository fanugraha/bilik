import 'package:flutter/material.dart';

import '../../../core/theme.dart';

/// Bilah tipis: status simpan/offline.
class BilahStatusUjian extends StatelessWidget {
  const BilahStatusUjian({super.key, required this.offline, required this.menyimpan});

  final bool offline;
  final bool menyimpan;

  @override
  Widget build(BuildContext context) {
    final IconData ikon;
    final String teks;
    final Color warna;
    if (offline) {
      ikon = Icons.cloud_off;
      teks = 'Offline, jawaban tersimpan di perangkat';
      warna = BilikWarna.kuning;
    } else if (menyimpan) {
      ikon = Icons.sync;
      teks = 'Menyimpan…';
      warna = BilikWarna.tinta2;
    } else {
      ikon = Icons.cloud_done;
      teks = 'Tersimpan';
      warna = BilikWarna.hijau;
    }
    return Container(
      width: double.infinity,
      color: BilikWarna.permukaan,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          Icon(ikon, size: 14, color: warna),
          const SizedBox(width: 6),
          Text(teks, style: TextStyle(fontSize: 12, color: warna, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
