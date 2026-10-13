import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/device_check/device_check_screen.dart';
import '../features/exam/exam_screen.dart';
import '../features/join/join_screen.dart';
import '../features/lobby/lobby_screen.dart';
import '../features/locked/locked_screen.dart';
import '../features/splash/splash_screen.dart';
import '../features/submit/receipt_screen.dart';

/// Alur: join -> device check -> lobby -> exam -> (locked) -> receipt.
/// `awal` bisa diisi '/lobby' bila ada sesi tersimpan, agar app yang dibuka
/// ulang langsung melanjutkan tanpa mengisi kode lagi.
GoRouter buatRouter(String awal) => GoRouter(
  initialLocation: awal,
  routes: [
    GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
    GoRoute(path: '/join', builder: (_, _) => const JoinScreen()),
    GoRoute(path: '/device', builder: (_, _) => const DeviceCheckScreen()),
    GoRoute(path: '/lobby', builder: (_, _) => const LobbyScreen()),
    GoRoute(path: '/exam', builder: (_, _) => const ExamScreen()),
    GoRoute(path: '/locked', builder: (_, _) => const LockedScreen()),
    GoRoute(path: '/receipt', builder: (_, _) => const ReceiptScreen()),
  ],
  errorBuilder: (_, state) => Scaffold(
    body: Center(child: Text('Halaman tidak ditemukan: ${state.uri}')),
  ),
);
