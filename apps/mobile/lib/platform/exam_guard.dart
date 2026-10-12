import 'dart:io';

import 'exam_guard_android.dart';
import 'exam_guard_ios.dart';

/// Jenis pelanggaran yang dilaporkan ke server.
enum ViolationType {
  pinningReleased,
  appSwitch,
  screenshot,
  screenRecording,
  multiWindow,
  unknown,
}

/// Kontrak pengamanan layar (PRD bagian 6 & 8).
/// Android: Screen Pinning + FLAG_SECURE + window focus.
/// iPhone: Guided Access + screenshot/recording listener.
abstract class ExamGuard {
  /// Cek kesiapan perangkat sebelum masuk lobby (PRD 5.2).
  /// Android: bisa startLockTask?
  /// iOS: Guided Access aktif?
  Future<bool> checkPrerequisites();

  /// Kunci perangkat saat mulai pengerjaan.
  Future<void> lock();

  /// Buka kunci (setelah submit atau selesai).
  Future<void> unlock();

  /// Aliran deteksi pelanggaran real-time.
  Stream<ViolationType> get violations;

  /// Factory yang memilih implementasi sesuai platform.
  static ExamGuard instance() {
    if (Platform.isAndroid) return ExamGuardAndroid();
    if (Platform.isIOS) return ExamGuardIos();
    return _NoopExamGuard();
  }
}

class _NoopExamGuard implements ExamGuard {
  @override
  Future<bool> checkPrerequisites() async => true;
  @override
  Future<void> lock() async {}
  @override
  Future<void> unlock() async {}
  @override
  Stream<ViolationType> get violations => const Stream.empty();
}
