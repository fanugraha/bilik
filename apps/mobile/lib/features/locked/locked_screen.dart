import 'package:flutter/material.dart';

/// Layar terkunci bila pelanggaran melewati batas (PRD 5.2 & 6).
/// Menampilkan kolom input kode buka; timer tetap berjalan.
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
      backgroundColor: Colors.red.shade50,
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(Icons.lock, size: 72, color: Colors.red.shade700),
            const SizedBox(height: 16),
            const Text(
              'Ujian Terkunci',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Anda telah melakukan pelanggaran. Hubungi guru untuk mendapat kode buka.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _unlockController,
              textCapitalization: TextCapitalization.characters,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, letterSpacing: 4),
              decoration: const InputDecoration(
                labelText: 'Kode Buka',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {},
              child: const Text('Buka Kunci'),
            ),
          ],
        ),
      ),
    );
  }
}
