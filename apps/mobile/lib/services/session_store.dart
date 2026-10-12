import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/jawaban.dart';

/// Simpan sesi pengerjaan di local storage agar tahan crash/restart (PRD 9).
class SessionStore {
  static const _keyPesertaId = 'bilik_peserta_id';
  static const _keyTokenSesi = 'bilik_token_sesi';
  static const _keyKodeUjian = 'bilik_kode_ujian';
  static const _keyAnswers = 'bilik_answers_cache';

  static Future<void> saveSession({
    required String pesertaId,
    required String tokenSesi,
    required String kodeUjian,
  }) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_keyPesertaId, pesertaId);
    await sp.setString(_keyTokenSesi, tokenSesi);
    await sp.setString(_keyKodeUjian, kodeUjian);
  }

  static Future<Map<String, String?>> getSession() async {
    final sp = await SharedPreferences.getInstance();
    return {
      'pesertaId': sp.getString(_keyPesertaId),
      'tokenSesi': sp.getString(_keyTokenSesi),
      'kodeUjian': sp.getString(_keyKodeUjian),
    };
  }

  static Future<void> cacheAnswer(Jawaban j) async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_keyAnswers);
    final map = raw != null ? (jsonDecode(raw) as Map<String, dynamic>) : <String, dynamic>{};
    map[j.soalId] = j.toUpsert();
    await sp.setString(_keyAnswers, jsonEncode(map));
  }

  static Future<void> clear() async {
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_keyPesertaId);
    await sp.remove(_keyTokenSesi);
    await sp.remove(_keyKodeUjian);
    await sp.remove(_keyAnswers);
  }
}
