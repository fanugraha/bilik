import 'package:flutter/material.dart';

import '../../../core/theme.dart';

/// Strip nomor soal: warna menandai aktif / terjawab / ragu-ragu.
class NomorSoal extends StatelessWidget {
  const NomorSoal({
    super.key,
    required this.jumlah,
    required this.index,
    required this.dijawab,
    required this.ragu,
    required this.onPilih,
  });

  final int jumlah;
  final int index;
  final List<bool> dijawab;
  final List<bool> ragu;
  final ValueChanged<int> onPilih;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: jumlah,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final aktif = i == index;
          final sudahRagu = ragu[i];
          final sudahDijawab = dijawab[i];

          late final Color latar;
          late final Color batas;
          late final Color teks;
          if (aktif) {
            latar = BilikWarna.nila;
            batas = BilikWarna.nila;
            teks = Colors.white;
          } else if (sudahRagu) {
            latar = BilikWarna.kuningMuda;
            batas = BilikWarna.kuning;
            teks = BilikWarna.kuning;
          } else if (sudahDijawab) {
            latar = BilikWarna.hijauMuda;
            batas = BilikWarna.hijau;
            teks = BilikWarna.hijau;
          } else {
            latar = BilikWarna.permukaan;
            batas = BilikWarna.garisTegas;
            teks = BilikWarna.tinta2;
          }

          return InkWell(
            onTap: () => onPilih(i),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: latar,
                border: Border.all(color: batas),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('${i + 1}', style: TextStyle(fontWeight: FontWeight.w700, color: teks)),
            ),
          );
        },
      ),
    );
  }
}
