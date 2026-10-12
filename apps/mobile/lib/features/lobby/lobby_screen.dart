import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Langkah 3: Lobby menunggu persetujuan guru dan tombol Mulai (PRD 5.2).
class LobbyScreen extends StatelessWidget {
  const LobbyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lobby Ujian'),
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            const Text(
              'Menunggu Persetujuan Guru',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Guru akan mencocokkan nama dengan wajah Anda di kelas. Ujian dimulai serentak.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            // Tombol simulasi untuk pengembangan lokal
            OutlinedButton(
              onPressed: () => context.go('/exam'),
              child: const Text('[Dev] Simulasi Mulai Ujian'),
            ),
          ],
        ),
      ),
    );
  }
}
