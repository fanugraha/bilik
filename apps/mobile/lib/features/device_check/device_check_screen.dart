import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/session_store.dart';

/// Langkah 2: cek perangkat (PRD 5.2 & 6), lalu daftarkan peserta ke server.
/// Android: Screen Pinning bisa aktif? iOS: Guided Access aktif?
class DeviceCheckScreen extends ConsumerStatefulWidget {
  const DeviceCheckScreen({super.key});

  @override
  ConsumerState<DeviceCheckScreen> createState() => _DeviceCheckScreenState();
}

class _DeviceCheckScreenState extends ConsumerState<DeviceCheckScreen> {
  bool _isReady = false;
  bool _checking = true;
  bool _mendaftar = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    setState(() => _checking = true);
    final ok = await ref.read(examGuardProvider).checkPrerequisites();
    if (mounted) {
      setState(() {
        _isReady = ok;
        _checking = false;
      });
    }
  }

  Future<void> _masukLobby() async {
    final draft = ref.read(joinDraftProvider);
    if (draft == null) {
      context.go('/join');
      return;
    }
    setState(() {
      _mendaftar = true;
      _error = null;
    });
    try {
      final deviceId = await SessionStore.deviceId();
      final hasil = await ApiSiswa.pilih(
        kode: draft.kode,
        kelasId: draft.kelasId,
        siswaId: draft.siswaId,
        deviceId: deviceId,
      );
      await SessionStore.saveSession(pesertaId: hasil.peserta.id, tokenSesi: hasil.tokenSesi, kodeUjian: draft.kode);
      ref.read(tokenSesiProvider.notifier).state = hasil.tokenSesi;
      ref.read(currentPesertaProvider.notifier).state = hasil.peserta;
      if (mounted) context.go('/lobby');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.pesan;
        _mendaftar = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal mendaftar ke server. Coba lagi.';
        _mendaftar = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(joinDraftProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cek Perangkat'),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (draft != null) ...[
            Kartu(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Icon(Icons.person_outline, size: 20, color: BilikWarna.tinta2),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(draft.siswaNama, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        Text(draft.kelasNama, style: const TextStyle(fontSize: 12.5, color: BilikWarna.tinta2)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          Kartu(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _isReady ? BilikWarna.hijauMuda : BilikWarna.kuningMuda,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isReady ? Icons.verified_user_outlined : Icons.warning_amber_outlined,
                      size: 44,
                      color: _isReady ? BilikWarna.hijau : BilikWarna.kuning,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _checking
                      ? 'Memeriksa pengaturan penguncian…'
                      : _isReady
                          ? 'Perangkat siap'
                          : 'Perangkat belum siap',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                ),
                const SizedBox(height: 6),
                Text(
                  _isReady
                      ? 'Layar akan dikunci selama ujian berlangsung.'
                      : 'Aktifkan Screen Pinning (Android) atau Guided Access (iPhone) terlebih dahulu.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13.5, color: BilikWarna.tinta2, height: 1.4),
                ),
                const SizedBox(height: 20),
                if (_error != null) ...[
                  Pesan(_error!, jenis: JenisPesan.error),
                  const SizedBox(height: 12),
                ],
                FilledButton(
                  onPressed: (_isReady && !_mendaftar) ? _masukLobby : null,
                  child: _mendaftar
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Siap, masuk lobby'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: (_checking || _mendaftar) ? null : _check,
                  child: const Text('Periksa ulang'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
