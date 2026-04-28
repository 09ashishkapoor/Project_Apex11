import 'package:flutter/material.dart';

import '../services/sadhana_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/altar_widgets.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({
    super.key,
    required this.repository,
  });

  final SadhanaRepository repository;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.templeShadow,
              AppTheme.templeVoid,
            ],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 420;
              return SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 48,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 560),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 8),
                          Text(
                            'MANTRINI',
                            textAlign: TextAlign.center,
                            style: textTheme.headlineMedium?.copyWith(
                              fontSize: compact ? 23 : 30,
                              height: 1.15,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'A respectful, offline Japa companion.',
                            textAlign: TextAlign.center,
                            style: textTheme.bodyLarge?.copyWith(
                              fontSize: compact ? 15 : 16,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 24),
                          _HeroImageCard(
                              totalDeities: repository.deities.length),
                          const SizedBox(height: 20),
                          AltarPanel(
                            child: Text(
                              'Your data remains on the device unless you export it yourself.\n\nMay every japa bring you closer to Ma Adya Mahakali.',
                              textAlign: TextAlign.center,
                              style: textTheme.bodyMedium?.copyWith(
                                height: 1.45,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pushNamed(context, '/deities');
                            },
                            child: const Text('Begin Japa'),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton(
                            onPressed: () {
                              Navigator.pushNamed(context, '/tracker');
                            },
                            child: const Text('View Sadhana Tracker'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _HeroImageCard extends StatelessWidget {
  const _HeroImageCard({required this.totalDeities});

  final int totalDeities;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppTheme.antiqueGold.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.antiqueGold.withValues(alpha: 0.12),
            blurRadius: 24,
            spreadRadius: 1,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          alignment: Alignment.bottomCenter,
          children: [
            AspectRatio(
              aspectRatio: 4 / 5,
              child: Image.asset(
                'assets/images/maha1.jpg',
                fit: BoxFit.cover,
              ),
            ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Color(0xBE0D0506),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Text(
                '$totalDeities deities available for japa',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
