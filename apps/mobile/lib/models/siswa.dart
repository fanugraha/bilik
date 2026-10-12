class Siswa {
  final String id;
  final String kelasId;
  final String nama;
  final int? noAbsen;

  const Siswa({
    required this.id,
    required this.kelasId,
    required this.nama,
    this.noAbsen,
  });

  factory Siswa.fromJson(Map<String, dynamic> json) => Siswa(
        id: json['id'] as String,
        kelasId: json['kelas_id'] as String,
        nama: json['nama'] as String,
        noAbsen: json['no_absen'] as int?,
      );
}
