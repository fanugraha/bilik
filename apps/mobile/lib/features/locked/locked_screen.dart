import 'package:flutter/material.dart';

import '../../components/kartu.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';

/// Layar terkunci bila pelanggaran melewati batas (PRD 5.2 & 6).
/// Menampilkan kolom input kode buka; timer tetap berjalan (Fase 6).
class LockedScreen extends StatefulWidget {
  const LockedScreen({super.key});

  @override
  State<LockedScreen> createState() => _LockedScreenState();
}

class _LockedScreenState extends State<LockedScreen> {
  final _unlockController = TextEditingController();

  @override
  void dispose() {
    _unlockController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ujian Terkunci'),
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: const BoxDecoration(color: BilikWarna.merahMuda, shape: BoxShape.circle),
                      child: const Icon(Icons.lock_outline, size: 48, color: BilikWarna.merah),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text('Ujian Terkunci', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                  const SizedBox(height: 6),
                  const Text(
                    'Anda melewati batas pelanggaran. Minta kode buka kepada guru.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13.5, color: BilikWarna.tinta2, height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: _unlockController,
                    textCapitalization: TextCapitalization.characters,
                    maxLength: 6,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: 6),
                    decoration: const InputDecoration(labelText: 'Kode buka', counterText: ''),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Fitur kode buka belum aktif.')),
                      );
                    },
                    child: const Text('Buka kunci'),
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
