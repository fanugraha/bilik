import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Token warna Bilik — cerminan `apps/dashboard/src/app/globals.css` (`@theme`).
/// Sumber kebenaran: docs/design-system.md.
class BilikWarna {
  static const kertas = Color(0xFFF4F5F7);
  static const permukaan = Color(0xFFFFFFFF);
  static const garis = Color(0xFFE2E5EA);
  static const garisTegas = Color(0xFFC9CED6);

  static const tinta = Color(0xFF1B2130);
  static const tinta2 = Color(0xFF566074);
  static const tinta3 = Color(0xFF8A93A3);

  static const nila = Color(0xFF4338CA);
  static const nilaTua = Color(0xFF3730A3);
  static const nilaMuda = Color(0xFFEEF0FE);
  static const papan = Color(0xFF1E1B4B);

  static const biru = Color(0xFF1D4ED8);
  static const biruMuda = Color(0xFFE8F0FE);
  static const hijau = Color(0xFF047857);
  static const hijauMuda = Color(0xFFE6F6EF);
  static const kuning = Color(0xFFA15C07);
  static const kuningMuda = Color(0xFFFDF3E1);
  static const merah = Color(0xFFB42318);
  static const merahMuda = Color(0xFFFDECEA);
  static const ungu = Color(0xFF6D28D9);
  static const unguMuda = Color(0xFFF2EDFD);
}

/// Tema Bilik untuk app siswa: tenang, profesional, sama bahasa visual dengan
/// dashboard guru. Font Plus Jakarta Sans (sama dengan web).
ThemeData buildBilikTheme() {
  final radius8 = BorderRadius.circular(8);
  final radius12 = BorderRadius.circular(12);

  final skema = ColorScheme.fromSeed(seedColor: BilikWarna.nila, brightness: Brightness.light).copyWith(
    primary: BilikWarna.nila,
    onPrimary: Colors.white,
    primaryContainer: BilikWarna.nilaMuda,
    onPrimaryContainer: BilikWarna.nilaTua,
    secondary: BilikWarna.papan,
    onSecondary: Colors.white,
    surface: BilikWarna.permukaan,
    onSurface: BilikWarna.tinta,
    onSurfaceVariant: BilikWarna.tinta2,
    surfaceContainerLow: BilikWarna.kertas,
    surfaceContainerHighest: BilikWarna.kertas,
    outline: BilikWarna.garisTegas,
    outlineVariant: BilikWarna.garis,
    error: BilikWarna.merah,
    onError: Colors.white,
    errorContainer: BilikWarna.merahMuda,
  );

  final teks = GoogleFonts.plusJakartaSansTextTheme().apply(
    bodyColor: BilikWarna.tinta,
    displayColor: BilikWarna.tinta,
  );

  OutlineInputBorder garisInput({Color warna = BilikWarna.garisTegas, double lebar = 1}) =>
      OutlineInputBorder(borderRadius: radius8, borderSide: BorderSide(color: warna, width: lebar));

  return ThemeData(
    useMaterial3: true,
    colorScheme: skema,
    scaffoldBackgroundColor: BilikWarna.kertas,
    textTheme: teks,
    fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
    appBarTheme: AppBarTheme(
      backgroundColor: BilikWarna.permukaan,
      foregroundColor: BilikWarna.tinta,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: teks.titleLarge?.copyWith(fontWeight: FontWeight.w700, fontSize: 18, color: BilikWarna.tinta),
      iconTheme: const IconThemeData(color: BilikWarna.tinta),
    ),
    cardTheme: CardThemeData(
      color: BilikWarna.permukaan,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: radius12, side: const BorderSide(color: BilikWarna.garis)),
    ),
    dividerTheme: const DividerThemeData(color: BilikWarna.garis, thickness: 1, space: 1),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: BilikWarna.nila,
        foregroundColor: Colors.white,
        disabledBackgroundColor: BilikWarna.garis,
        disabledForegroundColor: BilikWarna.tinta3,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: radius8),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: BilikWarna.tinta,
        side: const BorderSide(color: BilikWarna.garisTegas),
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: radius8),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: BilikWarna.nila,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: BilikWarna.permukaan,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: garisInput(),
      enabledBorder: garisInput(),
      focusedBorder: garisInput(warna: BilikWarna.nila, lebar: 1.5),
      disabledBorder: garisInput(warna: BilikWarna.garis),
      hintStyle: const TextStyle(color: BilikWarna.tinta3),
      labelStyle: const TextStyle(color: BilikWarna.tinta2),
    ),
    listTileTheme: const ListTileThemeData(iconColor: BilikWarna.tinta2),
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? BilikWarna.nila : BilikWarna.tinta3,
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: BilikWarna.papan,
      contentTextStyle: TextStyle(color: Colors.white),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: BilikWarna.nila),
  );
}
