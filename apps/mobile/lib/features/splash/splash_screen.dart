import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../components/latar.dart';
import '../../core/theme.dart';
import '../../services/session_store.dart';

/// Splash dalam app: merek + memilih lanjut ke lobby (ada sesi) atau join.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _lanjut();
  }

  Future<void> _lanjut() async {
    await Future.delayed(const Duration(milliseconds: 1400));
    final sesi = await SessionStore.getSession();
    final token = sesi['tokenSesi'];
    if (!mounted) return;
    context.go((token != null && token.isNotEmpty) ? '/lobby' : '/join');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LatarPenuh(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 96,
                height: 96,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(26)),
                child: const Text('B', style: TextStyle(fontSize: 46, fontWeight: FontWeight.w800, color: BilikWarna.nila)),
              ),
              const SizedBox(height: 22),
              const Text('Bilik', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
              const SizedBox(height: 6),
              Text('Ujian aman untuk kelas', style: TextStyle(color: Colors.white.withValues(alpha: 0.82), fontSize: 14)),
              const SizedBox(height: 40),
              const SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
