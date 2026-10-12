import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
    final guard = ref.read(examGuardProvider);
    final ok = await guard.checkPrerequisites();
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
      await SessionStore.saveSession(
        pesertaId: hasil.peserta.id,
        tokenSesi: hasil.tokenSesi,
        kodeUjian: draft.kode,
      );
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
      appBar: AppBar(title: const Text('Cek Kesiapan Perangkat')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (draft != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  '${draft.siswaNama} • ${draft.kelasNama}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            Icon(
              _isReady ? Icons.check_circle_outline : Icons.error_outline,
              size: 72,
              color: _isReady ? Colors.green : Colors.orange,
            ),
            const SizedBox(height: 16),
            Text(
              _checking
                  ? 'Memeriksa pengaturan penguncian...'
                  : _isReady
                      ? 'Perangkat siap untuk ujian aman.'
                      : 'Aktifkan Screen Pinning (Android) / Guided Access (iPhone) terlebih dahulu.',
              textAlign: TextAlign.center,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 24),
            OutlinedButton(
              onPressed: _checking || _mendaftar ? null : _check,
              child: const Text('Periksa Ulang'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: (_isReady && !_mendaftar) ? _masukLobby : null,
              child: _mendaftar
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Siap Masuk Lobby'),
            ),
          ],
        ),
      ),
    );
  }
}
