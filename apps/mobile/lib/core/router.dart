import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/device_check/device_check_screen.dart';
import '../features/exam/exam_screen.dart';
import '../features/join/join_screen.dart';
import '../features/lobby/lobby_screen.dart';
import '../features/locked/locked_screen.dart';
import '../features/submit/receipt_screen.dart';

/// Alur: join -> device check -> lobby -> exam -> (locked) -> receipt.
final appRouter = GoRouter(
  initialLocation: '/join',
  routes: [
    GoRoute(path: '/join', builder: (_, __) => const JoinScreen()),
    GoRoute(path: '/device', builder: (_, __) => const DeviceCheckScreen()),
    GoRoute(path: '/lobby', builder: (_, __) => const LobbyScreen()),
    GoRoute(path: '/exam', builder: (_, __) => const ExamScreen()),
    GoRoute(path: '/locked', builder: (_, __) => const LockedScreen()),
    GoRoute(path: '/receipt', builder: (_, __) => const ReceiptScreen()),
  ],
  errorBuilder: (_, state) => Scaffold(
    body: Center(child: Text('Halaman tidak ditemukan: ${state.uri}')),
  ),
);
