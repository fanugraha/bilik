import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router.dart';
import 'core/theme.dart';

class BilikApp extends ConsumerStatefulWidget {
  const BilikApp({super.key, this.awal = '/join'});

  /// Rute awal. Diisi '/lobby' saat ada sesi tersimpan.
  final String awal;

  @override
  ConsumerState<BilikApp> createState() => _BilikAppState();
}

class _BilikAppState extends ConsumerState<BilikApp> {
  late final _router = buatRouter(widget.awal);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Bilik',
      theme: buildBilikTheme(),
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
