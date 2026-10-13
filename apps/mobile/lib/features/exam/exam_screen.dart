import 'dart:async';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/pesan.dart';
import '../../core/theme.dart';
import '../../models/jawaban.dart';
import '../../models/soal.dart';
import '../../platform/exam_guard.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/sesi_aktif.dart';
import '../../services/session_store.dart';
import 'widgets/bilah_status_ujian.dart';
import 'widgets/kartu_soal.dart';
import 'widgets/kepala_ujian.dart';
import 'widgets/navigasi_ujian.dart';
import 'widgets/nomor_soal.dart';

/// Langkah 4: pengerjaan ujian (PRD 5.2).
/// Satu soal per layar, dikelompokkan per bagian. Siswa hanya bisa maju ke
/// bagian berikutnya, tidak bisa kembali ke bagian sebelumnya.
class ExamScreen extends ConsumerStatefulWidget {
  const ExamScreen({super.key});

  @override
  ConsumerState<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends ConsumerState<ExamScreen> {
  static const _huruf = ['A', 'B', 'C', 'D', 'E'];

  final _isi = <String, String?>{};
  final _alasan = <String, String?>{};
  final _ragu = <String, bool>{};
  final _urutanOpsi = <String, List<int>>{};
  final _ctrl = <String, TextEditingController>{};
  final _ctrlAlasan = <String, TextEditingController>{};

  List<Section> _sections = [];
  int _sectionIndex = 0;
  int _index = 0;
  String? _token;
  String? _pesertaId;
  DateTime? _deadline;
  Duration _sisa = Duration.zero;
  Timer? _tick;
  Timer? _detak;
  StreamSubscription<List<ConnectivityResult>>? _netSub;
  StreamSubscription<ViolationType>? _violSub;
  bool _offline = false;
  bool _memuat = true;
  bool _menyimpan = false;
  bool _mengirim = false;
  bool _selesai = false;
  bool _kunciDilepas = false;
  // Disimpan saat initState agar tetap bisa dipakai di dispose (ref tidak aman setelah unmount).
  late final ExamGuard _guard;
  String? _error;

  Section get _section => _sections[_sectionIndex];
  List<Soal> get _soalKini => _section.soal;
  int get _totalSoal => _sections.fold(0, (a, s) => a + s.soal.length);
  int get _nomorGlobal => _sections.take(_sectionIndex).fold(0, (a, s) => a + s.soal.length) + _index + 1;
  bool get _adaBagianBerikut => _sectionIndex < _sections.length - 1;

  @override
  void initState() {
    super.initState();
    _guard = ref.read(examGuardProvider);
    _netSub = Connectivity().onConnectivityChanged.listen((hasil) {
      if (mounted) {
        setState(() => _offline = hasil.contains(ConnectivityResult.none));
      }
    });
    _muat();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => _detik());
    _detak = Timer.periodic(const Duration(seconds: 10), (_) => _heartbeat());
  }

  @override
  void dispose() {
    _tick?.cancel();
    _detak?.cancel();
    _netSub?.cancel();
    _violSub?.cancel();
    // Jaring pengaman: layar ujian ditutup lewat jalur apa pun, perangkat jangan tetap terkunci.
    if (!_kunciDilepas) {
      _guard.setActive(false).then((_) => _guard.unlock()).catchError((_) {});
    }
    for (final c in _ctrl.values) {
      c.dispose();
    }
    for (final c in _ctrlAlasan.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _muat() async {
    final token = await ambilTokenSesi(ref);
    if (token == null || token.isEmpty) {
      if (mounted) context.go('/join');
      return;
    }
    _token = token;
    _pesertaId = (await SessionStore.getSession())['pesertaId'];

    try {
      final hasil = await ApiSiswa.soal(token);
      final acak = Random(token.hashCode);
      final sections = <Section>[];
      for (final sec in hasil.sections) {
        final list = List<Soal>.from(sec.soal);
        if (hasil.acakSoal) list.shuffle(acak);
        for (final s in list) {
          final indeks = List<int>.generate(s.opsi.length, (i) => i);
          if (hasil.acakOpsi) {
            indeks.shuffle(Random(token.hashCode ^ s.id.hashCode));
          }
          _urutanOpsi[s.id] = indeks;
          if (s.isEssay) _ctrl[s.id] = TextEditingController();
          if (s.isBenarSalah) _ctrlAlasan[s.id] = TextEditingController();
        }
        sections.add(Section(id: sec.id, urutan: sec.urutan, judul: sec.judul, tipe: sec.tipe, soal: list));
      }
      for (final j in hasil.jawaban) {
        _isi[j.soalId] = j.isi;
        _alasan[j.soalId] = j.alasan;
        _ragu[j.soalId] = j.raguRagu;
        _ctrl[j.soalId]?.text = j.isi ?? '';
        _ctrlAlasan[j.soalId]?.text = j.alasan ?? '';
      }
      _deadline = hasil.selesaiAt ?? DateTime.now().add(const Duration(minutes: 60));

      if (!mounted) return;
      setState(() {
        _sections = sections.where((s) => s.soal.isNotEmpty).toList();
        _memuat = false;
      });
      ref.read(autosaveServiceProvider).start(token: token);
      await _kunciDanPantau();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.pesan;
        _memuat = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal memuat soal. Periksa sambungan lalu coba lagi.';
        _memuat = false;
      });
    }
  }

