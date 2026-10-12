import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/app_providers.dart';
import '../../services/session_store.dart';

/// Tanda terima setelah submit (PRD 5.2).
/// TANPA skor, tanpa benar/salah (penilaian hanya di guru).
class ReceiptScreen extends ConsumerStatefulWidget {
  const ReceiptScreen({super.key});

  @override
  ConsumerState<ReceiptScreen> createState() => _ReceiptScreenState();
}

class _ReceiptScreenState extends ConsumerState<ReceiptScreen> {
  Map<String, String?> _sesi = const {};

  @override
  void initState() {
    super.initState();
    SessionStore.getSession().then((s) {
      if (mounted) setState(() => _sesi = s);
    });
  }

  @override
  Widget build(BuildContext context) {
    final nama = ref.read(joinDraftProvider)?.siswaNama ?? '-';
    final kode = (_sesi['kodeUjian'] ?? '-').toUpperCase();
    final waktu = TimeOfDay.now().format(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Ujian Selesai'), automaticallyImplyLeading: false),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(Icons.check_circle_outline, size: 96, color: Colors.green.shade600),
            const SizedBox(height: 24),
            const Text(
              'Jawaban Anda Telah Diterima',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text('Hasil ujian akan diumumkan oleh guru. Terima kasih.', textAlign: TextAlign.center),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 12),
            const Text('Tanda Terima:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Kode Ujian: $kode'),
            Text('Nama: $nama'),
            Text('Waktu Selesai: $waktu'),
            const SizedBox(height: 32),
            OutlinedButton(
              onPressed: () {
                ref.read(joinDraftProvider.notifier).state = null;
                ref.read(currentPesertaProvider.notifier).state = null;
                ref.read(tokenSesiProvider.notifier).state = null;
                SessionStore.clear();
                context.go('/join');
              },
              child: const Text('Keluar'),
            ),
          ],
        ),
      ),
    );
  }
}
