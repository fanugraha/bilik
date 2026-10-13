import 'package:flutter/material.dart';

import '../../../core/theme.dart';

/// Bar bawah: tombol ragu-ragu + navigasi Sebelumnya/Berikutnya/Kumpulkan.
class NavigasiUjian extends StatelessWidget {
  const NavigasiUjian({
    super.key,
    required this.sudahRagu,
    required this.index,
    required this.total,
    required this.mengirim,
    required this.onToggleRagu,
    required this.onPrev,
    required this.onNext,
    required this.onKumpulkan,
  });

  final bool sudahRagu;
  final int index;
  final int total;
  final bool mengirim;
  final VoidCallback onToggleRagu;
  final VoidCallback? onPrev;
  final VoidCallback? onNext;
  final VoidCallback onKumpulkan;

  @override
  Widget build(BuildContext context) {
    final terakhir = index >= total - 1;
    return Container(
      decoration: const BoxDecoration(
        color: BilikWarna.permukaan,
        border: Border(top: BorderSide(color: BilikWarna.garis)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            children: [
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onToggleRagu,
                  icon: Icon(sudahRagu ? Icons.flag : Icons.outlined_flag, size: 18, color: sudahRagu ? BilikWarna.kuning : null),
                  label: Text(sudahRagu ? 'Ditandai ragu-ragu' : 'Tandai ragu-ragu'),
                  style: sudahRagu
                      ? OutlinedButton.styleFrom(
                          foregroundColor: BilikWarna.kuning,
                          side: const BorderSide(color: BilikWarna.kuning),
                          backgroundColor: BilikWarna.kuningMuda,
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onPrev,
                      icon: const Icon(Icons.chevron_left, size: 20),
                      label: const Text('Sebelumnya'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: terakhir
                        ? FilledButton.icon(
                            onPressed: mengirim ? null : onKumpulkan,
                            icon: const Icon(Icons.check, size: 20),
                            label: Text(mengirim ? 'Mengirim…' : 'Kumpulkan'),
                          )
                        : FilledButton.icon(
                            onPressed: onNext,
                            icon: const Icon(Icons.chevron_right, size: 20),
                            label: const Text('Berikutnya'),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
