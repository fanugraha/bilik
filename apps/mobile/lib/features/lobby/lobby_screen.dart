import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/join.dart';
import '../../models/peserta.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/session_store.dart';

/// Langkah 3: lobby. Menunggu persetujuan guru dan tombol Mulai (PRD 5.2).
/// Polling status tiap 2 detik; pindah layar sesuai perubahan status.
class LobbyScreen extends ConsumerStatefulWidget {
  const LobbyScreen({super.key});

  @override
  ConsumerState<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends ConsumerState<LobbyScreen> {
  Timer? _timer;
  bool _memuat = true;
  bool _ditolak = false;
  String? _error;
  Peserta? _peserta;
  StatusUjian? _ujian;

  @override
  void initState() {
    super.initState();
    _cek();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) => _cek());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<String?> _token() async {
    final dariProvider = ref.read(tokenSesiProvider);
    if (dariProvider != null && dariProvider.isNotEmpty) return dariProvider;
    final sesi = await SessionStore.getSession();
    return sesi['tokenSesi'];
  }

  Future<void> _cek() async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      _timer?.cancel();
      if (mounted) context.go('/join');
      return;
    }
    try {
      final status = await ApiSiswa.status(token);
      if (!mounted) return;

      if (status.ditolak) {
        _timer?.cancel();
        await SessionStore.clear();
        ref.read(tokenSesiProvider.notifier).state = null;
        ref.read(currentPesertaProvider.notifier).state = null;
        if (mounted) setState(() => _ditolak = true);
        return;
      }

      setState(() {
        _peserta = status.peserta;
        _ujian = status.ujian;
        _memuat = false;
        _error = null;
      });

      final statusPeserta = status.peserta?.status;
      if (statusPeserta == 'mengerjakan') {
        _timer?.cancel();
        if (mounted) context.go('/exam');
      } else if (statusPeserta == 'terkunci') {
        _timer?.cancel();
        if (mounted) context.go('/locked');
      } else if (statusPeserta == 'selesai') {
        _timer?.cancel();
        if (mounted) context.go('/receipt');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e is ApiException ? e.pesan : 'Koneksi terputus, mencoba lagi...');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lobby Ujian'), automaticallyImplyLeading: false),
      body: Padding(padding: const EdgeInsets.all(24), child: _bangunIsi()),
    );
  }

  Widget _bangunIsi() {
    if (_ditolak) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.block, size: 72, color: Colors.red),
          const SizedBox(height: 16),
          const Text(
            'Pendaftaran ditolak guru',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text('Silakan pilih nama Anda sekali lagi.', textAlign: TextAlign.center),
          const SizedBox(height: 24),
          FilledButton(onPressed: () => context.go('/join'), child: const Text('Kembali ke Pilih Nama')),
        ],
      );
    }

    final disetujui = _peserta?.disetujui ?? false;
    final nama = ref.read(joinDraftProvider)?.siswaNama;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_memuat)
          const CircularProgressIndicator()
        else if (disetujui)
          const Icon(Icons.how_to_reg, size: 72, color: Colors.green)
        else
          const CircularProgressIndicator(),
        const SizedBox(height: 24),
        Text(
          disetujui ? 'Disetujui — menunggu guru memulai' : 'Menunggu Persetujuan Guru',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          [
            ?nama,
            if (_ujian != null)
              _peserta?.status == 'menunggu' ? 'Pastikan nama Anda cocok dengan guru di kelas.' : 'Bersiap...',
          ].join('\n'),
          textAlign: TextAlign.center,
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
      ],
    );
  }
}
