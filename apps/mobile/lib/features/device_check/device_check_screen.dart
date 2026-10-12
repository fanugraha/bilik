import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/app_providers.dart';

/// Langkah 2: Cek perangkat (PRD 5.2 & 6).
/// Android: Screen pinning bisa aktif?
/// iOS: Guided Access aktif?
/// Tombol "Siap" nonaktif bila syarat belum terpenuhi.
class DeviceCheckScreen extends ConsumerStatefulWidget {
  const DeviceCheckScreen({super.key});

  @override
  ConsumerState<DeviceCheckScreen> createState() => _DeviceCheckScreenState();
}

class _DeviceCheckScreenState extends ConsumerState<DeviceCheckScreen> {
  bool _isReady = false;
  bool _checking = true;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cek Kesiapan Perangkat')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
            const SizedBox(height: 24),
            OutlinedButton(
              onPressed: _check,
              child: const Text('Periksa Ulang'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _isReady ? () => context.go('/lobby') : null,
              child: const Text('Siap Masuk Lobby'),
            ),
          ],
        ),
      ),
    );
  }
}
