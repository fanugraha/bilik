import 'ujian.dart';

/// Data alur masuk siswa: kode ujian -> kelas -> nama.

class SiswaRingkas {
  final String id;
  final String nama;
  final int? noAbsen;
  final bool terpakai;

  const SiswaRingkas({required this.id, required this.nama, this.noAbsen, this.terpakai = false});

  factory SiswaRingkas.fromJson(Map<String, dynamic> json) => SiswaRingkas(
        id: json['id'] as String,
        nama: json['nama'] as String,
        noAbsen: (json['no_absen'] as num?)?.toInt(),
        terpakai: json['terpakai'] as bool? ?? false,
      );
}

class KelasJoin {
  final String id;
  final String nama;
  final List<SiswaRingkas> siswa;

  const KelasJoin({required this.id, required this.nama, required this.siswa});

  factory KelasJoin.fromJson(Map<String, dynamic> json) => KelasJoin(
        id: json['id'] as String,
        nama: json['nama'] as String,
        siswa: (json['siswa'] as List<dynamic>? ?? [])
            .map((e) => SiswaRingkas.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}

class JoinData {
  final UjianRingkas ujian;
  final List<KelasJoin> kelas;

  const JoinData({required this.ujian, required this.kelas});

  factory JoinData.fromJson(Map<String, dynamic> json) => JoinData(
        ujian: UjianRingkas.fromJson(Map<String, dynamic>.from(json['ujian'] as Map)),
        kelas: (json['kelas'] as List<dynamic>? ?? [])
            .map((e) => KelasJoin.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}

/// Pilihan sementara antara layar join dan cek perangkat.
class JoinDraft {
  final String kode;
  final String kelasId;
  final String kelasNama;
  final String siswaId;
  final String siswaNama;

  const JoinDraft({
    required this.kode,
    required this.kelasId,
    required this.kelasNama,
    required this.siswaId,
    required this.siswaNama,
  });
}
