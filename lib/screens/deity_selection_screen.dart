import 'package:flutter/material.dart';

import '../models/deity.dart';
import '../services/sadhana_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/altar_widgets.dart';

class DeitySelectionScreen extends StatelessWidget {
  const DeitySelectionScreen({
    super.key,
    required this.repository,
  });

  final SadhanaRepository repository;

  @override
  Widget build(BuildContext context) {
    final deities = repository.deities;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose Deity'),
        actions: [
          IconButton(
            onPressed: () => Navigator.pushNamed(context, '/tracker'),
            icon: const Icon(Icons.insights_outlined),
            tooltip: 'Open tracker',
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final bottomInset = MediaQuery.of(context).padding.bottom;
          final crossAxisCount = width >= 900
              ? 3
              : width >= 580
                  ? 2
                  : 1;

          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
                  child: Text(
                    'Select the altar for this session',
                    style: Theme.of(context).textTheme.sectionTitle,
                  ),
                ),
              ),
              SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, bottomInset + 24),
                sliver: SliverGrid.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: width < 420 ? 0.78 : 0.86,
                  ),
                  itemCount: deities.length,
                  itemBuilder: (context, index) {
                    final deity = deities[index];
                    return _DeityCard(
                      deity: deity,
                      onTap: () {
                        Navigator.pushNamed(
                          context,
                          '/session',
                          arguments: SessionScreenArgs(
                            deity: deity,
                            repository: repository,
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class SessionScreenArgs {
  const SessionScreenArgs({
    required this.deity,
    required this.repository,
  });

  final Deity deity;
  final SadhanaRepository repository;
}

class _DeityCard extends StatelessWidget {
  const _DeityCard({
    required this.deity,
    required this.onTap,
  });

  final Deity deity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AltarPanel(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Padding(
              padding: const EdgeInsets.all(7),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(7),
                child: Image.asset(
                  deity.imageAsset,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x300D0506),
                    Color(0xD00D0506),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Text(
                          deity.displayName,
                          style: textTheme.titleLarge,
                        ),
                      ),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        color: AppTheme.softGold,
                        size: 20,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    deity.mantraText,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.mantra.copyWith(fontSize: 17),
                  ),
                  if (deity.invocation != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      deity.invocation!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppTheme.parchmentText.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
