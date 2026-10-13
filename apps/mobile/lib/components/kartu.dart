import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Panel standar Bilik: latar putih, border tipis, radius 12, tanpa bayangan.
class Kartu extends StatelessWidget {
  const Kartu({super.key, required this.child, this.judul, this.deskripsi, this.padding = const EdgeInsets.all(20)});

  final Widget child;
  final String? judul;
  final String? deskripsi;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: BilikWarna.permukaan,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: BilikWarna.garis),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (judul != null || deskripsi != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: BilikWarna.garis)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (judul != null)
                    Text(judul!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: BilikWarna.tinta)),
                  if (deskripsi != null) ...[
                    if (judul != null) const SizedBox(height: 2),
                    Text(deskripsi!, style: const TextStyle(fontSize: 13, color: BilikWarna.tinta2)),
                  ],
                ],
              ),
            ),
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}
