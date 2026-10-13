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
/// Satu soal per layar, navigasi nomor, timer dari server, autosave, ragu-ragu.
class ExamScreen extends ConsumerStatefulWidget {
  const ExamScreen({super.key});

  @override
  ConsumerState<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends ConsumerState<ExamScreen> {
  static const _huruf = ['A', 'B', 'C', 'D', 'E'];

  final _isi = <String, String?>{};
  final _ragu = <String, bool>{};
  final _urutanOpsi = <String, List<int>>{};
  final _ctrl = <String, TextEditingController>{};

  List<Soal> _soal = [];
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
  String? _error;

  @override
  void initState() {
    super.initState();
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
    for (final c in _ctrl.values) {
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
      final list = List<Soal>.from(hasil.soal);
      if (hasil.acakSoal) list.shuffle(acak);
      for (final s in list) {
        final indeks = List<int>.generate(s.opsi.length, (i) => i);
        if (hasil.acakOpsi) {
          indeks.shuffle(Random(token.hashCode ^ s.id.hashCode));
        }
        _urutanOpsi[s.id] = indeks;
        if (s.isEssay) _ctrl[s.id] = TextEditingController();
      }
      for (final j in hasil.jawaban) {
        _isi[j.soalId] = j.isi;
        _ragu[j.soalId] = j.raguRagu;
        _ctrl[j.soalId]?.text = j.isi ?? '';
      }
      _deadline = hasil.selesaiAt ?? DateTime.now().add(const Duration(minutes: 60));

      if (!mounted) return;
      setState(() {
        _soal = list;
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
        _tick?.cancel();
        _detak?.cancel();
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
        _tick?.cancel();
        _detak?.cancel();
        context.go('/locked');
        return;
      }
      if (st == 'selesai') {
        _selesai = true;
        _tick?.cancel();
        _detak?.cancel();
        ref.read(autosaveServiceProvider).stop();
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
          Jawaban(pesertaId: _pesertaId!, soalId: soal.id, isi: isi, raguRagu: _ragu[soal.id] ?? false),
        );
  }

  void _jawab(Soal soal, String? isi) {
    setState(() {
      _isi[soal.id] = isi;
      _menyimpan = true;
    });
    _simpanJawaban(soal, isi);
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
    final soal = _soal[_index];
    _jawab(soal, _isi[soal.id] == nilai ? null : nilai);
  }

  Future<void> _kumpulkan({bool paksa = false}) async {
    if (!paksa) {
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
      autosave.stop();
      try {
        await ref.read(examGuardProvider).setActive(false);
        await ref.read(examGuardProvider).unlock();
      } catch (_) {}
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
    if (_soal.isEmpty) {
      return const Scaffold(body: Center(child: Text('Belum ada soal untuk ujian ini.')));
    }

    final soal = _soal[_index];
    final dijawab = _soal.map((s) => (_isi[s.id] ?? '').isNotEmpty).toList();
    final ragu = _soal.map((s) => _ragu[s.id] ?? false).toList();

    // Blokir tombol back agar murid tak keluar dari ujian.
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: BilikWarna.kertas,
        body: Column(
          children: [
            KepalaUjian(
              nomorSoal: _index + 1,
              total: _soal.length,
              sisa: _sisa,
              terjawab: dijawab.where((d) => d).length,
            ),
            BilahStatusUjian(offline: _offline, menyimpan: _menyimpan),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  NomorSoal(
                    jumlah: _soal.length,
                    index: _index,
                    dijawab: dijawab,
                    ragu: ragu,
                    onPilih: (i) => setState(() => _index = i),
                  ),
                  const SizedBox(height: 16),
                  KartuSoal(
                    soal: soal,
                    isi: _isi[soal.id],
                    urutanOpsi: _urutanOpsi[soal.id] ?? List<int>.generate(soal.opsi.length, (i) => i),
                    controller: _ctrl[soal.id],
                    hurufOpsi: _hurufOpsi,
                    onJawab: (v) => _jawab(soal, v),
                    onPilihOpsi: _pilihOpsi,
                  ),
                ],
              ),
            ),
            NavigasiUjian(
              sudahRagu: _ragu[soal.id] ?? false,
              index: _index,
              total: _soal.length,
              mengirim: _mengirim,
              onToggleRagu: () => _toggleRagu(soal),
              onPrev: _index > 0 ? () => setState(() => _index--) : null,
              onNext: _index < _soal.length - 1 ? () => setState(() => _index++) : null,
              onKumpulkan: () => _kumpulkan(),
            ),
          ],
        ),
      ),
    );
  }
}
