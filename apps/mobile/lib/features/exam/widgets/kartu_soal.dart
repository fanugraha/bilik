import 'package:flutter/material.dart';

import '../../../components/kartu.dart';
import '../../../components/lencana.dart';
import '../../../core/theme.dart';
import '../../../models/soal.dart';

/// Kartu soal + pilihan jawaban (PG / Benar-Salah / Essay).
class KartuSoal extends StatelessWidget {
  const KartuSoal({
    super.key,
    required this.soal,
    required this.isi,
    required this.urutanOpsi,
    required this.controller,
    required this.hurufOpsi,
    required this.onJawab,
    required this.onPilihOpsi,
  });

  final Soal soal;
  final String? isi;
  final List<int> urutanOpsi;
  final TextEditingController? controller;
  final String Function(int indeks) hurufOpsi;
  final ValueChanged<String?> onJawab;
  final ValueChanged<String> onPilihOpsi;

  @override
  Widget build(BuildContext context) {
    return Kartu(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _lencanaTipe(soal.tipe),
              const Spacer(),
              Text('Bobot ${soal.bobot}', style: const TextStyle(fontSize: 12, color: BilikWarna.tinta2)),
            ],
          ),
          const SizedBox(height: 14),
          Text(soal.teks, style: const TextStyle(fontSize: 16, height: 1.5)),
          const SizedBox(height: 18),
          _jawaban(),
        ],
      ),
    );
  }

  Widget _lencanaTipe(String tipe) {
    switch (tipe) {
      case 'pg':
        return const Lencana('Pilihan ganda', nada: NadaLencana.nila);
      case 'benar_salah':
        return const Lencana('Benar / Salah', nada: NadaLencana.hijau);
      default:
        return const Lencana('Essay', nada: NadaLencana.kuning);
    }
  }

  Widget _jawaban() {
    if (soal.isPg) {
      // Label tetap A, B, C, ... berurutan; yang diacak hanya isi pilihannya.
      // urutanOpsi[posisi] = indeks asli opsi yang tampil di baris posisi.
      return Column(
        children: [
          for (var posisi = 0; posisi < urutanOpsi.length; posisi++)
            _opsiTile(
              huruf: hurufOpsi(posisi),
              teks: soal.opsi[urutanOpsi[posisi]],
              dipilih: isi == hurufOpsi(urutanOpsi[posisi]),
              nilai: hurufOpsi(urutanOpsi[posisi]),
            ),
        ],
      );
    }
    if (soal.isBenarSalah) {
      return Column(
        children: [
          _opsiTile(huruf: 'B', teks: 'Benar', dipilih: isi == 'benar', nilai: 'benar'),
          _opsiTile(huruf: 'S', teks: 'Salah', dipilih: isi == 'salah', nilai: 'salah'),
        ],
      );
    }
    return TextField(
      controller: controller,
      maxLines: 8,
      minLines: 5,
      decoration: const InputDecoration(hintText: 'Tulis jawaban Anda', alignLabelWithHint: true),
      onChanged: onJawab,
    );
  }

  Widget _opsiTile({
    required String huruf,
    required String teks,
    required bool dipilih,
    String? nilai,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => onPilihOpsi(nilai ?? huruf),
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: dipilih ? BilikWarna.nilaMuda : BilikWarna.permukaan,
            border: Border.all(color: dipilih ? BilikWarna.nila : BilikWarna.garisTegas, width: dipilih ? 1.5 : 1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: dipilih ? BilikWarna.nila : BilikWarna.kertas,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  huruf,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: dipilih ? Colors.white : BilikWarna.tinta2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(teks, style: const TextStyle(fontSize: 15))),
            ],
          ),
        ),
      ),
    );
  }
}
