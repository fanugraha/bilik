import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/lencana.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
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
      setState(() => _error = 'Kode ujian terdiri dari 6 karakter.');
      return;
    }
    FocusScope.of(context).unfocus();
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
        _error = 'Gagal terhubung ke server. Periksa sambungan internet.';
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
      appBar: AppBar(
        title: const Text('Masuk Ujian'),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1)),
      ),
      body: _data == null ? _bangunFormKode() : _bangunPilihNama(_data!),
    );
  }

  Widget _bangunFormKode() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Kartu(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Kode ujian', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 4),
              const Text('Masukkan kode 6 karakter yang ditampilkan guru.', style: TextStyle(fontSize: 13, color: BilikWarna.tinta2)),
              const SizedBox(height: 16),
              TextField(
                controller: _kodeController,
                textCapitalization: TextCapitalization.characters,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: 8),
                decoration: const InputDecoration(hintText: 'ABC123', counterText: ''),
                onSubmitted: (_) => _cariKode(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Pesan(_error!, jenis: JenisPesan.error),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _memuat ? null : _cariKode,
                child: _memuat
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Cari ujian'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _bangunPilihNama(JoinData data) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Kartu(
          judul: data.ujian.judul,
          deskripsi: [if (data.ujian.mapel != null) data.ujian.mapel!, '${data.ujian.durasi} menit'].join(', '),
          padding: const EdgeInsets.all(16),
          child: const Row(
            children: [
              Icon(Icons.touch_app_outlined, size: 18, color: BilikWarna.tinta2),
              SizedBox(width: 8),
              Expanded(child: Text('Pilih nama Anda di daftar bawah.', style: TextStyle(fontSize: 13, color: BilikWarna.tinta2))),
            ],
          ),
        ),
        const SizedBox(height: 12),
        for (final kelas in data.kelas) ...[
          Kartu(
            judul: kelas.nama,
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < kelas.siswa.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  _barisSiswa(kelas, kelas.siswa[i]),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        TextButton.icon(
          onPressed: () => setState(() {
            _data = null;
            _error = null;
          }),
          icon: const Icon(Icons.arrow_back, size: 18),
          label: const Text('Ganti kode ujian'),
        ),
      ],
    );
  }

  Widget _barisSiswa(KelasJoin kelas, SiswaRingkas siswa) {
    return InkWell(
      onTap: siswa.terpakai ? null : () => _pilihSiswa(kelas, siswa),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: siswa.terpakai ? BilikWarna.kertas : BilikWarna.nilaMuda,
              child: Text(
                siswa.noAbsen?.toString() ?? (siswa.nama.isNotEmpty ? siswa.nama[0].toUpperCase() : '?'),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: siswa.terpakai ? BilikWarna.tinta3 : BilikWarna.nila,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    siswa.nama,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: siswa.terpakai ? BilikWarna.tinta3 : BilikWarna.tinta,
                    ),
                  ),
                  if (siswa.terpakai)
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Text('Sudah dipakai di perangkat lain', style: TextStyle(fontSize: 12, color: BilikWarna.tinta3)),
                    ),
                ],
              ),
            ),
            siswa.terpakai
                ? const Lencana('Terpakai', nada: NadaLencana.merah)
                : const Icon(Icons.chevron_right, color: BilikWarna.tinta3),
          ],
        ),
      ),
    );
  }
}
