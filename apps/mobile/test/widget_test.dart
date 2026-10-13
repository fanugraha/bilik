import 'package:bilik_mobile/features/join/join_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Layar join tampil', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: JoinScreen())));
    expect(find.text('Kode ujian'), findsOneWidget);
  });
}
