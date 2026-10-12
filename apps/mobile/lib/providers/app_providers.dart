import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/peserta.dart';
import '../models/soal.dart';
import '../platform/exam_guard.dart';
import '../services/autosave_service.dart';

final examGuardProvider = Provider<ExamGuard>((ref) => ExamGuard.instance());

final autosaveServiceProvider = Provider<AutosaveService>((ref) {
  final service = AutosaveService();
  ref.onDispose(service.stop);
  return service;
});

final currentPesertaProvider = StateProvider<Peserta?>((ref) => null);
final soalListProvider = StateProvider<List<Soal>>((ref) => const []);
final currentSoalIndexProvider = StateProvider<int>((ref) => 0);
