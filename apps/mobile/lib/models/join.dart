import 'peserta.dart';

/// Hasil aksi `join`: info ujian + daftar kelas beserta namanya.
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

/// Hasil aksi `pilih`: token sesi + data peserta.
class HasilPilih {
  final String tokenSesi;
  final Peserta peserta;
  final String? nama;

  const HasilPilih({required this.tokenSesi, required this.peserta, this.nama});

  factory HasilPilih.fromJson(Map<String, dynamic> json) => HasilPilih(
        tokenSesi: json['token_sesi'] as String,
        peserta: Peserta.fromJson(Map<String, dynamic>.from(json['peserta'] as Map)),
        nama: json['nama'] as String?,
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

/// Hasil aksi `status`. `ditolak` true bila baris peserta sudah dihapus guru.
class StatusSesi {
  final bool ditolak;
  final Peserta? peserta;
  final StatusUjian? ujian;

  const StatusSesi({this.ditolak = false, this.peserta, this.ujian});

  factory StatusSesi.fromJson(Map<String, dynamic> json) {
    if (json['ditolak'] == true) return const StatusSesi(ditolak: true);
    return StatusSesi(
      peserta: json['peserta'] == null ? null : Peserta.fromJson(Map<String, dynamic>.from(json['peserta'] as Map)),
      ujian: json['ujian'] == null ? null : StatusUjian.fromJson(Map<String, dynamic>.from(json['ujian'] as Map)),
    );
  }
}
