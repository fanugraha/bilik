/// Soal yang diterima app siswa. TIDAK berisi kunci/pedoman (PRD 7):
/// server hanya mengirim teks + opsi, penilaian di server.
class Soal {
  final String id;
  final String tipe; // 'pg' | 'essay'
  final String teks;
  final List<String> opsi;
  final num bobot;

  const Soal({
    required this.id,
    required this.tipe,
    required this.teks,
    required this.opsi,
    required this.bobot,
  });

  bool get isPg => tipe == 'pg';

  factory Soal.fromJson(Map<String, dynamic> json) => Soal(
        id: json['id'] as String,
        tipe: json['tipe'] as String,
        teks: json['teks'] as String,
        opsi: (json['opsi'] as List<dynamic>? ?? []).cast<String>(),
        bobot: json['bobot'] as num? ?? 1,
      );
}
