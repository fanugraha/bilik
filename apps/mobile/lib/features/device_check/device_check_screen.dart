import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../components/kartu.dart';
import '../../components/langkah.dart';
import '../../components/latar.dart';
import '../../components/pesan.dart';
import '../../core/theme.dart';
import '../../providers/app_providers.dart';
import '../../services/api_siswa.dart';
import '../../services/session_store.dart';

/// Langkah 2: cek perangkat (PRD 5.2 & 6), lalu daftarkan peserta ke server.
class DeviceCheckScreen extends ConsumerStatefulWidget {
  const DeviceCheckScreen({super.key});

  @override
  ConsumerState<DeviceCheckScreen> createState() => _DeviceCheckScreenState();
}

class _DeviceCheckScreenState extends ConsumerState<DeviceCheckScreen> {
  bool _isReady = false;
  bool _checking = true;
  bool _mendaftar = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    setState(() => _checking = true);
    bool ok = false;
    try {
      ok = await ref.read(examGuardProvider).checkPrerequisites();
    } catch (_) {
      // Kanal platform gagal (mis. perangkat tak dukung): jangan sampai macet.
      ok = false;
    }
    if (mounted) {
      setState(() {
        _isReady = ok;
        _checking = false;
      });
    }
  }

  Future<void> _masukLobby() async {
    final draft = ref.read(joinDraftProvider);
    if (draft == null) {
      context.go('/join');
      return;
    }
    setState(() {
      _mendaftar = true;
      _error = null;
    });
    try {
      final deviceId = await SessionStore.deviceId();
      final hasil = await ApiSiswa.pilih(
        kode: draft.kode,
        kelasId: draft.kelasId,
        siswaId: draft.siswaId,
        deviceId: deviceId,
      );
      await SessionStore.saveSession(pesertaId: hasil.peserta.id, tokenSesi: hasil.tokenSesi, kodeUjian: draft.kode);
      ref.read(tokenSesiProvider.notifier).state = hasil.tokenSesi;
      ref.read(currentPesertaProvider.notifier).state = hasil.peserta;
      if (mounted) context.go('/lobby');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.pesan;
        _mendaftar = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal mendaftar ke server. Coba lagi.';
        _mendaftar = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(joinDraftProvider);
    return Scaffold(
      backgroundColor: BilikWarna.kertas,
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          HeaderGradient(
            ikon: Icons.verified_user_outlined,
            tinggiMinimum: 190,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const MerekBilik(terang: true),
                const SizedBox(height: 22),
                const Text('Cek Perangkat', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text('Pastikan HP siap dikunci selama ujian.', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
                const SizedBox(height: 18),
                const LangkahUjian(aktif: 2, terang: true),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (draft != null) ...[
                  Kartu(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: BilikWarna.nilaMuda,
                          child: Text(draft.siswaNama.isNotEmpty ? draft.siswaNama[0].toUpperCase() : '?', style: const TextStyle(fontWeight: FontWeight.w700, color: BilikWarna.nila)),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(draft.siswaNama, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              Text(draft.kelasNama, style: const TextStyle(fontSize: 12.5, color: BilikWarna.tinta2)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Kartu(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: IkonLingkaran(
                          ikon: _isReady ? Icons.lock_outline : Icons.lock_open_outlined,
                          ukuran: 92,
                          warna: _isReady ? BilikWarna.hijau : BilikWarna.kuning,
                          latar: 0.14,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _checking ? 'Memeriksa pengaturan…' : _isReady ? 'Perangkat siap' : 'Perangkat belum siap',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _isReady ? 'Layar akan dikunci selama ujian berlangsung.' : 'Aktifkan penguncian layar lalu periksa ulang.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 13.5, color: BilikWarna.tinta2, height: 1.4),
                      ),
                      const SizedBox(height: 16),
                      _barisCek('Penguncian layar', Platform.isIOS ? 'Guided Access' : 'Screen Pinning', _isReady),
                      const Divider(height: 20),
                      _barisCek('Blokir screenshot', Platform.isIOS ? 'Terdeteksi & layar diblur' : 'FLAG_SECURE aktif', true),
                      const SizedBox(height: 20),
                      if (!_isReady && !_checking) ...[
                        const Pesan(
                          'Penguncian layar belum terdeteksi. Anda tetap bisa lanjut, tapi sebaiknya aktifkan Screen Pinning / Guided Access.',
                          jenis: JenisPesan.peringatan,
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (_error != null) ...[
                        Pesan(_error!, jenis: JenisPesan.error),
                        const SizedBox(height: 12),
                      ],
                      FilledButton(
                        onPressed: _mendaftar ? null : _masukLobby,
                        child: _mendaftar
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text(_isReady ? 'Siap, masuk lobby' : 'Lanjut tanpa penguncian'),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton(
                        onPressed: (_checking || _mendaftar) ? null : _check,
                        child: const Text('Periksa ulang'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _barisCek(String judul, String keterangan, bool ok) {
    final warna = ok ? BilikWarna.hijau : BilikWarna.kuning;
    return Row(
      children: [
        Container(
          width: 34,
          height: 34,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: warna.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(9)),
          child: Icon(ok ? Icons.check : Icons.priority_high, size: 18, color: warna),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(judul, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              Text(keterangan, style: const TextStyle(fontSize: 12, color: BilikWarna.tinta2)),
            ],
          ),
        ),
      ],
    );
  }
}
