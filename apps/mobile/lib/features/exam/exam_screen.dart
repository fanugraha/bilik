import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/app_providers.dart';

/// Langkah 4: Pengerjaan ujian (PRD 5.2).
/// Satu soal per layar, navigasi nomor, autosave, timer, tanda ragu-ragu.
class ExamScreen extends ConsumerStatefulWidget {
  const ExamScreen({super.key});

  @override
  ConsumerState<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends ConsumerState<ExamScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(autosaveServiceProvider).start();
  }

  @override
  Widget build(BuildContext context) {
    final soalList = ref.watch(soalListProvider);
    final currentIndex = ref.watch(currentSoalIndexProvider);

    if (soalList.isEmpty) {
      return const Scaffold(
        body: Center(child: Text('Soal belum dimuat')),
      );
    }

    final soal = soalList[currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text('Soal ${currentIndex + 1} / ${soalList.length}'),
        automaticallyImplyLeading: false,
        actions: const [
          Padding(
            padding: EdgeInsets.all(12.0),
            child: Center(child: Text('⏱ 45:00', style: TextStyle(fontSize: 18))),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(soal.teks, style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 16),
            if (soal.isPg)
              ...soal.opsi.map((opsi) => RadioListTile<String>(
                    title: Text(opsi),
                    value: opsi,
                    groupValue: null,
                    onChanged: (v) {},
                  ))
            else
              TextField(
                maxLines: 6,
                decoration: const InputDecoration(
                  hintText: 'Tulis jawaban essay Anda',
                  border: OutlineInputBorder(),
                ),
              ),
            const Spacer(),
            Row(
              children: [
                if (currentIndex > 0)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          ref.read(currentSoalIndexProvider.notifier).state = currentIndex - 1,
                      icon: const Icon(Icons.chevron_left),
                      label: const Text('Sebelumnya'),
                    ),
                  ),
                const SizedBox(width: 8),
                Expanded(
                  child: currentIndex < soalList.length - 1
                      ? FilledButton.icon(
                          onPressed: () => ref.read(currentSoalIndexProvider.notifier).state =
                              currentIndex + 1,
                          icon: const Icon(Icons.chevron_right),
                          label: const Text('Berikutnya'),
                        )
                      : FilledButton.icon(
                          onPressed: () => context.go('/receipt'),
                          icon: const Icon(Icons.check),
                          label: const Text('Kumpulkan'),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
