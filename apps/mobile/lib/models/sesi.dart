import 'peserta.dart';
import 'ujian.dart';

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
