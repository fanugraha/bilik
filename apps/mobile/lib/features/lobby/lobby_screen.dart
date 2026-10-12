import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/lencana.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
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
    return (await SessionStore.getSession())['tokenSesi'];
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
      setState(() => _error = e is ApiException ? e.pesan : 'Koneksi terputus, mencoba lagi…');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lobby Ujian'),
        automaticallyImplyLeading: false,
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1)),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: _ditolak ? _bangunDitolak() : _bangunMenunggu(),
          ),
        ),
      ),
    );
  }

  Widget _bangunDitolak() {
    return Kartu(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(color: BilikWarna.merahMuda, shape: BoxShape.circle),
            child: const Icon(Icons.block, size: 44, color: BilikWarna.merah),
          ),
          const SizedBox(height: 16),
          const Text('Pendaftaran ditolak guru', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17), textAlign: TextAlign.center),
          const SizedBox(height: 6),
          const Text('Silakan pilih nama Anda sekali lagi.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13.5, color: BilikWarna.tinta2)),
          const SizedBox(height: 20),
          FilledButton(onPressed: () => context.go('/join'), child: const Text('Kembali ke pilih nama')),
        ],
      ),
    );
  }

  Widget _bangunMenunggu() {
    final disetujui = _peserta?.disetujui ?? false;
    final nama = ref.read(joinDraftProvider)?.siswaNama;
    final warna = disetujui ? BilikWarna.hijau : BilikWarna.biru;
    final latar = disetujui ? BilikWarna.hijauMuda : BilikWarna.biruMuda;

    return Kartu(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: latar, shape: BoxShape.circle),
            child: disetujui
                ? Icon(Icons.how_to_reg, size: 44, color: warna)
                : SizedBox(
                    width: 44,
                    height: 44,
                    child: CircularProgressIndicator(strokeWidth: 3, color: warna),
                  ),
          ),
          const SizedBox(height: 18),
          Text(
            disetujui ? 'Disetujui, menunggu guru memulai' : 'Menunggu persetujuan guru',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            disetujui ? 'Ujian akan dimulai serentak. Tetap di layar ini.' : 'Guru akan mencocokkan nama Anda. Jangan keluar dari layar ini.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13.5, color: BilikWarna.tinta2, height: 1.4),
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(color: BilikWarna.kertas, borderRadius: BorderRadius.circular(8)),
            child: Column(
              children: [
                _barisInfo('Ujian', _ujian != null ? 'Sudah terhubung' : '…'),
                if (nama != null) ...[
                  const SizedBox(height: 8),
                  _barisInfo('Nama', nama),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Status', style: TextStyle(fontSize: 13, color: BilikWarna.tinta2)),
                    LencanaStatus(_peserta?.status ?? 'menunggu'),
                  ],
                ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            Pesan(_error!, jenis: JenisPesan.peringatan),
          ],
        ],
      ),
    );
  }

  Widget _barisInfo(String label, String nilai) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: BilikWarna.tinta2)),
        Flexible(
          child: Text(nilai, textAlign: TextAlign.right, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}