  void _detik() {
    if (_deadline != null) {
      final sisa = _deadline!.difference(DateTime.now());
      if (mounted) {
        setState(() => _sisa = sisa.isNegative ? Duration.zero : sisa);
      }
      if (sisa.isNegative && !_selesai && !_mengirim) {
        _kumpulkan(paksa: true);
      }
    }
    if (_menyimpan && ref.read(autosaveServiceProvider).pendingCount == 0 && mounted) {
      setState(() => _menyimpan = false);
    }
  }

  // Akhiri pengawasan: hentikan autosave & pelaporan, lalu lepas screen pinning / Guided Access.
  // Wajib dipanggil di setiap jalan keluar dari ujian, kalau tidak HP siswa tetap terkunci.
  Future<void> _lepasKunci() async {
    _tick?.cancel();
    _detak?.cancel();
    await _violSub?.cancel();
    ref.read(autosaveServiceProvider).stop();
    try {
      await _guard.setActive(false);
      await _guard.unlock();
      _kunciDilepas = true;
    } catch (_) {}
  }

  Future<void> _kunciDanPantau() async {
    final guard = ref.read(examGuardProvider);
    try {
      await guard.setActive(true);
      await guard.lock();
    } catch (_) {}
    await _violSub?.cancel();
    _violSub = guard.violations.listen(_pelanggaran);
  }

  String _jenisPelanggaran(ViolationType t) {
    switch (t) {
      case ViolationType.pinningReleased:
        return 'pinning_lepas';
      case ViolationType.appSwitch:
        return 'pindah_app';
      case ViolationType.screenshot:
        return 'screenshot';
      case ViolationType.screenRecording:
        return 'screen_record';
      case ViolationType.multiWindow:
        return 'multi_window';
      case ViolationType.unknown:
        return 'lain';
    }
  }

  Future<void> _pelanggaran(ViolationType t) async {
    if (_selesai || _token == null || _mengirim) return;
    try {
      final hasil = await ApiSiswa.lapor(token: _token!, jenis: _jenisPelanggaran(t));
      if (hasil.terkunci && mounted && !_mengirim) {
        await _lepasKunci();
        if (!mounted) return;
        context.go('/locked');
      }
    } catch (_) {}
  }

  // Detak tiap 10 dtk: menangkap kunci dari guru & perubahan tambahan waktu.
  Future<void> _heartbeat() async {
    if (_selesai || _token == null || _mengirim) return;
    try {
      final s = await ApiSiswa.status(_token!);
      if (!mounted || s.ditolak) return;
      final st = s.peserta?.status;
      if (st == 'terkunci') {
        // Hentikan penguncian saat masuk layar terkunci agar tak mencatat pelanggaran palsu.
        await _lepasKunci();
        if (!mounted) return;
        context.go('/locked');
        return;
      }
      if (st == 'selesai') {
        // Ujian diakhiri guru: sebelumnya kunci tidak dilepas di sini sehingga HP tetap ter-pin.
        _selesai = true;
        await _lepasKunci();
        if (!mounted) return;
        context.go('/receipt');
        return;
      }
      final batasBaru = s.peserta?.selesaiAt;
      if (batasBaru != null) _deadline = batasBaru;
    } catch (_) {}
  }

  String _hurufOpsi(int indeks) => indeks < _huruf.length ? _huruf[indeks] : '${indeks + 1}';

  void _simpanJawaban(Soal soal, String? isi) {
    if (_pesertaId == null) return;
    ref.read(autosaveServiceProvider).record(
          Jawaban(
            pesertaId: _pesertaId!,
            soalId: soal.id,
            isi: isi,
            alasan: _alasan[soal.id],
            raguRagu: _ragu[soal.id] ?? false,
          ),
        );
  }

  void _jawab(Soal soal, String? isi) {
    setState(() {
      _isi[soal.id] = isi;
      _menyimpan = true;
    });
    _simpanJawaban(soal, isi);
  }

  void _jawabAlasan(Soal soal, String? teks) {
    setState(() {
      _alasan[soal.id] = teks;
      _menyimpan = true;
    });
    _simpanJawaban(soal, _isi[soal.id]);
  }

  void _toggleRagu(Soal soal) {
    final baru = !(_ragu[soal.id] ?? false);
    setState(() {
      _ragu[soal.id] = baru;
      _menyimpan = true;
    });
    _simpanJawaban(soal, _isi[soal.id]);
  }

  void _pilihOpsi(String nilai) {
    final soal = _soalKini[_index];
    _jawab(soal, _isi[soal.id] == nilai ? null : nilai);
  }

