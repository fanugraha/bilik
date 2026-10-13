import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/latar.dart';
import '../../core/theme.dart';
import '../../providers/app_providers.dart';
import '../../services/session_store.dart';

/// Tanda terima setelah submit (PRD 5.2). Tanpa skor/benar-salah.
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
      backgroundColor: BilikWarna.kertas,
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          HeaderGradient(
            gradien: const [Color(0xFF065F46), BilikWarna.hijau],
            ikon: Icons.check_circle_outline,
            tinggiMinimum: 250,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const MerekBilik(terang: true),
                const SizedBox(height: 22),
                const IkonLingkaran(ikon: Icons.check_rounded, ukuran: 96, warna: Colors.white),
                const SizedBox(height: 16),
                const Text('Jawaban Terkirim', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text(
                  'Hasil diumumkan guru. Terima kasih.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13.5),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Kartu(
                  judul: 'Tanda terima',
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    children: [
                      _baris('Kode ujian', kode),
                      const SizedBox(height: 12),
                      _baris('Nama', nama),
                      const SizedBox(height: 12),
                      _baris('Waktu selesai', waktu),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
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
        ],
      ),
    );
  }

  Widget _baris(String label, String nilai) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: BilikWarna.tinta2)),
        Flexible(child: Text(nilai, textAlign: TextAlign.right, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700))),
      ],
    );
  }
}
