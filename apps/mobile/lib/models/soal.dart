/// Soal yang diterima app siswa. TIDAK berisi kunci/pedoman (PRD 7):
/// server hanya mengirim teks + opsi, penilaian di server.
class Soal {
  final String id;
  final String tipe; // 'pg' | 'benar_salah' | 'angket' | 'essay'
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
  bool get isAngket => tipe == 'angket';
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
  final String? alasan;
  final bool raguRagu;

  const JawabanTersimpan({required this.soalId, this.isi, this.alasan, this.raguRagu = false});

  factory JawabanTersimpan.fromJson(Map<String, dynamic> json) => JawabanTersimpan(
        soalId: json['soal_id'] as String,
        isi: json['isi'] as String?,
        alasan: json['alasan'] as String?,
        raguRagu: json['ragu_ragu'] as bool? ?? false,
      );
}

/// Bagian ujian: satu tipe soal, punya urutan, bisa diberi judul.
class Section {
  final String id;
  final int urutan;
  final String? judul;
  final String tipe;
  final List<Soal> soal;

  const Section({required this.id, required this.urutan, this.judul, required this.tipe, required this.soal});

  factory Section.fromJson(Map<String, dynamic> json) => Section(
        id: json['id'] as String? ?? '',
        urutan: (json['urutan'] as num?)?.toInt() ?? 0,
        judul: json['judul'] as String?,
        tipe: json['tipe'] as String? ?? '',
        soal: (json['soal'] as List<dynamic>? ?? [])
            .map((e) => Soal.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}

/// Hasil aksi `soal`: daftar bagian + jawaban tersimpan + info waktu.
class HasilSoal {
  final List<Section> sections;
  final List<JawabanTersimpan> jawaban;
  final String statusPeserta;
  final DateTime? selesaiAt;
  final bool acakSoal;
  final bool acakOpsi;
  final String judul;

  const HasilSoal({
    required this.sections,
    required this.jawaban,
    required this.statusPeserta,
    this.selesaiAt,
    this.acakSoal = false,
    this.acakOpsi = false,
    required this.judul,
  });

  /// Semua soal lintas bagian (dipakai untuk hitung progres).
  List<Soal> get soal => [for (final s in sections) ...s.soal];

  factory HasilSoal.fromJson(Map<String, dynamic> json) {
    final peserta = Map<String, dynamic>.from(json['peserta'] as Map? ?? {});
    final ujian = Map<String, dynamic>.from(json['ujian'] as Map? ?? {});

    // Utamakan `sections`; kalau tidak ada (server lama), bungkus `soal` jadi satu bagian.
    List<Section> sections;
    if (json['sections'] is List) {
      sections = (json['sections'] as List<dynamic>)
          .map((e) => Section.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } else {
      final soal = (json['soal'] as List<dynamic>? ?? [])
          .map((e) => Soal.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      sections = [Section(id: 'all', urutan: 1, tipe: '', soal: soal)];
    }

    return HasilSoal(
      sections: sections,
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