  // Soal Benar/Salah yang sudah dipilih tapi belum diberi alasan.
  int _benarSalahTanpaAlasan(List<Soal> soal) => soal
      .where((s) => s.isBenarSalah && (_isi[s.id] ?? '').isNotEmpty && (_alasan[s.id] ?? '').trim().isEmpty)
      .length;

  Future<void> _lanjutBagian() async {
    final kurang = _benarSalahTanpaAlasan(_soalKini);
    if (kurang > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lengkapi alasan pada $kurang soal Benar/Salah sebelum lanjut.')),
      );
      return;
    }
    final ya = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Lanjut ke bagian berikutnya?'),
        content: const Text('Bagian sebelumnya tidak bisa dibuka lagi setelah lanjut.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Lanjut')),
        ],
      ),
    );
    if (ya != true || !mounted) return;
    setState(() {
      _sectionIndex++;
      _index = 0;
    });
  }

  Future<void> _kumpulkan({bool paksa = false}) async {
    if (!paksa) {
      final kurang = _benarSalahTanpaAlasan(_sections.expand((s) => s.soal).toList());
      if (kurang > 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lengkapi alasan pada $kurang soal Benar/Salah sebelum mengumpulkan.')),
        );
        return;
      }
      final ya = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Kumpulkan jawaban?'),
          content: const Text('Jawaban tidak bisa diubah lagi setelah dikumpulkan.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Kumpulkan')),
          ],
        ),
      );
      if (ya != true) return;
    }

    setState(() => _mengirim = true);
    final autosave = ref.read(autosaveServiceProvider);
    try {
      await autosave.flush();
      await ApiSiswa.submit(_token!);
      _selesai = true;
      await _lepasKunci();
      if (mounted) context.go('/receipt');
    } catch (_) {
      if (!mounted) return;
      setState(() => _mengirim = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim. Periksa sambungan lalu coba lagi.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_memuat) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Pesan(_error!, jenis: JenisPesan.error),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () {
                    setState(() {
                      _memuat = true;
                      _error = null;
                    });
                    _muat();
                  },
                  child: const Text('Coba lagi'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    if (_totalSoal == 0) {
      return const Scaffold(body: Center(child: Text('Belum ada soal untuk ujian ini.')));
    }

    final soal = _soalKini[_index];
    final dijawabBagian = _soalKini.map((s) => (_isi[s.id] ?? '').isNotEmpty).toList();
    final raguBagian = _soalKini.map((s) => _ragu[s.id] ?? false).toList();
    final terjawabSemua = _sections.expand((s) => s.soal).where((s) => (_isi[s.id] ?? '').isNotEmpty).length;
    final labelBagian = _sections.length > 1
        ? 'Bagian ${_sectionIndex + 1} dari ${_sections.length}${_section.judul != null && _section.judul!.isNotEmpty ? ' · ${_section.judul}' : ''}'
        : null;
    final soalTerakhirBagian = _index == _soalKini.length - 1;

    // Blokir tombol back agar murid tak keluar dari ujian.
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: BilikWarna.kertas,
        body: Column(
          children: [
            KepalaUjian(
              nomorSoal: _nomorGlobal,
              total: _totalSoal,
              sisa: _sisa,
              terjawab: terjawabSemua,
            ),
            BilahStatusUjian(offline: _offline, menyimpan: _menyimpan),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  if (labelBagian != null) ...[
                    Text(
                      labelBagian,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BilikWarna.nila),
                    ),
                    const SizedBox(height: 10),
                  ],
                  NomorSoal(
                    jumlah: _soalKini.length,
                    index: _index,
                    dijawab: dijawabBagian,
                    ragu: raguBagian,
                    onPilih: (i) => setState(() => _index = i),
                  ),
                  const SizedBox(height: 16),
                  KartuSoal(
                    soal: soal,
                    isi: _isi[soal.id],
                    urutanOpsi: _urutanOpsi[soal.id] ?? List<int>.generate(soal.opsi.length, (i) => i),
                    controller: _ctrl[soal.id],
                    alasanController: _ctrlAlasan[soal.id],
                    hurufOpsi: _hurufOpsi,
                    onJawab: (v) => _jawab(soal, v),
                    onPilihOpsi: _pilihOpsi,
                    onAlasan: (v) => _jawabAlasan(soal, v),
                  ),
                ],
              ),
            ),
            NavigasiUjian(
              sudahRagu: _ragu[soal.id] ?? false,
              index: _index,
              total: _soalKini.length,
              mengirim: _mengirim,
              onToggleRagu: () => _toggleRagu(soal),
              onPrev: _index > 0 ? () => setState(() => _index--) : null,
              onNext: !soalTerakhirBagian
                  ? () => setState(() => _index++)
                  : (_adaBagianBerikut ? _lanjutBagian : null),
              onKumpulkan: () => _kumpulkan(),
              nextLabel: soalTerakhirBagian && _adaBagianBerikut ? 'Bagian berikutnya' : null,
            ),
          ],
        ),
      ),
    );
  }
}
