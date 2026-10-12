class Kelas {
  final String id;
  final String nama;

  const Kelas({required this.id, required this.nama});

  factory Kelas.fromJson(Map<String, dynamic> json) =>
      Kelas(id: json['id'] as String, nama: json['nama'] as String);
}
