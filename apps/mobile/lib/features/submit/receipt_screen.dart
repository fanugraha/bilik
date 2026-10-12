import 'package:flutter/material.dart';

/// Tanda terima setelah submit (PRD 5.2).
/// TANPA skor, tanpa benar/salah (penilaian hanya di guru).
class ReceiptScreen extends StatelessWidget {
  const ReceiptScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ujian Selesai'),
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
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
            const Text(
              'Hasil ujian akan diumumkan oleh guru. Terima kasih.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),
            const Text('Tanda Terima:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Kode Ujian: ABC123'),
            const Text('Nama: [Nama Siswa]'),
            const Text('Waktu Selesai: 12 Oktober 2026, 10:05'),
            const SizedBox(height: 32),
            OutlinedButton(
              onPressed: () {},
              child: const Text('Keluar'),
            ),
          ],
        ),
      ),
    );
  }
}
