import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Merek "Bilik" (logo kotak + nama). Terang = untuk latar gelap/gradien.
class MerekBilik extends StatelessWidget {
  const MerekBilik({super.key, this.terang = false, this.ukuranNama = 20});

  final bool terang;
  final double ukuranNama;

  @override
  Widget build(BuildContext context) {
    final warnaTeks = terang ? Colors.white : BilikWarna.tinta;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: terang ? Colors.white.withValues(alpha: 0.16) : BilikWarna.papan,
            borderRadius: BorderRadius.circular(9),
          ),
          child: const Text('B', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
        ),
        const SizedBox(width: 10),
        Text('Bilik', style: TextStyle(fontSize: ukuranNama, fontWeight: FontWeight.w800, color: warnaTeks, letterSpacing: -0.5)),
      ],
    );
  }
}

/// Header gradien penuh dengan hiasan lingkaran + ikon besar. Sudut bawah membulat.
class HeaderGradient extends StatelessWidget {
  const HeaderGradient({
    super.key,
    required this.child,
    this.gradien = const [BilikWarna.papan, BilikWarna.nila],
    this.ikon,
    this.tinggiMinimum = 0,
  });

  final Widget child;
  final List<Color> gradien;
  final IconData? ikon;
  final double tinggiMinimum;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: gradien, begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Stack(
          children: [
            Positioned(top: -50, right: -30, child: _bulat(150, Colors.white.withValues(alpha: 0.06))),
            Positioned(top: 70, right: 46, child: _bulat(16, Colors.white.withValues(alpha: 0.10))),
            Positioned(bottom: -40, left: -30, child: _bulat(120, Colors.white.withValues(alpha: 0.05))),
            if (ikon != null)
              Positioned(
                right: -10,
                bottom: -14,
                child: Icon(ikon, size: 140, color: Colors.white.withValues(alpha: 0.08)),
              ),
            SafeArea(
              bottom: false,
              child: Container(
                width: double.infinity,
                constraints: BoxConstraints(minHeight: tinggiMinimum),
                padding: const EdgeInsets.fromLTRB(24, 18, 24, 26),
                child: child,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bulat(double d, Color c) =>
      Container(width: d, height: d, decoration: BoxDecoration(shape: BoxShape.circle, color: c));
}

/// Latar gradien penuh layar (untuk lobby/terkunci/tanda terima).
class LatarPenuh extends StatelessWidget {
  const LatarPenuh({super.key, required this.child, this.gradien = const [BilikWarna.papan, BilikWarna.nila]});

  final Widget child;
  final List<Color> gradien;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(gradient: LinearGradient(colors: gradien, begin: Alignment.topLeft, end: Alignment.bottomRight)),
      child: Stack(
        children: [
          Positioned(top: -60, right: -40, child: Container(width: 180, height: 180, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.06)))),
          Positioned(bottom: -50, left: -40, child: Container(width: 160, height: 160, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.05)))),
          SafeArea(child: child),
        ],
      ),
    );
  }
}

/// Ikon besar dalam lingkaran kaca — aksen visual per layar.
class IkonLingkaran extends StatelessWidget {
  const IkonLingkaran({super.key, required this.ikon, this.ukuran = 92, this.warna = Colors.white, this.latar = 0.16});

  final IconData ikon;
  final double ukuran;
  final Color warna;
  final double latar;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: ukuran,
      height: ukuran,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: warna.withValues(alpha: latar),
        border: Border.all(color: warna.withValues(alpha: 0.25), width: 1.5),
      ),
      child: Icon(ikon, size: ukuran * 0.5, color: warna),
    );
  }
}
