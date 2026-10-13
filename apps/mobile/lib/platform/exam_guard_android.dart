import 'dart:async';
import 'package:flutter/services.dart';
import 'exam_guard.dart';

/// Implementasi Android: MethodChannel ke MainActivity.kt
/// Menggunakan startLockTask, FLAG_SECURE, onWindowFocusChanged.
class ExamGuardAndroid implements ExamGuard {
  static const _channel = MethodChannel('com.bilik/exam_guard');
  static const _eventChannel = EventChannel('com.bilik/exam_guard_events');

  @override
  Future<bool> checkPrerequisites() async {
    final ok = await _channel.invokeMethod<bool>('canPin');
    return ok ?? false;
  }

  @override
  Future<void> lock() async {
    await _channel.invokeMethod('startLock');
  }

  @override
  Future<void> unlock() async {
    await _channel.invokeMethod('stopLock');
  }

  @override
  Future<void> setActive(bool aktif) async {
    await _channel.invokeMethod('setActive', {'aktif': aktif});
  }

  @override
  Stream<ViolationType> get violations => _eventChannel
      .receiveBroadcastStream()
      .map((event) => _mapViolation(event as String?));

  ViolationType _mapViolation(String? code) {
    switch (code) {
      case 'pinning_released':
        return ViolationType.pinningReleased;
      case 'window_unfocused':
      case 'app_inactive':
        return ViolationType.appSwitch;
      case 'multi_window':
        return ViolationType.multiWindow;
      default:
        return ViolationType.unknown;
    }
  }
}
