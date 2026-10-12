import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/join.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';

/// Langkah 1: input kode ujian -> pilih kelas -> pilih nama (PRD 5.2).
class JoinScreen extends ConsumerStatefulWidget {
  const JoinScreen({super.key});

  @override
  ConsumerState<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends ConsumerState<JoinScreen> {
  final _kodeController = TextEditingController();
  bool _memuat = false;
  String? _error;
  JoinData? _data;

  @override
  void dispose() {
    _kodeController.dispose();
    super.dispose();
  }

  Future<void> _cariKode() async {
    final kode = _kodeController.text.trim().toUpperCase();
    if (kode.length < 4) {
      setState(() => _error = 'Masukkan kode ujian 6 karakter');
      return;
    }
    setState(() {
      _memuat = true;
      _error = null;
    });
    try {
      final data = await ApiSiswa.join(kode);
      if (!mounted) return;
      setState(() {
        _data = data;
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.pesan;
        _memuat = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal terhubung ke server. Cek sambungan internet.';
        _memuat = false;
      });
    }
  }

  void _pilihSiswa(KelasJoin kelas, SiswaRingkas siswa) {
    ref.read(joinDraftProvider.notifier).state = JoinDraft(
      kode: _kodeController.text.trim().toUpperCase(),
      kelasId: kelas.id,
      kelasNama: kelas.nama,
      siswaId: siswa.id,
      siswaNama: siswa.nama,
    );
    context.push('/device');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bilik — Masuk Ujian')),
      body: _data == null ? _bangunFormKode() : _bangunPilihNama(_data!),
    );
  }

  Widget _bangunFormKode() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Masukkan Kode Ujian', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          TextField(
            controller: _kodeController,
            textCapitalization: TextCapitalization.characters,
            maxLength: 6,
            style: const TextStyle(fontSize: 24, letterSpacing: 8),
            textAlign: TextAlign.center,
            decoration: const InputDecoration(hintText: 'ABC123', border: OutlineInputBorder()),
            onSubmitted: (_) => _cariKode(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _memuat ? null : _cariKode,
            child: _memuat
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Cari Ujian'),
          ),
        ],
      ),
    );
  }

  Widget _bangunPilihNama(JoinData data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(data.ujian.judul, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('${data.ujian.durasi} menit${data.ujian.mapel != null ? ' • ${data.ujian.mapel}' : ''}'),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            children: [
              for (final kelas in data.kelas) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
                  child: Text(kelas.nama, style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
                for (final siswa in kelas.siswa)
                  ListTile(
                    leading: CircleAvatar(child: Text(siswa.noAbsen?.toString() ?? '?')),
                    title: Text(siswa.nama),
                    subtitle: siswa.terpakai ? const Text('Sudah dipakai di perangkat lain') : null,
                    enabled: !siswa.terpakai,
                    trailing: siswa.terpakai ? const Icon(Icons.lock_outline) : const Icon(Icons.chevron_right),
                    onTap: siswa.terpakai ? null : () => _pilihSiswa(kelas, siswa),
                  ),
              ],
              const SizedBox(height: 12),
            ],
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              onPressed: () => setState(() {
                _data = null;
                _error = null;
              }),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Ganti kode ujian'),
            ),
          ),
        ),
      ],
    );
  }
}
