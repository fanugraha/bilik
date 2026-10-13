import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router.dart';
import 'core/theme.dart';

class BilikApp extends ConsumerStatefulWidget {
  const BilikApp({super.key, this.awal = '/splash'});

  /// Rute awal. '/splash' akan memilih lanjut ke lobby atau join.
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
