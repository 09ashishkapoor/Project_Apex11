import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  static const Color templeVoid = Color(0xFF0D0506);
  static const Color templeShadow = Color(0xFF1F0B11);
  static const Color cardBurgundy = Color(0xFF180A0F);
  static const Color templeMaroon = Color(0xFF8B2635);
  static const Color darkWine = Color(0xFF4A0E17);
  static const Color antiqueGold = Color(0xFFC9A962);
  static const Color softGold = Color(0xFFE8C468);
  static const Color candlelight = Color(0xFFF4E4C1);
  static const Color parchmentText = Color(0xFFF0DCC8);
  static const Color softWhite = Color(0xFFFFF8F0);

  static ThemeData get theme {
    final base = ThemeData.dark(useMaterial3: true);
    final colorScheme = const ColorScheme.dark(
      primary: softGold,
      onPrimary: templeVoid,
      secondary: antiqueGold,
      onSecondary: templeVoid,
      error: Color(0xFFE57373),
      onError: softWhite,
      surface: cardBurgundy,
      onSurface: parchmentText,
    ).copyWith(
      surfaceContainerHighest: templeShadow,
      outline: antiqueGold.withValues(alpha: 0.35),
      surfaceTint: antiqueGold,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: templeVoid,
      canvasColor: templeVoid,
      splashFactory: InkRipple.splashFactory,
      dividerColor: antiqueGold.withValues(alpha: 0.16),
      dialogTheme: DialogThemeData(
        backgroundColor: templeShadow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: antiqueGold.withValues(alpha: 0.32)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: softWhite,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      cardTheme: CardThemeData(
        color: cardBurgundy,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: antiqueGold.withValues(alpha: 0.18)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: templeShadow,
        labelStyle: const TextStyle(color: parchmentText),
        hintStyle: TextStyle(color: parchmentText.withValues(alpha: 0.7)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: antiqueGold.withValues(alpha: 0.22)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: antiqueGold.withValues(alpha: 0.22)),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(18)),
          borderSide: BorderSide(color: softGold, width: 1.2),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: softGold,
          foregroundColor: templeVoid,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: parchmentText,
          side: BorderSide(color: antiqueGold.withValues(alpha: 0.35)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: softGold,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: softGold,
        linearTrackColor: darkWine,
        circularTrackColor: darkWine,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: templeShadow,
        contentTextStyle: const TextStyle(color: parchmentText),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: antiqueGold.withValues(alpha: 0.25)),
        ),
      ),
      textTheme: base.textTheme
          .apply(
            bodyColor: parchmentText,
            displayColor: softWhite,
          )
          .copyWith(
            headlineMedium: const TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.w700,
              color: softWhite,
            ),
            headlineSmall: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: softWhite,
            ),
            titleLarge: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: softWhite,
            ),
            titleMedium: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: softWhite,
            ),
            bodyLarge: const TextStyle(fontSize: 16, color: parchmentText),
            bodyMedium: const TextStyle(fontSize: 14, color: parchmentText),
            labelLarge: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: templeVoid,
            ),
          ),
    );
  }
}
