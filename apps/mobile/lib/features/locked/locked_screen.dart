import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/session_store.dart';

/// Layar terkunci bila pelanggaran melewati batas (PRD 5.2 & 6).
/// Murid memasukkan kode buka dari guru; timer ujian tetap berjalan.
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
        appBar: AppBar(
          title: const Text('Ujian Terkunci'),
          automaticallyImplyLeading: false,
          bottom: const PreferredSize(
            preferredSize: Size.fromHeight(1),
            child: Divider(height: 1),
          ),
        ),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Kartu(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: const BoxDecoration(
                          color: BilikWarna.merahMuda,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.lock_outline,
                          size: 48,
                          color: BilikWarna.merah,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Ujian Terkunci',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Anda melewati batas pelanggaran. Minta kode buka kepada guru.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13.5,
                        color: BilikWarna.tinta2,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _unlockController,
                      textCapitalization: TextCapitalization.characters,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 6,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Kode buka',
                        counterText: '',
                      ),
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
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Buka kunci'),
                    ),
                    const SizedBox(height: 12),
                    const Pesan(
                      'Jangan tutup aplikasi. Timer ujian tetap berjalan.',
                      jenis: JenisPesan.peringatan,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
