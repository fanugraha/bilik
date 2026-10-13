import 'package:bilik_mobile/models/join.dart';
import 'package:bilik_mobile/models/peserta.dart';
import 'package:bilik_mobile/models/sesi.dart';
import 'package:bilik_mobile/models/soal.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Peserta.fromJson', () {
    test('menerima data ringkas dari aksi pilih (tanpa ujian_id/siswa_id)', () {
      final peserta = Peserta.fromJson({'id': 'p1', 'status': 'menunggu', 'disetujui': true});
      expect(peserta.id, 'p1');
      expect(peserta.ujianId, isNull);
      expect(peserta.siswaId, isNull);
      expect(peserta.disetujui, isTrue);
    });

    test('membaca data lengkap dari aksi status', () {
      final peserta = Peserta.fromJson({
        'id': 'p2',
        'ujian_id': 'u1',
        'siswa_id': 's1',
        'status': 'mengerjakan',
        'disetujui': true,
        'jumlah_pelanggaran': 2,
        'selesai_at': '2026-10-13T01:00:00.000Z',
      });
      expect(peserta.ujianId, 'u1');
      expect(peserta.siswaId, 's1');
      expect(peserta.jumlahPelanggaran, 2);
      expect(peserta.selesaiAt, isNotNull);
    });
  });

  group('HasilPilih.fromJson', () {
    test('membaca balikan pilih dengan peserta ringkas', () {
      final hasil = HasilPilih.fromJson({
        'token_sesi': 'tok',
        'peserta': {'id': 'p1', 'status': 'menunggu', 'disetujui': false},
        'ujian': {'id': 'u1', 'judul': 'UH 1', 'durasi': 60},
        'nama': 'Budi',
      });
      expect(hasil.tokenSesi, 'tok');
      expect(hasil.peserta.id, 'p1');
      expect(hasil.nama, 'Budi');
    });
  });

  group('StatusSesi.fromJson', () {
    test('menandai ditolak', () {
      final s = StatusSesi.fromJson({'ditolak': true});
      expect(s.ditolak, isTrue);
      expect(s.peserta, isNull);
    });

    test('membaca status peserta + ujian', () {
      final s = StatusSesi.fromJson({
        'peserta': {'id': 'p1', 'ujian_id': 'u1', 'siswa_id': 's1', 'status': 'mengerjakan', 'disetujui': true},
        'ujian': {'status': 'berjalan', 'batas_pelanggaran': 3},
      });
      expect(s.ditolak, isFalse);
      expect(s.peserta!.status, 'mengerjakan');
      expect(s.ujian!.status, 'berjalan');
    });
  });

  group('JoinData.fromJson', () {
    test('membaca kelas dan siswa dengan flag terpakai', () {
      final data = JoinData.fromJson({
        'ujian': {'id': 'u1', 'judul': 'UH', 'mapel': 'MTK', 'durasi': 60},
        'kelas': [
          {
            'id': 'k1',
            'nama': '8A',
            'siswa': [
              {'id': 's1', 'nama': 'Ana', 'no_absen': 1, 'terpakai': false},
              {'id': 's2', 'nama': 'Budi', 'no_absen': 2, 'terpakai': true},
            ],
          },
        ],
      });
      expect(data.ujian.judul, 'UH');
      expect(data.kelas.single.siswa.length, 2);
      expect(data.kelas.single.siswa[1].terpakai, isTrue);
    });
  });

  group('Soal', () {
    test('membaca tipe dan opsi', () {
      final soal = Soal.fromJson({'id': 'q1', 'tipe': 'pg', 'teks': 'Hai', 'opsi': ['A', 'B'], 'bobot': 2});
      expect(soal.isPg, isTrue);
      expect(soal.isEssay, isFalse);
      expect(soal.opsi, ['A', 'B']);
      expect(soal.bobot, 2);
    });
  });

  group('HasilSoal.fromJson', () {
    test('memetakan soal & jawaban tersimpan', () {
      final hasil = HasilSoal.fromJson({
        'soal': [
          {'id': 'q1', 'tipe': 'essay', 'teks': 'Jelaskan', 'opsi': [], 'bobot': 5},
        ],
        'jawaban': [
          {'soal_id': 'q1', 'isi': 'karena', 'ragu_ragu': true},
        ],
        'peserta': {'status': 'mengerjakan', 'selesai_at': '2026-10-13T01:00:00.000Z'},
        'ujian': {'judul': 'UH', 'acak_soal': false, 'acak_opsi': true},
      });
      expect(hasil.soal.single.isEssay, isTrue);
      expect(hasil.jawaban.single.raguRagu, isTrue);
      expect(hasil.acakOpsi, isTrue);
      expect(hasil.selesaiAt, isNotNull);
    });
  });
}
