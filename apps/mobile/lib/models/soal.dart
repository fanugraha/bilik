/// Soal yang diterima app siswa. TIDAK berisi kunci/pedoman (PRD 7):
/// server hanya mengirim teks + opsi, penilaian di server.
class Soal {
  final String id;
  final String tipe; // 'pg' | 'benar_salah' | 'essay'
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
  bool get isBenarSalah => tipe == 'benar_salah';
  bool get isEssay => tipe == 'essay';

  factory Soal.fromJson(Map<String, dynamic> json) => Soal(
        id: json['id'] as String,
        tipe: json['tipe'] as String,
        teks: json['teks'] as String,
        opsi: (json['opsi'] as List<dynamic>? ?? []).cast<String>(),
        bobot: json['bobot'] as num? ?? 1,
      );
}

/// Jawaban yang sudah tersimpan di server (untuk melanjutkan ujian).
class JawabanTersimpan {
  final String soalId;
  final String? isi;
  final bool raguRagu;

  const JawabanTersimpan({required this.soalId, this.isi, this.raguRagu = false});

  factory JawabanTersimpan.fromJson(Map<String, dynamic> json) => JawabanTersimpan(
        soalId: json['soal_id'] as String,
        isi: json['isi'] as String?,
        raguRagu: json['ragu_ragu'] as bool? ?? false,
      );
}

/// Hasil aksi `soal`: daftar soal + jawaban tersimpan + info waktu.
class HasilSoal {
  final List<Soal> soal;
  final List<JawabanTersimpan> jawaban;
  final String statusPeserta;
  final DateTime? selesaiAt;
  final bool acakSoal;
  final bool acakOpsi;
  final String judul;

  const HasilSoal({
    required this.soal,
    required this.jawaban,
    required this.statusPeserta,
    this.selesaiAt,
    this.acakSoal = false,
    this.acakOpsi = false,
    required this.judul,
  });

  factory HasilSoal.fromJson(Map<String, dynamic> json) {
    final peserta = Map<String, dynamic>.from(json['peserta'] as Map? ?? {});
    final ujian = Map<String, dynamic>.from(json['ujian'] as Map? ?? {});
    return HasilSoal(
      soal: (json['soal'] as List<dynamic>? ?? [])
          .map((e) => Soal.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      jawaban: (json['jawaban'] as List<dynamic>? ?? [])
          .map((e) => JawabanTersimpan.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      statusPeserta: peserta['status'] as String? ?? 'mengerjakan',
      selesaiAt: peserta['selesai_at'] == null ? null : DateTime.tryParse(peserta['selesai_at'] as String),
      acakSoal: ujian['acak_soal'] as bool? ?? false,
      acakOpsi: ujian['acak_opsi'] as bool? ?? false,
      judul: ujian['judul'] as String? ?? 'Ujian',
    );
  }
}
