import 'dart:async';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/lencana.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
import '../../models/jawaban.dart';
import '../../models/soal.dart';
import '../../platform/exam_guard.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/session_store.dart';

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
      if (mounted)
        setState(() => _offline = hasil.contains(ConnectivityResult.none));
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

  Future<String?> _ambilToken() async {
    final dariProvider = ref.read(tokenSesiProvider);
    if (dariProvider != null && dariProvider.isNotEmpty) return dariProvider;
    return (await SessionStore.getSession())['tokenSesi'];
  }

  Future<void> _muat() async {
    final token = await _ambilToken();
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
        if (hasil.acakOpsi)
          indeks.shuffle(Random(token.hashCode ^ s.id.hashCode));
        _urutanOpsi[s.id] = indeks;
        if (s.isEssay) _ctrl[s.id] = TextEditingController();
      }
      for (final j in hasil.jawaban) {
        _isi[j.soalId] = j.isi;
        _ragu[j.soalId] = j.raguRagu;
        _ctrl[j.soalId]?.text = j.isi ?? '';
      }
      _deadline =
          hasil.selesaiAt ?? DateTime.now().add(const Duration(minutes: 60));

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
      if (mounted)
        setState(() => _sisa = sisa.isNegative ? Duration.zero : sisa);
      if (sisa.isNegative && !_selesai && !_mengirim) _kumpulkan(paksa: true);
    }
    if (_menyimpan &&
        ref.read(autosaveServiceProvider).pendingCount == 0 &&
        mounted) {
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
      final hasil = await ApiSiswa.lapor(
        token: _token!,
        jenis: _jenisPelanggaran(t),
      );
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

  String _hurufOpsi(int indeks) =>
      indeks < _huruf.length ? _huruf[indeks] : '${indeks + 1}';

  void _simpanJawaban(Soal soal, String? isi) {
    if (_pesertaId == null) return;
    ref
        .read(autosaveServiceProvider)
        .record(
          Jawaban(
            pesertaId: _pesertaId!,
            soalId: soal.id,
            isi: isi,
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

  void _toggleRagu(Soal soal) {
    final baru = !(_ragu[soal.id] ?? false);
    setState(() {
      _ragu[soal.id] = baru;
      _menyimpan = true;
    });
    _simpanJawaban(soal, _isi[soal.id]);
  }

  Future<void> _kumpulkan({bool paksa = false}) async {
    if (!paksa) {
      final ya = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Kumpulkan jawaban?'),
          content: const Text(
            'Jawaban tidak bisa diubah lagi setelah dikumpulkan.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Kumpulkan'),
            ),
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
        const SnackBar(
          content: Text('Gagal mengirim. Periksa sambungan lalu coba lagi.'),
        ),
      );
    }
  }

  String _formatSisa(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return d.inHours > 0 ? '${d.inHours}:$m:$s' : '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    if (_memuat)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
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
      return const Scaffold(
        body: Center(child: Text('Belum ada soal untuk ujian ini.')),
      );
    }

    final soal = _soal[_index];
    // Blokir tombol back agar murid tak keluar dari ujian.
    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: Text('Soal ${_index + 1} dari ${_soal.length}'),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(child: _pilTimer()),
            ),
          ],
          bottom: const PreferredSize(
            preferredSize: Size.fromHeight(1),
            child: Divider(height: 1),
          ),
        ),
        body: Column(
          children: [
            _bilahStatus(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _nomorSoal(),
                  const SizedBox(height: 16),
                  _kartuSoal(soal),
                ],
              ),
            ),
            _navigasi(soal),
          ],
        ),
      ),
    );
  }

  Widget _pilTimer() {
    final rendah = _sisa.inSeconds <= 60;
    final warna = rendah ? BilikWarna.merah : BilikWarna.nila;
    final latar = rendah ? BilikWarna.merahMuda : BilikWarna.nilaMuda;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: latar,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.timer_outlined, size: 16, color: warna),
          const SizedBox(width: 6),
          Text(
            _formatSisa(_sisa),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: warna,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bilahStatus() {
    final IconData ikon;
    final String teks;
    final Color warna;
    if (_offline) {
      ikon = Icons.cloud_off;
      teks = 'Offline, jawaban tersimpan di perangkat';
      warna = BilikWarna.kuning;
    } else if (_menyimpan) {
      ikon = Icons.sync;
      teks = 'Menyimpan…';
      warna = BilikWarna.tinta2;
    } else {
      ikon = Icons.cloud_done;
      teks = 'Tersimpan';
      warna = BilikWarna.hijau;
    }
    return Container(
      width: double.infinity,
      color: BilikWarna.permukaan,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          Icon(ikon, size: 14, color: warna),
          const SizedBox(width: 6),
          Text(
            teks,
            style: TextStyle(
              fontSize: 12,
              color: warna,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _nomorSoal() {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _soal.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final s = _soal[i];
          final aktif = i == _index;
          final dijawab = (_isi[s.id] ?? '').isNotEmpty;
          final ragu = _ragu[s.id] ?? false;

          late final Color latar;
          late final Color batas;
          late final Color teks;
          if (aktif) {
            latar = BilikWarna.nila;
            batas = BilikWarna.nila;
            teks = Colors.white;
          } else if (ragu) {
            latar = BilikWarna.kuningMuda;
            batas = BilikWarna.kuning;
            teks = BilikWarna.kuning;
          } else if (dijawab) {
            latar = BilikWarna.hijauMuda;
            batas = BilikWarna.hijau;
            teks = BilikWarna.hijau;
          } else {
            latar = BilikWarna.permukaan;
            batas = BilikWarna.garisTegas;
            teks = BilikWarna.tinta2;
          }

          return InkWell(
            onTap: () => setState(() => _index = i),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: latar,
                border: Border.all(color: batas),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${i + 1}',
                style: TextStyle(fontWeight: FontWeight.w700, color: teks),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _kartuSoal(Soal soal) {
    return Kartu(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _lencanaTipe(soal.tipe),
              const Spacer(),
              Text(
                'Bobot ${soal.bobot}',
                style: const TextStyle(fontSize: 12, color: BilikWarna.tinta2),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(soal.teks, style: const TextStyle(fontSize: 16, height: 1.5)),
          const SizedBox(height: 18),
          _jawabanSoal(soal),
        ],
      ),
    );
  }

  Widget _lencanaTipe(String tipe) {
    switch (tipe) {
      case 'pg':
        return const Lencana('Pilihan ganda', nada: NadaLencana.nila);
      case 'benar_salah':
        return const Lencana('Benar / Salah', nada: NadaLencana.hijau);
      default:
        return const Lencana('Essay', nada: NadaLencana.kuning);
    }
  }

  Widget _jawabanSoal(Soal soal) {
    if (soal.isPg) {
      final urutan =
          _urutanOpsi[soal.id] ??
          List<int>.generate(soal.opsi.length, (i) => i);
      return Column(
        children: [
          for (final i in urutan)
            _opsiTile(
              huruf: _hurufOpsi(i),
              teks: soal.opsi[i],
              dipilih: _isi[soal.id] == _hurufOpsi(i),
            ),
        ],
      );
    }
    if (soal.isBenarSalah) {
      return Column(
        children: [
          _opsiTile(
            huruf: 'B',
            teks: 'Benar',
            dipilih: _isi[soal.id] == 'benar',
            nilai: 'benar',
          ),
          _opsiTile(
            huruf: 'S',
            teks: 'Salah',
            dipilih: _isi[soal.id] == 'salah',
            nilai: 'salah',
          ),
        ],
      );
    }
    return TextField(
      controller: _ctrl[soal.id],
      maxLines: 8,
      minLines: 5,
      decoration: const InputDecoration(
        hintText: 'Tulis jawaban Anda',
        alignLabelWithHint: true,
      ),
      onChanged: (v) => _jawab(soal, v),
    );
  }

  Widget _opsiTile({
    required String huruf,
    required String teks,
    required bool dipilih,
    String? nilai,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => _pilihOpsi(nilai ?? huruf),
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: dipilih ? BilikWarna.nilaMuda : BilikWarna.permukaan,
            border: Border.all(
              color: dipilih ? BilikWarna.nila : BilikWarna.garisTegas,
              width: dipilih ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: dipilih ? BilikWarna.nila : BilikWarna.kertas,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  huruf,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: dipilih ? Colors.white : BilikWarna.tinta2,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(teks, style: const TextStyle(fontSize: 15))),
            ],
          ),
        ),
      ),
    );
  }

  void _pilihOpsi(String nilai) {
    final soal = _soal[_index];
    _jawab(soal, _isi[soal.id] == nilai ? null : nilai);
  }

  Widget _navigasi(Soal soal) {
    final sudahRagu = _ragu[soal.id] ?? false;
    return Container(
      decoration: const BoxDecoration(
        color: BilikWarna.permukaan,
        border: Border(top: BorderSide(color: BilikWarna.garis)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            children: [
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _toggleRagu(soal),
                  icon: Icon(
                    sudahRagu ? Icons.flag : Icons.outlined_flag,
                    size: 18,
                    color: sudahRagu ? BilikWarna.kuning : null,
                  ),
                  label: Text(
                    sudahRagu ? 'Ditandai ragu-ragu' : 'Tandai ragu-ragu',
                  ),
                  style: sudahRagu
                      ? OutlinedButton.styleFrom(
                          foregroundColor: BilikWarna.kuning,
                          side: const BorderSide(color: BilikWarna.kuning),
                          backgroundColor: BilikWarna.kuningMuda,
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _index > 0
                          ? () => setState(() => _index--)
                          : null,
                      icon: const Icon(Icons.chevron_left, size: 20),
                      label: const Text('Sebelumnya'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _index < _soal.length - 1
                        ? FilledButton.icon(
                            onPressed: () => setState(() => _index++),
                            icon: const Icon(Icons.chevron_right, size: 20),
                            label: const Text('Berikutnya'),
                          )
                        : FilledButton.icon(
                            onPressed: _mengirim ? null : () => _kumpulkan(),
                            icon: const Icon(Icons.check, size: 20),
                            label: Text(_mengirim ? 'Mengirim…' : 'Kumpulkan'),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
