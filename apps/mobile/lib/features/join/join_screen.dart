import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Langkah 1: Input kode ujian -> pilih kelas -> pilih nama (PRD 5.2).
class JoinScreen extends StatefulWidget {
  const JoinScreen({super.key});

  @override
  State<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends State<JoinScreen> {
  final _kodeController = TextEditingController();

  @override
  void dispose() {
    _kodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bilik — Masuk Ujian')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Masukkan 6 Karakter Kode Ujian',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _kodeController,
              textCapitalization: TextCapitalization.characters,
              maxLength: 6,
              style: const TextStyle(fontSize: 24, letterSpacing: 8),
              textAlign: TextAlign.center,
              decoration: const InputDecoration(
                hintText: 'ABC123',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.push('/device'),
              child: const Text('Lanjut ke Cek Perangkat'),
            ),
          ],
        ),
      ),
    );
  }
}
