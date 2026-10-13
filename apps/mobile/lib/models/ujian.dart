/// Info ringkas ujian yang dikirim ke app siswa.
class UjianRingkas {
  final String id;
  final String judul;
  final String? mapel;
  final int durasi;

  const UjianRingkas({required this.id, required this.judul, this.mapel, required this.durasi});

  factory UjianRingkas.fromJson(Map<String, dynamic> json) => UjianRingkas(
        id: json['id'] as String,
        judul: json['judul'] as String,
        mapel: json['mapel'] as String?,
        durasi: (json['durasi'] as num?)?.toInt() ?? 0,
      );
}

/// Status ujian sisi siswa (aksi `status`).
class StatusUjian {
  final String status;
  final DateTime? mulaiAt;
  final DateTime? selesaiAt;
  final int batasPelanggaran;

  const StatusUjian({required this.status, this.mulaiAt, this.selesaiAt, this.batasPelanggaran = 3});

  factory StatusUjian.fromJson(Map<String, dynamic> json) => StatusUjian(
        status: json['status'] as String? ?? 'lobby',
        mulaiAt: json['mulai_at'] == null ? null : DateTime.tryParse(json['mulai_at'] as String),
        selesaiAt: json['selesai_at'] == null ? null : DateTime.tryParse(json['selesai_at'] as String),
        batasPelanggaran: (json['batas_pelanggaran'] as num?)?.toInt() ?? 3,
      );
}
