import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/latar.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/session_store.dart';

/// Layar terkunci bila pelanggaran melewati batas (PRD 5.2 & 6).
class LockedScreen extends ConsumerStatefulWidget {
  const LockedScreen({super.key});

  @override
  ConsumerState<LockedScreen> createState() => _LockedScreenState();
}

class _LockedScreenState extends ConsumerState<LockedScreen> {
  final _unlockController = TextEditingController();
  bool _memproses = false;
  String? _error;

  @override
  void dispose() {
    _unlockController.dispose();
    super.dispose();
  }

  Future<String?> _token() async {
    final dariProvider = ref.read(tokenSesiProvider);
    if (dariProvider != null && dariProvider.isNotEmpty) return dariProvider;
    return (await SessionStore.getSession())['tokenSesi'];
  }

  Future<void> _buka() async {
    final kode = _unlockController.text.trim();
    if (kode.isEmpty) {
      setState(() => _error = 'Masukkan kode buka dari guru.');
      return;
    }
    setState(() {
      _memproses = true;
      _error = null;
    });
    try {
      final token = await _token();
      if (token == null || token.isEmpty) {
        if (mounted) context.go('/join');
        return;
      }
      await ApiSiswa.buka(token: token, kode: kode);
      if (mounted) context.go('/exam');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.pesan;
        _memproses = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal membuka kunci. Periksa sambungan lalu coba lagi.';
        _memproses = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: LatarPenuh(
          gradien: const [Color(0xFF7F1D1D), BilikWarna.merah],
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(child: MerekBilik(terang: true)),
                  const SizedBox(height: 26),
                  const Center(child: IkonLingkaran(ikon: Icons.lock_outline, ukuran: 104, warna: Colors.white)),
                  const SizedBox(height: 22),
                  const Text('Ujian Terkunci', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text(
                    'Anda melewati batas pelanggaran. Minta kode buka kepada guru.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13.5, height: 1.45),
                  ),
                  const SizedBox(height: 24),
                  Kartu(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _unlockController,
                          textCapitalization: TextCapitalization.characters,
                          maxLength: 6,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 6),
                          decoration: const InputDecoration(labelText: 'Kode buka', counterText: ''),
                          onSubmitted: (_) => _buka(),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Pesan(_error!, jenis: JenisPesan.error),
                        ],
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: _memproses ? null : _buka,
                          child: _memproses
                              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('Buka kunci'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Pesan('Jangan tutup aplikasi. Timer ujian tetap berjalan.', jenis: JenisPesan.peringatan),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
