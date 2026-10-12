/// Peserta = satu siswa dalam satu ujian (PRD tabel `peserta`).
/// status: menunggu | mengerjakan | terkunci | selesai
class Peserta {
  final String id;
  final String ujianId;
  final String siswaId;
  final String? deviceId;
  final String? tokenSesi;
  final String status;
  final bool disetujui;
  final int jumlahPelanggaran;
  final int tambahanWaktu; // detik

  const Peserta({
    required this.id,
    required this.ujianId,
    required this.siswaId,
    this.deviceId,
    this.tokenSesi,
    this.status = 'menunggu',
    this.disetujui = false,
    this.jumlahPelanggaran = 0,
    this.tambahanWaktu = 0,
  });

  factory Peserta.fromJson(Map<String, dynamic> json) => Peserta(
        id: json['id'] as String,
        ujianId: json['ujian_id'] as String,
        siswaId: json['siswa_id'] as String,
        deviceId: json['device_id'] as String?,
        tokenSesi: json['token_sesi'] as String?,
        status: json['status'] as String? ?? 'menunggu',
        disetujui: json['disetujui'] as bool? ?? false,
        jumlahPelanggaran: json['jumlah_pelanggaran'] as int? ?? 0,
        tambahanWaktu: json['tambahan_waktu'] as int? ?? 0,
      );
}
