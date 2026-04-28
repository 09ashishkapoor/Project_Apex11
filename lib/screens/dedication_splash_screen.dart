import 'dart:async';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/altar_widgets.dart';

class DedicationSplashScreen extends StatefulWidget {
  const DedicationSplashScreen({super.key});

  @override
  State<DedicationSplashScreen> createState() => _DedicationSplashScreenState();
}

class _DedicationSplashScreenState extends State<DedicationSplashScreen> {
  static const _duration = Duration(milliseconds: 2800);

  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(_duration, _goToWelcome);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _goToWelcome() {
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.templeVoid,
              AppTheme.templeShadow,
              AppTheme.templeVoid,
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: AltarPanel(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.antiqueGold.withValues(alpha: 0.45),
                          ),
                          image: const DecorationImage(
                            image: AssetImage('assets/images/maha1.jpg'),
                            fit: BoxFit.cover,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.softGold.withValues(alpha: 0.18),
                              blurRadius: 22,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),
                      Text(
                        'Dedicated to',
                        textAlign: TextAlign.center,
                        style: textTheme.labelLarge?.copyWith(
                          color: AppTheme.parchmentText.withValues(alpha: 0.76),
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'GuruShreshta Maa Adya Mahakali',
                        textAlign: TextAlign.center,
                        style: textTheme.titleLarge?.copyWith(
                          height: 1.18,
                          color: AppTheme.softGold,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'and',
                        textAlign: TextAlign.center,
                        style: textTheme.bodyMedium?.copyWith(
                          color: AppTheme.parchmentText.withValues(alpha: 0.72),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'My Guru Shri Praveen RadhaKrishnan',
                        textAlign: TextAlign.center,
                        style: textTheme.titleMedium?.copyWith(
                          height: 1.22,
                          color: AppTheme.parchmentText,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
