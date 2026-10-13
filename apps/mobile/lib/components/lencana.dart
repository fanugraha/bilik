import 'package:flutter/material.dart';

import '../core/theme.dart';

enum NadaLencana { abu, biru, hijau, kuning, merah, ungu, nila }

({Color latar, Color teks}) _warna(NadaLencana nada) {
  switch (nada) {
    case NadaLencana.biru:
      return (latar: BilikWarna.biruMuda, teks: BilikWarna.biru);
    case NadaLencana.hijau:
      return (latar: BilikWarna.hijauMuda, teks: BilikWarna.hijau);
    case NadaLencana.kuning:
      return (latar: BilikWarna.kuningMuda, teks: BilikWarna.kuning);
    case NadaLencana.merah:
      return (latar: BilikWarna.merahMuda, teks: BilikWarna.merah);
    case NadaLencana.ungu:
      return (latar: BilikWarna.unguMuda, teks: BilikWarna.ungu);
    case NadaLencana.nila:
      return (latar: BilikWarna.nilaMuda, teks: BilikWarna.nila);
    case NadaLencana.abu:
      return (latar: BilikWarna.kertas, teks: BilikWarna.tinta2);
  }
}

/// Label status/tipe, sama bahasa warna dengan dashboard guru.
class Lencana extends StatelessWidget {
  const Lencana(this.teks, {super.key, this.nada = NadaLencana.abu, this.titik = false});

  final String teks;
  final NadaLencana nada;
  final bool titik;

  @override
  Widget build(BuildContext context) {
    final w = _warna(nada);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: w.latar, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (titik) ...[
            Container(width: 6, height: 6, decoration: BoxDecoration(color: w.teks, shape: BoxShape.circle)),
            const SizedBox(width: 6),
          ],
          Text(teks, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: w.teks)),
        ],
      ),
    );
  }
}

/// Lencana status peserta/ujian dengan pemetaan nada yang konsisten.
class LencanaStatus extends StatelessWidget {
  const LencanaStatus(this.status, {super.key});

  final String status;

  static const _peta = {
    'menunggu': (teks: 'Menunggu', nada: NadaLencana.biru),
    'lobby': (teks: 'Lobby dibuka', nada: NadaLencana.biru),
    'mengerjakan': (teks: 'Mengerjakan', nada: NadaLencana.hijau),
    'berjalan': (teks: 'Berjalan', nada: NadaLencana.hijau),
    'terkunci': (teks: 'Terkunci', nada: NadaLencana.merah),
    'selesai': (teks: 'Selesai', nada: NadaLencana.kuning),
    'dinilai': (teks: 'Dinilai', nada: NadaLencana.ungu),
  };

  @override
  Widget build(BuildContext context) {
    final gaya = _peta[status] ?? (teks: status, nada: NadaLencana.abu);
    return Lencana(gaya.teks, nada: gaya.nada, titik: status == 'berjalan' || status == 'lobby');
  }
}
