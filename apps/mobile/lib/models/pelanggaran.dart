/// Pelanggaran dikirim ke server saat kejadian (PRD 6).
/// Jenis: pinning_lepas | pindah_app | screenshot | screen_record | multi_window | heartbeat_hilang
class Pelanggaran {
  final String pesertaId;
  final String jenis;
  final String? keterangan;

  const Pelanggaran({
    required this.pesertaId,
    required this.jenis,
    this.keterangan,
  });

  Map<String, dynamic> toInsert() => {
        'peserta_id': pesertaId,
        'jenis': jenis,
        'keterangan': keterangan,
      };
}
