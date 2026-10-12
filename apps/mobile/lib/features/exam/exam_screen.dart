import 'dart:async';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/jawaban.dart';
import '../../models/soal.dart';
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
  StreamSubscription<List<ConnectivityResult>>? _netSub;
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
      if (mounted) setState(() => _offline = hasil.contains(ConnectivityResult.none));
    });
    _muat();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => _detik());
  }

  @override
  void dispose() {
    _tick?.cancel();
    _netSub?.cancel();
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
    final sesi = await SessionStore.getSession();
    _pesertaId = sesi['pesertaId'];

    try {
      final hasil = await ApiSiswa.soal(token);
      final acak = Random(token.hashCode);
      final list = List<Soal>.from(hasil.soal);
      if (hasil.acakSoal) list.shuffle(acak);
      for (final s in list) {
        final indeks = List<int>.generate(s.opsi.length, (i) => i);
        if (hasil.acakOpsi) indeks.shuffle(Random(token.hashCode ^ s.id.hashCode));
        _urutanOpsi[s.id] = indeks;
        if (s.isEssay) {
          _ctrl[s.id] = TextEditingController(text: '');
        }
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
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.pesan;
        _memuat = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal memuat soal. Cek sambungan lalu coba lagi.';
        _memuat = false;
      });
    }
  }

  void _detik() {
    if (_deadline == null) return;
    final sisa = _deadline!.difference(DateTime.now());
    if (mounted) setState(() => _sisa = sisa.isNegative ? Duration.zero : sisa);
    if (!_menyimpan) return;
    if (ref.read(autosaveServiceProvider).pendingCount == 0 && mounted) {
      setState(() => _menyimpan = false);
    }
    if (sisa.isNegative && !_selesai && !_mengirim) {
      _kumpulkan(paksa: true);
    }
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

  Future<void> _kumpulkan({bool paksa = false}) async {
    if (!paksa) {
      final ya = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Kumpulkan jawaban?'),
          content: const Text('Jawaban yang sudah dikumpulkan tidak bisa diubah lagi.'),
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
      if (mounted) context.go('/receipt');
    } catch (_) {
      if (!mounted) return;
      setState(() => _mengirim = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengirim. Cek sambungan lalu coba lagi.')),
      );
    }
  }

  String _formatSisa(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    final jam = d.inHours;
    return jam > 0 ? '$jam:$m:$s' : '$m:$s';
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
                Text(_error!, textAlign: TextAlign.center),
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
    final sudahRagu = _ragu[soal.id] ?? false;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text('Soal ${_index + 1} / ${_soal.length}'),
        actions: [
          Center(child: Text(_formatSisa(_sisa), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
          const SizedBox(width: 12),
        ],
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _bilahStatus(),
            _nomorSoal(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(soal.teks, style: const TextStyle(fontSize: 16, height: 1.4)),
                    const SizedBox(height: 16),
                    _jawabanSoal(soal),
                  ],
                ),
              ),
            ),
            _navigasi(soal, sudahRagu),
          ],
        ),
      ),
    );
  }

  Widget _bilahStatus() {
    final tema = Theme.of(context);
    final teks = _offline ? 'Offline' : (_menyimpan ? 'Menyimpan…' : 'Tersimpan');
    final ikon = _offline ? Icons.cloud_off : (_menyimpan ? Icons.sync : Icons.cloud_done);
    final warna = _offline ? tema.colorScheme.error : tema.colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: tema.colorScheme.surfaceContainerHighest,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Icon(ikon, size: 16, color: warna),
          const SizedBox(width: 6),
          Text(teks, style: TextStyle(fontSize: 12, color: warna)),
        ],
      ),
    );
  }

  Widget _nomorSoal() {
    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _soal.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final s = _soal[i];
          final aktif = i == _index;
          final dijawab = _isi[s.id] != null && _isi[s.id]!.isNotEmpty;
          final ragu = _ragu[s.id] ?? false;
          final warna = aktif
              ? Theme.of(context).colorScheme.primary
              : ragu
                  ? Colors.orange
                  : dijawab
                      ? Colors.green.shade300
                      : Theme.of(context).colorScheme.surfaceContainerHighest;
          return InkWell(
            onTap: () => setState(() => _index = i),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: warna, borderRadius: BorderRadius.circular(8)),
              child: Text(
                '${i + 1}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: aktif || ragu || dijawab ? Colors.white : null,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _jawabanSoal(Soal soal) {
    if (soal.isPg) {
      final urutan = _urutanOpsi[soal.id] ?? List<int>.generate(soal.opsi.length, (i) => i);
      return RadioGroup<String>(
        groupValue: _isi[soal.id],
        onChanged: (v) => _jawab(soal, v),
        child: Column(
          children: [
            for (final i in urutan)
              RadioListTile<String>(
                value: _hurufOpsi(i),
                title: Text('${_hurufOpsi(i)}. ${soal.opsi[i]}'),
                contentPadding: EdgeInsets.zero,
              ),
          ],
        ),
      );
    }
    if (soal.isBenarSalah) {
      return RadioGroup<String>(
        groupValue: _isi[soal.id],
        onChanged: (v) => _jawab(soal, v),
        child: const Column(
          children: [
            RadioListTile<String>(value: 'benar', title: Text('Benar'), contentPadding: EdgeInsets.zero),
            RadioListTile<String>(value: 'salah', title: Text('Salah'), contentPadding: EdgeInsets.zero),
          ],
        ),
      );
    }
    return TextField(
      controller: _ctrl[soal.id],
      maxLines: 8,
      minLines: 5,
      decoration: const InputDecoration(hintText: 'Tulis jawaban Anda', border: OutlineInputBorder()),
      onChanged: (v) => _jawab(soal, v),
    );
  }

  Widget _navigasi(Soal soal, bool sudahRagu) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OutlinedButton.icon(
            onPressed: () => _toggleRagu(soal),
            icon: Icon(sudahRagu ? Icons.flag : Icons.outlined_flag),
            label: Text(sudahRagu ? 'Tandai ragu (aktif)' : 'Tandai ragu-ragu'),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _index > 0 ? () => setState(() => _index--) : null,
                  icon: const Icon(Icons.chevron_left),
                  label: const Text('Sebelumnya'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _index < _soal.length - 1
                    ? FilledButton.icon(
                        onPressed: () => setState(() => _index++),
                        icon: const Icon(Icons.chevron_right),
                        label: const Text('Berikutnya'),
                      )
                    : FilledButton.icon(
                        onPressed: _mengirim ? null : () => _kumpulkan(),
                        icon: const Icon(Icons.check),
                        label: Text(_mengirim ? 'Mengirim…' : 'Kumpulkan'),
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
