/// Jawaban siswa. `skor` hanya diisi server (PRD 7).
class Jawaban {
  final String pesertaId;
  final String soalId;
  final String? isi;
  final bool raguRagu;
  final DateTime? diterimaAt;

  const Jawaban({
    required this.pesertaId,
    required this.soalId,
    this.isi,
    this.raguRagu = false,
    this.diterimaAt,
  });

  Map<String, dynamic> toUpsert() => {
        'peserta_id': pesertaId,
        'soal_id': soalId,
        'isi': isi,
        'ragu_ragu': raguRagu,
      };

  factory Jawaban.fromJson(Map<String, dynamic> json) => Jawaban(
        pesertaId: json['peserta_id'] as String,
        soalId: json['soal_id'] as String,
        isi: json['isi'] as String?,
        raguRagu: json['ragu_ragu'] as bool? ?? false,
        diterimaAt: json['diterima_at'] == null
            ? null
            : DateTime.parse(json['diterima_at'] as String),
      );
}
