import 'package:bilik_mobile/models/jawaban.dart';
import 'package:bilik_mobile/services/session_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('deviceId dibuat sekali dan tetap sama', () async {
    final pertama = await SessionStore.deviceId();
    final kedua = await SessionStore.deviceId();
    expect(pertama, isNotEmpty);
    expect(kedua, pertama);
  });

  test('simpan dan baca sesi', () async {
    await SessionStore.saveSession(pesertaId: 'p1', tokenSesi: 'tok', kodeUjian: 'ABC123');
    final sesi = await SessionStore.getSession();
    expect(sesi['pesertaId'], 'p1');
    expect(sesi['tokenSesi'], 'tok');
    expect(sesi['kodeUjian'], 'ABC123');
  });

  test('clear mengosongkan sesi', () async {
    await SessionStore.saveSession(pesertaId: 'p1', tokenSesi: 'tok', kodeUjian: 'ABC123');
    await SessionStore.clear();
    final sesi = await SessionStore.getSession();
    expect(sesi['pesertaId'], isNull);
    expect(sesi['tokenSesi'], isNull);
  });

  test('cacheAnswer menyimpan jawaban per soal', () async {
    await SessionStore.cacheAnswer(const Jawaban(pesertaId: 'p1', soalId: 'q1', isi: 'A', raguRagu: true));
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString('bilik_answers_cache');
    expect(raw, isNotNull);
    expect(raw, contains('"q1"'));
  });
}
