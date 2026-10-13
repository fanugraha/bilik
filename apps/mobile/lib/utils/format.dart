/// Format durasi untuk timer ujian: "MM:SS", atau "H:MM:SS" bila >= 1 jam.
String formatDurasi(Duration d) {
  final total = d.isNegative ? Duration.zero : d;
  final menit = total.inMinutes.remainder(60).toString().padLeft(2, '0');
  final detik = total.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (total.inHours > 0) return '${total.inHours}:$menit:$detik';
  return '$menit:$detik';
}
