import 'package:flutter/material.dart';

import '../models/deity.dart';
import '../theme/app_theme.dart';

class AltarPanel extends StatelessWidget {
  const AltarPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: AppTheme.cardBurgundy,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.antiqueGold.withValues(alpha: 0.22)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.28),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}

class FramedDeityImage extends StatelessWidget {
  const FramedDeityImage({
    super.key,
    required this.deity,
    this.width,
    this.aspectRatio = 3 / 4,
    this.fit = BoxFit.cover,
  });

  final Deity deity;
  final double? width;
  final double aspectRatio;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final image = AspectRatio(
      aspectRatio: aspectRatio,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(7),
        child: Image.asset(deity.imageAsset, fit: fit),
      ),
    );

    return Container(
      width: width,
      padding: const EdgeInsets.all(7),
      decoration: BoxDecoration(
        color: AppTheme.templeVoid,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.antiqueGold.withValues(alpha: 0.46)),
      ),
      child: image,
    );
  }
}

class SessionMetric extends StatelessWidget {
  const SessionMetric({
    super.key,
    required this.label,
    required this.value,
    this.alignment = CrossAxisAlignment.start,
  });

  final String label;
  final String value;
  final CrossAxisAlignment alignment;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AltarPanel(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      child: Column(
        crossAxisAlignment: alignment,
        children: [
          Text(
            value,
            style: textTheme.metric.copyWith(fontSize: 26),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 5),
          Text(
            label,
            style: textTheme.bodySmall?.copyWith(
              color: AppTheme.parchmentText.withValues(alpha: 0.74),
            ),
          ),
        ],
      ),
    );
  }
}
