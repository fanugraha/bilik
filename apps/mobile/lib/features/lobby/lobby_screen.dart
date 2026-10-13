import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/latar.dart';
import '../../components/lencana.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
import '../../models/peserta.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/session_store.dart';

/// Langkah 3: lobby. Menunggu persetujuan guru dan tombol Mulai (PRD 5.2).
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
    if (_ditolak) {
      return Scaffold(
        body: LatarPenuh(
          gradien: const [Color(0xFF7F1D1D), BilikWarna.merah],
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const IkonLingkaran(ikon: Icons.block, ukuran: 104, warna: Colors.white),
                  const SizedBox(height: 20),
                  const Text('Pendaftaran ditolak guru', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text('Silakan pilih nama Anda sekali lagi.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.85))),
                  const SizedBox(height: 24),
                  FilledButton(onPressed: () => context.go('/join'), child: const Text('Kembali ke pilih nama')),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final disetujui = _peserta?.disetujui ?? false;
    final nama = ref.read(joinDraftProvider)?.siswaNama;

    return Scaffold(
      body: LatarPenuh(
        gradien: disetujui ? const [Color(0xFF064E3B), BilikWarna.hijau] : const [BilikWarna.papan, BilikWarna.nila],
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const MerekBilik(terang: true),
                const SizedBox(height: 28),
                _indikator(disetujui),
                const SizedBox(height: 26),
                Text(
                  disetujui ? 'Disetujui, menunggu guru memulai' : 'Menunggu persetujuan guru',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  disetujui ? 'Ujian akan dimulai serentak. Tetap di layar ini.' : 'Guru akan mencocokkan nama Anda. Jangan keluar dari layar ini.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.82), fontSize: 13.5, height: 1.45),
                ),
                const SizedBox(height: 24),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                  ),
                  child: Column(
                    children: [
                      if (nama != null) ...[
                        _barisInfo('Nama', nama, disetujui),
                        const SizedBox(height: 10),
                      ],
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Status', style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 13)),
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
          ),
        ),
      ),
    );
  }

  Widget _indikator(bool disetujui) {
    if (!disetujui) {
      return const SizedBox(
        width: 104,
        height: 104,
        child: Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(width: 104, height: 104, child: CircularProgressIndicator(strokeWidth: 4, color: Colors.white24)),
            SizedBox(width: 78, height: 78, child: CircularProgressIndicator(strokeWidth: 4, color: Colors.white)),
            Icon(Icons.hourglass_top_rounded, color: Colors.white, size: 30),
          ],
        ),
      );
    }
    return const IkonLingkaran(ikon: Icons.check_rounded, ukuran: 104, warna: Colors.white);
  }

  Widget _barisInfo(String label, String nilai, bool disetujui) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 13)),
        Flexible(
          child: Text(nilai, textAlign: TextAlign.right, style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}
