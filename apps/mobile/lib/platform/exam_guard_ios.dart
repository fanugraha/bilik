import 'dart:async';
import 'package:flutter/services.dart';
import 'exam_guard.dart';

/// Implementasi iOS: MethodChannel ke AppDelegate.swift
/// Menggunakan UIAccessibility.isGuidedAccessEnabled,
/// UIScreen.isCaptured, userDidTakeScreenshotNotification.
class ExamGuardIos implements ExamGuard {
  static const _channel = MethodChannel('com.bilik/exam_guard');
  static const _eventChannel = EventChannel('com.bilik/exam_guard_events');

  @override
  Future<bool> checkPrerequisites() async {
    final ok = await _channel.invokeMethod<bool>('isGuidedAccessEnabled');
    return ok ?? false;
  }

  @override
  Future<void> lock() async {
    await _channel.invokeMethod('enableSecureView');
  }

  @override
  Future<void> unlock() async {
    await _channel.invokeMethod('disableSecureView');
  }

  @override
  Future<void> setActive(bool aktif) async {
    // iOS: pelaporan sudah aktif lewat observer; tak perlu penanda tambahan.
  }

  @override
  Stream<ViolationType> get violations => _eventChannel
      .receiveBroadcastStream()
      .map((event) => _mapViolation(event as String?));

  ViolationType _mapViolation(String? code) {
    switch (code) {
      case 'guided_access_disabled':
        return ViolationType.pinningReleased;
      case 'screenshot':
        return ViolationType.screenshot;
      case 'screen_record':
        return ViolationType.screenRecording;
      case 'app_inactive':
        return ViolationType.appSwitch;
      default:
        return ViolationType.unknown;
    }
  }
}
