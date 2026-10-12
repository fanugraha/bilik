import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../core/theme.dart';
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
      appBar: AppBar(
        title: const Text('Ujian Selesai'),
        automaticallyImplyLeading: false,
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1)),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Kartu(
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: const BoxDecoration(color: BilikWarna.hijauMuda, shape: BoxShape.circle),
                    child: const Icon(Icons.check_circle_outline, size: 48, color: BilikWarna.hijau),
                  ),
                  const SizedBox(height: 18),
                  const Text('Jawaban Anda Telah Diterima', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                  const SizedBox(height: 6),
                  const Text(
                    'Hasil ujian akan diumumkan oleh guru. Terima kasih.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13.5, color: BilikWarna.tinta2),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(color: BilikWarna.kertas, borderRadius: BorderRadius.circular(8)),
                    child: Column(
                      children: [
                        _baris('Kode ujian', kode),
                        const SizedBox(height: 8),
                        _baris('Nama', nama),
                        const SizedBox(height: 8),
                        _baris('Waktu selesai', waktu),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
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
          ),
        ),
      ),
    );
  }

  Widget _baris(String label, String nilai) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: BilikWarna.tinta2)),
        Flexible(child: Text(nilai, textAlign: TextAlign.right, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600))),
      ],
    );
  }
}
